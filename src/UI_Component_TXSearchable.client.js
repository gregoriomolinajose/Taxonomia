/**
 * UI_Component_TXSearchable.client.js
 * 
 * E41: Unified Searchable Web Component (Single & Multi Selection)
 * Componente nativo encapsulado (Vanilla Custom Elements) para selecciones híbridas.
 * Abstrae dependencias del FormRenderer_UI asegurando compatibilidad cruzada PWA/Capacitor.
 */

class TXSearchable extends HTMLElement {
    constructor() {
        super();
        
        // Estado Interno del Componente PWA
        this._dataSource = [];
        this._selectedState = null; // String (Single) o Set (Multi)
        this._isMultiple = false;
        this._isDisabled = false;
        this._entityName = 'Registro';
        this._rafId = null; // Puntero para cancelar animaciones colgantes (GC)
        
        // Atar handlers al contexto local para limpieza segura (Garbage Collection).
        this._boundRender = this._render.bind(this);
    }

    // ===============================================
    // 0. Environment & Utilities
    // ===============================================
    isMobile() {
        return typeof window !== 'undefined' && window.innerWidth <= 768;
    }

    _extractPayloadTitle(item) {
        if (!item) return '';
        const idCampo = this.getAttribute('value-field') || 'id';
        const labelCampo = this.getAttribute('label-field') || 'nombre';
        return item[labelCampo] ?? item[idCampo] ?? item.id ?? '';
    }

    _extractPayloadId(item) {
        if (!item) return null;
        const idCampo = this.getAttribute('value-field') || 'id';
        return item[idCampo] ?? item.id;
    }

    _formatDisplayString(item, rawId) {
        if (!item) return String(rawId);
        return this._extractPayloadTitle(item);
    }

    // ===============================================
    // 1. API Contract / Declarative Attributes
    // ===============================================
    static get observedAttributes() {
        return ['entity-name', 'multiple', 'pre-selected', 'disabled', 'max-selection'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch(name) {
            case 'max-selection':
                this._maxSelection = newValue ? parseInt(newValue, 10) : null;
                break;
            case 'entity-name':
                this._entityName = newValue || 'Registro';
                break;
            case 'multiple':
                this._isMultiple = (newValue === 'true' || newValue === '');
                // Normalizar Estado Interno preservando hidrataciones tempranas (Fix HTML Parser Race Condition)
                if (this._isMultiple && !(this._selectedState instanceof Set)) {
                    // Migra el estado precoz Single hacia Múltiple
                    this._selectedState = new Set(this._selectedState ? [this._selectedState] : []);
                } else if (!this._isMultiple && (this._selectedState instanceof Set)) {
                    // Migra el estado precoz Múltiple hacia Single
                    const arr = Array.from(this._selectedState);
                    this._selectedState = arr.length > 0 ? arr[0] : null;
                }
                break;
            case 'pre-selected':
                try {
                    const parsed = JSON.parse(newValue);
                    const resolvePrimitive = (val) => typeof val === 'object' && val !== null ? String(val.id_registro || val.id || '') : String(val);
                    
                    if (this._isMultiple) {
                        this._selectedState = new Set(Array.isArray(parsed) ? parsed.map(c => resolvePrimitive(c)) : []);
                    } else {
                        // SCD-2 Hydration check fallback seguro
                        this._selectedState = Array.isArray(parsed) && parsed.length > 0 
                            ? resolvePrimitive(parsed[0])
                            : resolvePrimitive(parsed);
                    }
                } catch(e) {
                    console.warn(`[TXSearchable] pre-selected parsing error: ${e.message}`);
                }
                break;
            case 'disabled':
                this._isDisabled = (newValue === 'true' || newValue === '');
                break;
        }

        // Emitir un render scheduling seguro asíncrono
        this._scheduleRender();
    }

    // ===============================================
    // 2. JS Live Properties (Inversion Of Control)
    // ===============================================
    get dataSource() {
        return this._dataSource;
    }

    set dataSource(dataArr) {
        this._dataSource = Array.isArray(dataArr) ? dataArr : [];
        this._scheduleRender();
        // S41.7 Re-render live overlay list if open when external data hydrates asynchronously
        if (this._overlayNode || this._inlineMode) {
            this.buildListItems(this._searchTerm || '');
        }
    }

    /**
     * Bridge compatible con API de Recolección (Epic E35/FormSubmitter.js)
     * Utilizado externamente vía nodo.getValidatedValue()
     */
    getValidatedValue() {
        if (this._isMultiple) {
            return Array.from(this._selectedState || new Set());
        }
        return this._selectedState || null;
    }

    get value() {
        return this.getValidatedValue();
    }

    // ===============================================
    // 3. Lifecycle Hooks (Garbage Collection Limits)
    // ===============================================
    _bindTriggerEvents() {
        const triggers = this.querySelectorAll('.trigger-container');
        const inputNode = this.querySelector('.tx-search-input');
        
        // S41.7 Lógica Manual de Limpieza para Mobile (Ionic oculta el clear-input cuando es readonly)
        const mobClearBtn = this.querySelector(`#${this._componentId}-mobile-clear`);
        if (mobClearBtn && !this._triggerBound) {
            mobClearBtn.addEventListener('click', (ev) => {
                ev.stopPropagation(); // No abrir modal de búsqueda
                if (this._isDisabled || this._isMultiple) return;
                
                if (this._selectedState !== null) {
                    this._selectedState = null;
                    this.dispatchSelection();
                    this._scheduleRender();
                }
            });
        }
        
        if (triggers.length > 0 && !this._triggerBound) {
            triggers.forEach(trigger => {
                trigger.addEventListener('click', () => {
                    if (this._isDisabled) return;
                    if (this._temporaryBlurFlag) return;
                    this.executeSearchAndOpen();
                });
            });
            
            // S35.4 Typeahead (Desktop)
            if (inputNode) {
                // S41.7 Block native bubbling of ionChange so parent ONLY reacts to our explicit txChange
                inputNode.addEventListener('ionChange', (ev) => ev.stopPropagation());
                
                inputNode.addEventListener('ionInput', (ev) => {
                    const rawVal = ev.detail.value || '';
                    
                    // S41.7 Permite borrar y dejar vacío el campo manualmente (Desktop Typeahead o Mobile X button)
                    if (rawVal.trim() === '' && !this._isMultiple) {
                        if (this._selectedState !== null) {
                            this._selectedState = null;
                            this.dispatchSelection(); // Avisar a formulario (FormRenderer)
                            this._scheduleRender();
                        }
                        return;
                    }

                    if (this.isMobile()) return; // Ignorar tipiado en mobile, solo permitimos borrar

                    this._searchTerm = rawVal.toLowerCase();
                    
                    if (!this._overlayNode) {
                        this.executeSearchAndOpen();
                    } else {
                        // Re-render en vivo si ya está abierto
                        this.buildListItems(this._searchTerm); 
                    }
                });
                
                // S41.7 RESTAURATION: Blur Race Condition Guard
                inputNode.addEventListener('ionBlur', () => {
                    if (this.isMobile()) return;
                    
                    setTimeout(() => {
                        if (!this._temporaryBlurFlag && this._overlayNode) {
                            this._cleanupOverlay();
                            // S35.4 strictBlurValidation equivalent:
                            this._scheduleRender(); 
                        }
                    }, 180); // Retraso prudente para que list.onclick gane la carrera en desktop
                });
            }

            this._triggerBound = true;
        }
    }

    connectedCallback() {
        if (!this._componentId) {
            this._componentId = 'tx-searchable-' + Math.random().toString(36).substr(2, 9);
        }

        const iconName = this.getAttribute('icon-name') || 'folder-outline';
        const iconColor = this.getAttribute('icon-color') || 'step-200';
        
        const readOnlyAttr = this.isMobile() ? 'readonly="true"' : '';
        const searchIconStyle = 'display: flex;'; // Start visible universally

        if (!this.innerHTML.trim()) {
            if (this._isMultiple) {
                this.innerHTML = `
                    <div class="tx-searchable-root" style="width: 100%; position: relative;">
                        <!-- ESTADO PLACEHOLDER (MULTISELECT) -->
                        ${this._getPlaceholderTemplate(`${this._componentId}-placeholder`, true, iconName)}

                        <!-- ESTADO LLENO HEADER (MULTISELECT) -->
                        <div id="${this._componentId}-filled-header" style="display: none; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: var(--ion-color-dark); font-size: 14px; margin-left: 4px;">${this._entityName}</strong>
                            <ion-button class="trigger-container" size="small" fill="clear" style="margin: 0; --color: var(--ion-color-primary, #3880ff); font-weight: bold; font-family: var(--sys-font-family, inherit);">
                                + AGREGAR
                            </ion-button>
                        </div>
                        
                        <!-- ESTADO INLINE CHECKLIST (ABIERTO) S41.10 -->
                        <div id="${this._componentId}-inline-list-container" style="display: none; flex-direction: column; margin-bottom: 12px; border: 1px solid var(--color-border, #cccccc); border-radius: 8px; overflow: hidden; background: var(--ion-background-color, #ffffff);">
                            <!-- HEADER / CLOSER -->
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--color-border, #e0e0e0); background: var(--ion-color-secondary, #f8f9fa);">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <strong style="color: var(--ion-color-dark); font-size: 14px;">${this._entityName}</strong>
                                    <span id="${this._componentId}-inline-counter" style="font-size: 11px; background: var(--color-border, #e0e0e0); padding: 2px 8px; border-radius: 12px; color: var(--ion-color-dark);"></span>
                                </div>
                                <ion-button id="${this._componentId}-inline-close" size="small" fill="clear" color="medium" style="margin: 0; font-family: var(--sys-font-family, inherit); font-weight: bold;">
                                    <ion-icon slot="start" name="close-circle"></ion-icon> Cerrar
                                </ion-button>
                            </div>
                            <!-- SEARCHBAR -->
                            <div style="border-bottom: 1px solid var(--color-border, #e0e0e0);">
                                <ion-searchbar id="${this._componentId}-inline-searchbar" placeholder="Buscar por nombre o ID..." mode="md" style="padding: 4px 8px; --box-shadow: none;"></ion-searchbar>
                            </div>
                            <!-- LIST SPINNER -->
                            <div style="text-align:center; padding: 15px;" id="${this._componentId}-inline-spinner">
                                <ion-spinner></ion-spinner>
                            </div>
                            <!-- LIST -->
                            <ion-list id="${this._componentId}-inline-list" style="padding-top: 0; margin-bottom: 0; max-height: 280px; overflow-y: auto;"></ion-list>
                            <!-- ACTION CREAR -->
                            <div style="border-top: 1px solid var(--color-border, #e0e0e0);">
                                <ion-item id="${this._componentId}-btn-create-inline" button lines="none" detail="false" style="--background: transparent; margin: 0;">
                                    <ion-icon slot="start" name="add-outline" style="color: var(--ion-color-primary, #3880ff);"></ion-icon>
                                    <ion-label style="color: var(--ion-color-primary, #3880ff); font-weight: 600;">Crear ${this._entityName}</ion-label>
                                </ion-item>
                            </div>
                        </div>

                        <!-- CARDS SIEMPRE VISIBLES DEBAJO -->
                        <div class="tx-multi-cards-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;"></div>
                    </div>
                `;
            } else {
                this.innerHTML = `
                    <div class="tx-searchable-root" style="width: 100%; position: relative;">
                        <!-- ESTADO PLACEHOLDER (SINGLE SELECT) -->
                        ${this._getPlaceholderTemplate(`${this._componentId}-single-ph`, false, iconName)}

                        <!-- ESTADO LLENO HEADER (SINGLE SELECT) -->
                        <div id="${this._componentId}-single-filled-header" style="display: none; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: var(--ion-color-dark); font-size: 14px; margin-left: 4px;">${this._entityName}</strong>
                            <ion-button class="trigger-container" size="small" fill="clear" style="margin: 0; --color: var(--ion-color-primary, #3880ff); font-weight: bold; font-family: var(--sys-font-family, inherit);">
                                CAMBIAR
                            </ion-button>
                        </div>
                        
                        <!-- ESTADO LLENO CARD (SINGLE SELECT) -->
                        <div id="${this._componentId}-single-filled" style="display: none; width: 100%; margin-bottom: 24px;">
                            ${this._getSharedCardTemplate({
                                textId: `${this._componentId}-single-text`,
                                subId: `${this._componentId}-single-sub`,
                                btnId: `${this._componentId}-mobile-clear`,
                                iconName,
                                iconColor
                            })}
                        </div>
                    </div>
                `;
            }
        }
        this._scheduleRender();
        setTimeout(() => this._bindTriggerEvents(), 100);
    }

    _cleanupOverlay() {
        if (this._overlayNode) {
            this._overlayNode.remove();
            this._overlayNode = null;
        }
        // Restaurar estado de Click Anti-Carrera PWA
        this._temporaryBlurFlag = true;
        setTimeout(() => this._temporaryBlurFlag = false, 350);
    }

    disconnectedCallback() {
        // Detener renders fantasma pendientes (Evita Memory Leak de Detached DOM tree)
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }

        // [GC] Destrucciones críticas para PWA
        this._dataSource = []; 
        if (this._selectedState instanceof Set) {
            this._selectedState.clear();
        }
        this._selectedState = null;
        
        // Destitución de modales anclados en root
        this._cleanupOverlay();
    }

    // ===============================================
    // 4. Communication Interface
    // ===============================================
    dispatchSelection() {
        const payload = this.getValidatedValue();
        const ev = new CustomEvent('txChange', {
            detail: {
                value: payload,
                entity: this._entityName,
                isMultiple: this._isMultiple
            },
            bubbles: true,
            composed: true // Atraviesa arquitecturas de Shadow DOM superiores si fuésemos encapsulados
        });
        this.dispatchEvent(ev);
    }

    // ===============================================
    // 5. Internal Rendering Base
    // ===============================================
    _scheduleRender() {
        if (!this.isConnected) return;
        if (this._rafId) cancelAnimationFrame(this._rafId);
        this._rafId = requestAnimationFrame(this._boundRender);
    }

    _getDisplayValue() {
        if (!this._selectedState) return '';
        
        // Multi Mode
        if (this._isMultiple) {
            if (this._selectedState.size === 0) return '';
            if (this._selectedState.size === 1) {
                const singleId = Array.from(this._selectedState)[0];
                const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(singleId));
                return this._formatDisplayString(found, singleId);
            }
            return `${this._selectedState.size} ítem(s) seleccionado(s)`;
        }
        
        // Single Mode
        const rawId = this._selectedState;
        const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(rawId));
        return this._formatDisplayString(found, rawId);
    }

    // ===============================================
    // 6. Overlay Sub-Engine (Popovers / Modals)
    // ===============================================
    
    // H9: Overlay Context Strategy Pattern
    executeSearchAndOpen() {
        if (this._isMultiple && !this.isMobile()) {
            if (!this._inlineMode) {
                this._inlineMode = true;
                this._scheduleRender();
                this._bindInlineInternalEvents();
                this.buildListItems(this._searchTerm || '');
            }
            return;
        }

        if (this._overlayNode) return; // Prevent double-tap spawning
        this.isMobile() ? this._openMobileModal() : this._openDesktopDropdown();
    }
    
    _bindInlineInternalEvents() {
        if (this._inlineBound) return;
        
        const closeBtn = this.querySelector(`#${this._componentId}-inline-close`);
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this._inlineMode = false;
                this._searchTerm = ''; 
                this._temporaryBlurFlag = false; // Prevents UI lock if closed manually while stuck
                
                const searchbar = this.querySelector(`#${this._componentId}-inline-searchbar`);
                if (searchbar) searchbar.value = '';
                
                this._scheduleRender();
                this.dispatchSelection(); 
            });
        }

        const searchbar = this.querySelector(`#${this._componentId}-inline-searchbar`);
        if (searchbar) {
            searchbar.addEventListener('ionInput', (e) => {
                const query = (e.target.value || '').toLowerCase();
                this._searchTerm = query;
                this.buildListItems(query);
            });
        }
        
        const createInlineBtn = this.querySelector(`#${this._componentId}-btn-create-inline`);
        if (createInlineBtn) {
            createInlineBtn.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                this._handleCreateAction();
            });
        }
        
        this._inlineBound = true;
    }
    
    _handleCreateAction() {
        // [S41.14] Emit topological intent
        const targetEntity = this.getAttribute('target-entity') || '';
        if (!targetEntity) {
            console.warn('[TXSearchable] No se puede invocar creación: Atributo "target-entity" inexistente en el componente.');
            return;
        }

        if (this._overlayNode) {
            if (typeof this._overlayNode.dismiss === 'function') this._overlayNode.dismiss();
            else this._cleanupOverlay();
        }
        
        if (this._inlineMode) {
            this._inlineMode = false;
            this._scheduleRender();
        }

        this.dispatchEvent(new CustomEvent('txSearchableCreate', {
            detail: { targetEntity: targetEntity },
            bubbles: true,
            composed: true // Permitir cruzar Boundary del Shadow DOM / Custom Elements
        }));
    }
    
    _getSharedOverlayHtml(isMob) {
        return `
            <ion-header class="ion-no-border" style="border-top-left-radius: var(--border-radius, 16px); border-top-right-radius: var(--border-radius, 16px); overflow: hidden;">
                ${isMob ? `
                <ion-toolbar color="primary">
                    <ion-title style="color: var(--ion-color-primary-contrast, #ffffff); font-weight: 600;">Buscar ${this._entityName}</ion-title>
                    <ion-buttons slot="end">
                        <ion-button id="${this._componentId}-btn-create-mob" style="font-weight: 600;">
                            <ion-icon slot="start" name="add-outline"></ion-icon> CREAR
                        </ion-button>
                        <ion-button id="${this._componentId}-btn-close">
                            <ion-icon slot="icon-only" name="close" style="color: var(--ion-color-primary-contrast, #ffffff); font-size: 24px;"></ion-icon>
                        </ion-button>
                    </ion-buttons>
                </ion-toolbar>
                <ion-toolbar color="primary">
                    <ion-searchbar id="${this._componentId}-searchbar" placeholder="Escribe para buscar..."></ion-searchbar>
                </ion-toolbar>
                ` : ''}
                ${this._isMultiple ? `
                <ion-toolbar>
                    <ion-button expand="block" id="${this._componentId}-btn-apply">Listo</ion-button>
                </ion-toolbar>
                ` : ''}
            </ion-header>
            <ion-content style="--background: var(--ion-background-color, #ffffff);">
                <div style="text-align:center; padding: 15px;" id="${this._componentId}-spinner">
                    <ion-spinner></ion-spinner>
                </div>
                <ion-list id="${this._componentId}-list"></ion-list>
                
                ${!isMob ? `
                <div style="border-top: 1px solid var(--color-border, #e0e0e0);">
                    <ion-item id="${this._componentId}-btn-create-desk" button lines="none" detail="false" style="--background: transparent; margin: 0;">
                        <ion-icon slot="start" name="add-outline" style="color: var(--ion-color-primary, #3880ff);"></ion-icon>
                        <ion-label style="color: var(--ion-color-primary, #3880ff); font-weight: 600;">Crear ${this._entityName}</ion-label>
                    </ion-item>
                </div>
                ` : ''}
            </ion-content>
        `;
    }

    // S41.13: Refactorización Estructural (DRY UI Factories)
    _getPlaceholderTemplate(domId, hidden, iconName) {
        return `
            <div id="${domId}" class="trigger-container" style="background: var(--ion-color-secondary, #f4f5f8); border-radius: 8px; border: 1px solid var(--color-border, #e0e0e0); margin-bottom: 24px; cursor: pointer; transition: all 0.2s ease; ${hidden ? 'display: none;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
                    <strong style="color: var(--ion-color-dark); font-size: 14px;">${this._entityName}</strong>
                    <ion-button size="small" fill="clear" style="margin: 0; --color: var(--ion-color-primary, #3880ff); font-weight: bold; font-family: var(--sys-font-family, inherit);">
                        + AGREGAR
                    </ion-button>
                </div>
                <div style="text-align: center; padding: 20px 10px 30px;">
                    <ion-icon name="${iconName}" color="medium" style="font-size: 32px; opacity: 0.5;"></ion-icon>
                    <p style="color: var(--ion-color-medium); font-size: 13px; margin-top: 8px; margin-bottom: 0;">Sin registros vinculados</p>
                </div>
            </div>
        `;
    }

    _getSharedCardTemplate(config) {
        const { textId = '', subId = '', btnId = '', iconName, iconColor, title = '', subtitle = '' } = config;
        return `
            <ion-item lines="none" style="--min-height: 56px; --padding-top: 4px; --padding-bottom: 4px; --border-radius: var(--border-radius, 8px); border-radius: var(--border-radius, 8px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); width: 100%; border: 1px solid var(--color-border, #e0e0e0);">
                <div slot="start" style="width: 32px; height: 32px; background: var(--ion-color-${iconColor}, var(--ion-color-primary)); border-radius: 4px; display: inline-flex; justify-content: center; align-items: center; margin-right: 12px;">
                    <ion-icon name="${iconName}" style="color: var(--ion-color-light, white); font-size: 18px;"></ion-icon>
                </div>
                <ion-label class="ion-text-wrap" style="flex: 1; margin: 0; padding-right: 8px;">
                    <h3 ${textId ? `id="${textId}"` : ''} style="font-size: 13px; font-weight: bold; margin: 0; padding: 0; line-height: 1.2;">${title}</h3>
                    <p ${subId ? `id="${subId}"` : ''} style="font-size: 11px; color: var(--ion-color-medium, #92949c); margin: 0; padding: 0; line-height: 1.2;">${subtitle}</p>
                </ion-label>
                <ion-button ${btnId ? `id="${btnId}"` : ''} slot="end" fill="clear" color="medium" size="small" style="margin: 0;">
                    <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                </ion-button>
            </ion-item>
        `;
    }

    _openMobileModal() {
        const modal = document.createElement('ion-modal');
        modal.style.setProperty('--background', 'transparent');
        modal.style.setProperty('--border-radius', 'var(--border-radius, 16px) var(--border-radius, 16px) 0 0');
        modal.initialBreakpoint = 0.5;
        modal.breakpoints = [0, 0.5, 0.85, 1];
        modal.innerHTML = this._getSharedOverlayHtml(true);
        document.body.appendChild(modal);
        this._overlayNode = modal;
        
        this._overlayNode.addEventListener('ionModalDidDismiss', () => this._cleanupOverlay());
        this._overlayNode.present().then(() => {
            if (!this._overlayNode) return; 
            this._bindOverlayInternalEvents();
            this.buildListItems(this._searchTerm || ''); 
            const searchbar = this._overlayNode.querySelector('ion-searchbar');
            if (searchbar) {
                setTimeout(() => searchbar.setFocus(), 150);
            }
        }).catch(err => {
            console.warn('[TXSearchable] Modal intent aborted before render', err);
        });
    }

    _openDesktopDropdown() {
        const popoverNode = document.createElement('div');
        popoverNode.className = 'tx-desktop-dropdown';
        popoverNode.style.position = 'absolute';
        popoverNode.style.zIndex = '999999';
        popoverNode.style.background = 'var(--ion-background-color, #fff)';
        popoverNode.style.borderRadius = 'var(--border-radius, 8px)';
        popoverNode.style.border = '1px solid var(--sidebar-border, #ccc)';
        popoverNode.style.boxShadow = 'var(--shadow-floating, 0 4px 16px rgba(0,0,0,0.12))';
        popoverNode.style.maxHeight = '350px';
        popoverNode.style.overflowY = 'auto'; // scroll local
        popoverNode.style.display = 'flex';
        popoverNode.style.flexDirection = 'column';
        
        // S41.7: H9 Refactor - Extraer el contenido interior estricto para Desktop list
        const desktopHtml = `
            <div style="padding: 0px 8px; border-bottom: 1px solid var(--ion-color-step-100, #e0e0e0); background: var(--ion-color-step-50, #f4f5f8); border-radius: 8px 8px 0 0;">
                <ion-searchbar id="${this._componentId}-searchbar" placeholder="Buscar..." mode="md" style="padding: 4px 0 0 0; --box-shadow: none; --background: transparent;"></ion-searchbar>
            </div>
            ${this._isMultiple ? `
            <div style="padding: 8px 8px 0 8px;">
                <ion-button expand="block" fill="clear" id="${this._componentId}-btn-apply" style="margin: 0;">Listo</ion-button>
            </div>
            ` : ''}
            <div style="text-align:center; padding: 15px;" id="${this._componentId}-spinner">
                <ion-spinner></ion-spinner>
            </div>
            <ion-list id="${this._componentId}-list" style="padding-top: 0;"></ion-list>
            <div style="border-top: 1px solid var(--color-border, #e0e0e0);">
                <ion-item id="${this._componentId}-btn-create-desk" button lines="none" detail="false" style="--background: transparent; margin: 0;">
                    <ion-icon slot="start" name="add-outline" style="color: var(--ion-color-primary, #3880ff);"></ion-icon>
                    <ion-label style="color: var(--ion-color-primary, #3880ff); font-weight: 600;">Crear ${this._entityName}</ion-label>
                </ion-item>
            </div>
        `;
        popoverNode.innerHTML = desktopHtml;

        const anchorNode = this.querySelector('ion-input.tx-search-input') || this.querySelector('.tx-searchable-root') || this;
        const boxRect = anchorNode.getBoundingClientRect();
        // Anclar directo al padre rect
        popoverNode.style.width = `${boxRect.width}px`;
        popoverNode.style.top = `${boxRect.bottom + 4 + window.scrollY}px`;
        popoverNode.style.left = `${boxRect.left + window.scrollX}px`;
        
        // Bridge para eventos internos que llaman dismiss()
        popoverNode.dismiss = () => this._cleanupOverlay();

        document.body.appendChild(popoverNode);
        this._overlayNode = popoverNode;

        // En un DIV es síncrono, no hay `.present().then()`
        this._bindOverlayInternalEvents();
        this.buildListItems(this._searchTerm || ''); 
        
        const searchbar = popoverNode.querySelector('ion-searchbar');
        if (searchbar) {
            this._temporaryBlurFlag = true; // Proteger de la posible pérdida inmediata de foco del input padre
            setTimeout(() => { 
                searchbar.setFocus(); 
                setTimeout(() => this._temporaryBlurFlag = false, 350); 
            }, 100);
        } else if (!this._isMultiple && anchorNode.tagName === 'ION-INPUT') {
            setTimeout(() => anchorNode.setFocus(), 50);
        }
    }

    _bindOverlayInternalEvents() {
        const closeBtn = this._overlayNode.querySelector(`#${this._componentId}-btn-close`);
        if (closeBtn) closeBtn.addEventListener('click', () => { 
            if (typeof this._overlayNode.dismiss === 'function') this._overlayNode.dismiss(); 
            else this._cleanupOverlay(); 
        });

        // S41.14 Bind Create Headers
        const createMobBtn = this._overlayNode.querySelector(`#${this._componentId}-btn-create-mob`);
        if (createMobBtn) createMobBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this._handleCreateAction(); });

        const createDeskBtn = this._overlayNode.querySelector(`#${this._componentId}-btn-create-desk`);
        if (createDeskBtn) createDeskBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); this._handleCreateAction(); });

        const applyBtn = this._overlayNode.querySelector(`#${this._componentId}-btn-apply`);
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                if (typeof this._overlayNode.dismiss === 'function') {
                    this._overlayNode.dismiss();
                } else {
                    this._cleanupOverlay();
                }
            });
        }

        const searchbar = this._overlayNode.querySelector('ion-searchbar');
        if (searchbar) {
            searchbar.addEventListener('ionInput', (e) => {
                const query = (e.target.value || '').toLowerCase();
                this._searchTerm = query; // S41.7 Keep track for async hydration
                this.buildListItems(query);
            });
            
            searchbar.addEventListener('ionBlur', () => {
                if (this.isMobile()) return; // S41.12: Evitar destrucción en móvil; ion-modal maneja su click exterior.
                
                setTimeout(() => {
                    if (!this._temporaryBlurFlag && this._overlayNode) {
                        this._cleanupOverlay();
                        this._scheduleRender();
                    }
                }, 180);
            });
        }
    }

    buildListItems(query = '') {
        const listNode = (this._isMultiple && this._inlineMode) 
            ? this.querySelector(`#${this._componentId}-inline-list`)
            : (this._overlayNode ? this._overlayNode.querySelector(`#${this._componentId}-list`) : null);
            
        const spinner = (this._isMultiple && this._inlineMode)
            ? this.querySelector(`#${this._componentId}-inline-spinner`)
            : (this._overlayNode ? this._overlayNode.querySelector(`#${this._componentId}-spinner`) : null);
            
        if (!listNode) return;

        if (spinner) spinner.style.display = 'none';

        // RAM-Secure Local Filter (YAGNI Endless Scroll)
        let filtered = this._dataSource || [];
        if (query.trim()) {
            const rawQ = query.trim().toLowerCase();
            filtered = filtered.filter(item => String(this._extractPayloadTitle(item)).toLowerCase().includes(rawQ));
        }
        filtered = filtered.slice(0, 100);

        listNode.innerHTML = ''; // Fast Clear
        
        const iconName = this.getAttribute('icon-name') || 'folder-outline';
        const iconColorTheme = this.getAttribute('icon-color') || 'step-300';
        const iconStyleBackground = `var(--ion-color-${iconColorTheme}, #3880ff)`;
        const entityName = this.getAttribute('entity-name') || 'Registro';

        filtered.forEach(item => {
            const idVal = String(this._extractPayloadId(item));
            const title = this._extractPayloadTitle(item);
            const el = document.createElement('ion-item');
            el.button = true;
            el.style.setProperty('--min-height', '56px');

            // S35.4 / S41.12: Race Condition Guard Trigger (Mouse + Touch)
            const setBlurGuard = () => { this._temporaryBlurFlag = true; };
            el.addEventListener('mousedown', setBlurGuard);
            el.addEventListener('touchstart', setBlurGuard, {passive: true});

            const iBoxHtml = `
                <div slot="start" style="width: 32px; height: 32px; background: ${iconStyleBackground}; border-radius: 6px; display: inline-flex; justify-content: center; align-items: center; margin-right: 12px;">
                    <ion-icon name="${iconName}" style="color: var(--ion-color-light, white); font-size: 18px;"></ion-icon>
                </div>
            `;
            
            const lexicalId = item.lexical_id || item.id_numero || idVal;
            const labelHtml = `
                <ion-label>
                    <h3 style="font-weight: bold; color: var(--ion-color-dark); margin: 0; padding: 0; line-height: 1.2;">${title}</h3>
                    <p style="font-size: 11px; color: var(--ion-color-medium); margin: 0; padding: 0; line-height: 1.2;">${entityName} • ${lexicalId}</p>
                </ion-label>
            `;

            if (this._isMultiple) {
                const isChecked = this._selectedState.has(idVal);
                const limitReached = this._maxSelection && this._selectedState.size >= this._maxSelection;
                const isDisabled = !isChecked && limitReached;

                el.innerHTML = `
                    <div slot="start" style="display:flex; align-items:center;">
                        <ion-checkbox justify="start" style="margin-right: 12px; pointer-events: none;" ${isChecked ? 'checked="true"' : ''} ${isDisabled ? 'disabled="true"' : ''}></ion-checkbox>
                        ${iBoxHtml.replace('slot="start" ', '')}
                    </div>
                    ${labelHtml}
                `;
                el.addEventListener('click', (e) => {
                    e.preventDefault(); // Evitar doble evento de Ion-Checkbox
                    const checkbox = el.querySelector('ion-checkbox');
                    if (this._selectedState.has(idVal)) {
                        this._selectedState.delete(idVal);
                        checkbox.checked = false;

                        // S41.9: Liberar bloqueo si caemos bajo el límite
                        if (this._maxSelection && this._selectedState.size < this._maxSelection) {
                            const rootContext = this._inlineMode ? this : this._overlayNode;
                            if (rootContext) {
                                const allBoxes = rootContext.querySelectorAll('ion-checkbox');
                                allBoxes.forEach(cb => cb.disabled = false);
                            }
                        }
                    } else {
                        // S41.9 Guardrail
                        if (this._maxSelection && this._selectedState.size >= this._maxSelection) {
                            return; 
                        }
                        this._selectedState.add(idVal);
                        checkbox.checked = true;

                        // S41.9: Bloquear UI sobrante si alcanzamos límite
                        if (this._maxSelection && this._selectedState.size >= this._maxSelection) {
                            const rootContext = this._inlineMode ? this : this._overlayNode;
                            if (rootContext) {
                                const allBoxes = rootContext.querySelectorAll('ion-checkbox');
                                allBoxes.forEach(cb => {
                                    if (!cb.checked) cb.disabled = true;
                                });
                            }
                        }
                    }
                    
                    // Liberar flag anti-carrera enganchada por mousedown (Bug: Bloqueo de agregar múltiples)
                    this._temporaryBlurFlag = false;
                    
                    this._scheduleRender(); // Reflejar cuenta externamente
                    this.dispatchSelection(); // S41.9: Zero-Latency Live Syncing
                });
            } else {
                const isSelected = String(this._selectedState) === idVal;
                el.innerHTML = `
                    ${iBoxHtml}
                    ${labelHtml}
                    ${isSelected ? '<ion-icon name="checkmark-outline" slot="end" color="primary"></ion-icon>' : ''}
                `;
                el.addEventListener('click', () => {
                    this._selectedState = idVal;
                    // Forzar input a perder blur-flag para que limpie si el usuario no cerró manual
                    this._temporaryBlurFlag = false; 
                    
                    this._scheduleRender();
                    this.dispatchSelection(); // Disparo automático inmediato si es Single
                    if (this._overlayNode && typeof this._overlayNode.dismiss === 'function') {
                        this._overlayNode.dismiss();
                    } else {
                        this._cleanupOverlay();
                    }
                });
            }
            listNode.appendChild(el);
        });

        if (filtered.length === 0) {
            if (this.getAttribute('is-loading') === 'true') {
                listNode.innerHTML = `<ion-item><ion-spinner name="crescent" slot="start" style="margin-right:15px; width:20px; height:20px;"></ion-spinner><ion-label color="medium">Cargando...</ion-label></ion-item>`;
            } else {
                listNode.innerHTML = `<ion-item><ion-label color="medium">No se encontraron resultados</ion-label></ion-item>`;
            }
        }
    }

    _render() {
        this._rafId = null; // Liberar pointer al arrancar dibujado
        
        // S41.11 Renderizado Estado Único
        if (!this._isMultiple) {
            const hasSelection = this._selectedState !== null && this._selectedState !== undefined && this._selectedState !== "";
            const phNode = this.querySelector(`#${this._componentId}-single-ph`);
            const filledHeader = this.querySelector(`#${this._componentId}-single-filled-header`);
            const filledNode = this.querySelector(`#${this._componentId}-single-filled`);
            const textNode = this.querySelector(`#${this._componentId}-single-text`);
            const subNode = this.querySelector(`#${this._componentId}-single-sub`);
            const btnClear = this.querySelector(`#${this._componentId}-mobile-clear`); // Reusando ID del listener
            
            if (hasSelection) {
                if (phNode) phNode.style.display = 'none';
                if (filledHeader) filledHeader.style.display = 'flex';
                if (filledNode) filledNode.style.display = 'block';
                if (btnClear) btnClear.style.display = 'block';
                
                if (textNode) {
                    const rawId = this._selectedState;
                    const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(rawId));
                    textNode.textContent = found ? this._extractPayloadTitle(found) : rawId;
                    if (subNode) {
                        subNode.textContent = found ? (found.lexical_id || found.id_numero || rawId) : rawId;
                    }
                }
            } else {
                if (phNode) phNode.style.display = 'block';
                if (filledHeader) filledHeader.style.display = 'none';
                if (filledNode) filledNode.style.display = 'none';
                if (btnClear) btnClear.style.display = 'none';
            }
        }

        // Render Multi-Cards Container si aplica
        if (this._isMultiple) {
            const placeholderNode = this.querySelector(`#${this._componentId}-placeholder`);
            const filledHeaderNode = this.querySelector(`#${this._componentId}-filled-header`);
            const inlineContainerNode = this.querySelector(`#${this._componentId}-inline-list-container`);
            const inlineCounterNode = this.querySelector(`#${this._componentId}-inline-counter`);
            const cardsContainer = this.querySelector('.tx-multi-cards-container');
            
            const hasItems = this._selectedState && this._selectedState.size > 0;
            
            // Toggle de modos de la vista principal
            if (this._inlineMode) {
                if (placeholderNode) placeholderNode.style.display = 'none';
                if (filledHeaderNode) filledHeaderNode.style.display = 'none';
                if (inlineContainerNode) {
                    inlineContainerNode.style.display = 'flex';
                    // Auto-focus de searchbar al transicionar a Inline abierto
                    if (inlineContainerNode.dataset.focused !== 'true') {
                        inlineContainerNode.dataset.focused = 'true';
                        setTimeout(() => {
                            const searchbar = inlineContainerNode.querySelector('ion-searchbar');
                            if (searchbar) searchbar.setFocus();
                        }, 100);
                    }
                }
                if (inlineCounterNode) inlineCounterNode.textContent = hasItems ? `${this._selectedState.size} seleccionados` : 'Ninguno';
            } else {
                if (inlineContainerNode) {
                    inlineContainerNode.style.display = 'none';
                    if (inlineContainerNode.dataset.focused) delete inlineContainerNode.dataset.focused;
                }
                if (hasItems) {
                    if (placeholderNode) placeholderNode.style.display = 'none';
                    if (filledHeaderNode) filledHeaderNode.style.display = 'flex';
                } else {
                    if (placeholderNode) {
                        placeholderNode.style.display = 'block';
                        placeholderNode.style.marginBottom = '24px';
                    }
                    if (filledHeaderNode) filledHeaderNode.style.display = 'none';
                }
            }
            
            if (cardsContainer) {
                window.DOM.clear(cardsContainer);
                const iconName = this.getAttribute('icon-name') || 'extension-puzzle-outline';
                const iconColor = this.getAttribute('icon-color') || 'primary';
                
                if (hasItems) {
                    this._selectedState.forEach(singleId => {
                        const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(singleId));
                        const titleText = found ? this._extractPayloadTitle(found) : singleId;
                        const lexicalId = found ? (found.lexical_id || found.id_numero || singleId) : singleId;
                        
                        const fakeItem = document.createElement('div');
                        fakeItem.innerHTML = this._getSharedCardTemplate({
                            iconName, iconColor, title: titleText, subtitle: lexicalId
                        });
                        
                        const finalNode = fakeItem.firstElementChild;
                        const removeBtn = finalNode.querySelector('ion-button');
                        if (!this._isDisabled) {
                            removeBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this._selectedState.delete(singleId);
                                this._scheduleRender();
                                
                                // Si cerramos el listado y borramos, re-renderizar los chx si están visibles? 
                                // Si inlineMode está false, el listado ni se ve, pero si está true:
                                if (this._inlineMode) {
                                    this.buildListItems(this._searchTerm || '');
                                }
                                
                                this.dispatchSelection();
                            });
                        } else {
                            removeBtn.disabled = true;
                        }
                        
                        cardsContainer.appendChild(finalNode);
                    });
                }
            }
        }
    }
}

// Registrar Elemento globalmente si estamos en Front-End Context
if (typeof window !== 'undefined' && typeof window.customElements !== 'undefined') {
    if (!window.customElements.get('tx-searchable')) {
        window.customElements.define('tx-searchable', TXSearchable);
    }
}
