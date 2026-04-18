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
        if (this._overlayNode) {
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
                        <div id="${this._componentId}-placeholder" class="trigger-container" style="background: var(--ion-color-step-50, #f4f5f8); border-radius: 8px; border: 1px solid var(--ion-color-step-100, #e0e0e0); margin-bottom: 24px; cursor: pointer; display: none;">
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

                        <!-- ESTADO LLENO (MULTISELECT CHIPS) -->
                        <div id="${this._componentId}-filled-container" style="display: none; flex-direction: column; margin-bottom: 24px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong style="color: var(--ion-color-dark); font-size: 14px; margin-left: 4px;">${this._entityName}</strong>
                                <ion-button class="trigger-container" size="small" fill="clear" style="margin: 0; --color: var(--ion-color-primary, #3880ff); font-weight: bold; font-family: var(--sys-font-family, inherit);">
                                    + AGREGAR
                                </ion-button>
                            </div>
                            <div class="tx-multi-cards-container" style="display: flex; flex-direction: column; gap: 8px;"></div>
                        </div>
                    </div>
                `;
            } else {
                this.innerHTML = `
                    <div class="tx-searchable-root" style="width: 100%; position: relative;">
                        <!-- S41.2: Trigger Container -->
                        <div class="trigger-container" style="position: relative; cursor: pointer; display: block; width: 100%;">
                            <ion-input 
                                id="${this._componentId}-input"
                                class="tx-search-input"
                                label="${this._entityName}" 
                                label-placement="floating" 
                                fill="outline"
                                clear-input="true"
                                ${readOnlyAttr}
                                style="cursor: pointer; --padding-end: 35px; --highlight-color-valid: var(--ion-color-primary, #3880ff); --highlight-color-focused: var(--ion-color-primary, #3880ff);"
                            >
                                <div id="${this._componentId}-left-slot" slot="start" style="display: none; align-items: center;">
                                    <div id="${this._componentId}-left-icon-box" style="width: 24px; height: 24px; border-radius: 4px; display: inline-flex; justify-content: center; align-items: center; margin-left: 8px; transition: background 0.2s ease;">
                                        <ion-icon id="${this._componentId}-left-icon" name="${iconName}" style="font-size: 14px; transition: color 0.2s ease;"></ion-icon>
                                    </div>
                                    <span id="${this._componentId}-left-text" style="color: var(--ion-color-medium, #92949c); font-size: 0.95em; margin-left: 8px; margin-right: 0px; display: none;"></span>
                                </div>
                            </ion-input>
                            
                            <!-- S41.2: Lupa Overlay (Universal: Mobile y Desktop Visible) -->
                            <div id="${this._componentId}-mobile-search" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--ion-color-medium, gray); z-index: 2; ${searchIconStyle} align-items: center;">
                                <ion-icon name="search-outline" style="font-size: 20px;"></ion-icon>
                            </div>
                            
                            <!-- S41.7: Clear Decorator Drop-in (Bypass Ionic Readonly Hide) -->
                            <div id="${this._componentId}-mobile-clear" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: auto; color: var(--ion-color-medium, gray); z-index: 10; display: none; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%;">
                                <ion-icon name="close-circle" style="font-size: 20px; cursor: pointer;"></ion-icon>
                            </div>
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
        if (this._overlayNode) return; // Prevent double-tap spawning
        this.isMobile() ? this._openMobileModal() : this._openDesktopDropdown();
    }
    
    _getSharedOverlayHtml(isMob) {
        return `
            <ion-header class="ion-no-border" style="border-top-left-radius: var(--border-radius, 16px); border-top-right-radius: var(--border-radius, 16px); overflow: hidden;">
                ${isMob ? `
                <ion-toolbar color="primary">
                    <ion-title style="color: var(--ion-color-primary-contrast, #ffffff); font-weight: 600;">Buscar ${this._entityName}</ion-title>
                    <ion-buttons slot="end">
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
                    <ion-button expand="block" id="${this._componentId}-btn-apply">Aplicar Selección</ion-button>
                </ion-toolbar>
                ` : ''}
            </ion-header>
            <ion-content style="--background: var(--ion-background-color, #ffffff);">
                <div style="text-align:center; padding: 15px;" id="${this._componentId}-spinner">
                    <ion-spinner></ion-spinner>
                </div>
                <ion-list id="${this._componentId}-list"></ion-list>
            </ion-content>
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
                <ion-button expand="block" fill="clear" id="${this._componentId}-btn-apply" style="margin: 0;">Aceptar Selección</ion-button>
            </div>
            ` : ''}
            <div style="text-align:center; padding: 15px;" id="${this._componentId}-spinner">
                <ion-spinner></ion-spinner>
            </div>
            <ion-list id="${this._componentId}-list" style="padding-top: 0;"></ion-list>
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
        if (closeBtn) closeBtn.addEventListener('click', () => this._overlayNode.dismiss());

        const applyBtn = this._overlayNode.querySelector(`#${this._componentId}-btn-apply`);
        if (applyBtn) {
            applyBtn.addEventListener('click', () => {
                this.dispatchSelection(); // Confirmar al mundo exterior
                this._overlayNode.dismiss();
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
        const listNode = this._overlayNode.querySelector(`#${this._componentId}-list`);
        const spinner = this._overlayNode.querySelector(`#${this._componentId}-spinner`);
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

            // S35.4: Race Condition Guard Trigger
            el.addEventListener('mousedown', () => {
                this._temporaryBlurFlag = true;
            });

            const iBoxHtml = `
                <div slot="start" style="width: 32px; height: 32px; background: ${iconStyleBackground}; border-radius: 6px; display: inline-flex; justify-content: center; align-items: center; margin-right: 12px;">
                    <ion-icon name="${iconName}" style="color: var(--ion-color-light, white); font-size: 18px;"></ion-icon>
                </div>
            `;
            
            const lexicalId = item.lexical_id || item.id_numero || idVal;
            const labelHtml = `
                <ion-label>
                    <h3 style="font-weight: bold; color: var(--ion-color-dark);">${title}</h3>
                    <p style="font-size: 11px; color: var(--ion-color-medium);">${entityName} • ${lexicalId}</p>
                </ion-label>
            `;

            if (this._isMultiple) {
                const isChecked = this._selectedState.has(idVal);
                const limitReached = this._maxSelection && this._selectedState.size >= this._maxSelection;
                const isDisabled = !isChecked && limitReached;

                el.innerHTML = `
                    ${iBoxHtml}
                    ${labelHtml}
                    <ion-checkbox slot="end" ${isChecked ? 'checked="true"' : ''} ${isDisabled ? 'disabled="true"' : ''}></ion-checkbox>
                `;
                el.addEventListener('click', (e) => {
                    e.preventDefault(); // Evitar doble evento de Ion-Checkbox
                    const checkbox = el.querySelector('ion-checkbox');
                    if (this._selectedState.has(idVal)) {
                        this._selectedState.delete(idVal);
                        checkbox.checked = false;

                        // S41.9: Liberar bloqueo si caemos bajo el límite
                        if (this._maxSelection && this._selectedState.size < this._maxSelection && this._overlayNode) {
                            const allBoxes = this._overlayNode.querySelectorAll('ion-checkbox');
                            allBoxes.forEach(cb => cb.disabled = false);
                        }
                    } else {
                        // S41.9 Guardrail
                        if (this._maxSelection && this._selectedState.size >= this._maxSelection) {
                            return; 
                        }
                        this._selectedState.add(idVal);
                        checkbox.checked = true;

                        // S41.9: Bloquear UI sobrante si alcanzamos límite
                        if (this._maxSelection && this._selectedState.size >= this._maxSelection && this._overlayNode) {
                            const allBoxes = this._overlayNode.querySelectorAll('ion-checkbox');
                            allBoxes.forEach(cb => {
                                if (!cb.checked) cb.disabled = true;
                            });
                        }
                    }
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
        
        const inputBase = this.querySelector('ion-input.tx-search-input');
        if (inputBase) {
            if (!this._isMultiple) {
                const displ = this._getDisplayValue();
                // Desktop Typeahead override: Solo si no está enfocado activamente escribiendo, forzamos value
                if (document.activeElement !== inputBase) {
                    inputBase.value = displ;
                }
                
                // Ajustar Label color para que se vea activo (Formato Ionic custom)
                if (displ) inputBase.classList.add('ion-valid');
                else inputBase.classList.remove('ion-valid');
            } else {
                inputBase.value = ""; // Vaciamos para no entorpecer la próxima búsqueda
                inputBase.placeholder = "Agregar..."; // Guía visual de "estoy listo para tipeo"
                
                // Aplicar estado lleno visual
                if (this._selectedState && this._selectedState.size > 0) {
                    inputBase.classList.add('ion-valid');
                } else {
                    inputBase.classList.remove('ion-valid');
                }
            }
            inputBase.disabled = this._isDisabled; // Sincroniza renderizado visual nativo

            // S41.7 Control Dinámico de Search (Universal) y Clear (Mobile)
            const decorSearch = this.querySelector(`#${this._componentId}-mobile-search`);
            const decorClear = this.querySelector(`#${this._componentId}-mobile-clear`);
            
            const hasTextContent = (!this._isMultiple) && (!!this._getDisplayValue() || !!inputBase.value);
            
            if (decorSearch) {
                // Siempre ocultar la lupa si hay texto para no colisionar con clear-input nativo de desktop o custom de mobile
                decorSearch.style.setProperty('display', hasTextContent ? 'none' : 'flex', 'important');
            }
            if (decorClear && this.isMobile()) {
                // El Custom Clear SÓLO escala a display=flex en mobile porque desktop tiene clear-input nativo
                decorClear.style.setProperty('display', hasTextContent ? 'flex' : 'none', 'important');
            }

            // S41.7 H10 Resoltion: Usar slot pre-ensamblado en DOM estático, solo mutar estilos para evitar Illegal Invocations
            const leftSlotDiv = this.querySelector(`#${this._componentId}-left-slot`);
            const leftSlotIcon = leftSlotDiv ? leftSlotDiv.querySelector('ion-icon') : null;
            
            if (leftSlotDiv && leftSlotIcon) {
                const hasSelection = this._isMultiple ? (this._selectedState && this._selectedState.size > 0) : !!this._getDisplayValue();
                if (hasSelection && !this._isMultiple) {
                    // S41.9: Rediseño visual exclusivo para single-select
                    leftSlotDiv.style.display = 'flex'; // Turn the slot visually On
                    
                    const iconBox = leftSlotDiv.querySelector(`#${this._componentId}-left-icon-box`);
                    const textSpan = leftSlotDiv.querySelector(`#${this._componentId}-left-text`);
                    
                    const isSingleRender = (!this._isMultiple) || (this._isMultiple && this._selectedState.size === 1);
                    if (isSingleRender && textSpan) {
                        const rawId = this._isMultiple ? Array.from(this._selectedState)[0] : this._selectedState;
                        const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(rawId));
                        const lexicalId = found ? (found.lexical_id ?? found.id_numero ?? rawId) : rawId;
                        textSpan.textContent = String(lexicalId);
                        textSpan.style.display = 'inline';
                    } else if (textSpan) {
                        textSpan.style.display = 'none'; // Multi mode with > 1 items
                    }

                    const iconColorTheme = this.getAttribute('icon-color') || 'primary';
                    if (iconBox) {
                        iconBox.style.setProperty('background', `var(--ion-color-${iconColorTheme}, #3880ff)`, 'important');
                    }
                    leftSlotIcon.style.setProperty('color', '#ffffff', 'important');
                } else {
                    // Estado Inactivo o Multi-Select: Apagar slot (Multi ya renderiza las cards abajo)
                    leftSlotDiv.style.display = 'none';
                }
            }
        }

        // Render Multi-Cards Container si aplica
        if (this._isMultiple) {
            const placeholderNode = this.querySelector(`#${this._componentId}-placeholder`);
            const filledContNode = this.querySelector(`#${this._componentId}-filled-container`);
            const cardsContainer = this.querySelector('.tx-multi-cards-container');
            
            if (this._selectedState && this._selectedState.size > 0) {
                if (placeholderNode) placeholderNode.style.display = 'none';
                if (filledContNode) filledContNode.style.display = 'flex';
                
                if (cardsContainer) {
                    window.DOM.clear(cardsContainer);
                    const iconName = this.getAttribute('icon-name') || 'extension-puzzle-outline';
                    const iconColor = this.getAttribute('icon-color') || 'primary';
                    this._selectedState.forEach(singleId => {
                        const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(singleId));
                        const titleText = found ? this._extractPayloadTitle(found) : singleId;
                        
                        const fakeItem = document.createElement('div');
                        fakeItem.innerHTML = `
                        <ion-item lines="none" style="--border-radius: var(--border-radius, 8px); border-radius: var(--border-radius, 8px); box-shadow: 0 2px 4px rgba(0,0,0,0.06); width: 100%; border: 1px solid var(--ion-color-step-100);">
                            <div slot="start" style="width: 28px; height: 28px; background: var(--ion-color-${iconColor}, var(--ion-color-primary)); border-radius: 4px; display: inline-flex; justify-content: center; align-items: center; margin-right: 12px;">
                                <ion-icon name="${iconName}" style="color: var(--ion-color-light, white); font-size: 16px;"></ion-icon>
                            </div>
                            <ion-label class="ion-text-wrap" style="flex: 1; margin: 0; padding-right: 8px;">
                                <strong>${titleText}</strong>
                            </ion-label>
                            <ion-button slot="end" fill="clear" color="danger" size="small" style="margin: 0;">
                                <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                            </ion-button>
                        </ion-item>
                        `;
                        
                        const finalNode = fakeItem.firstElementChild;
                        const removeBtn = finalNode.querySelector('ion-button');
                        if (!this._isDisabled) {
                            removeBtn.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                this._selectedState.delete(singleId);
                                this._scheduleRender();
                                this.dispatchSelection();
                            });
                        } else {
                            removeBtn.disabled = true;
                        }
                        
                        cardsContainer.appendChild(finalNode);
                    });
                }
            } else {
                if (placeholderNode) placeholderNode.style.display = 'block';
                if (filledContNode) filledContNode.style.display = 'none';
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
