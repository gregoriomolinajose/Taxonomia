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
        
        let labelVal = item[labelCampo];
        
        // [S67.2] Robust Fallback for denormalized table structures (e.g. nombre_equipo instead of nombre)
        if (!labelVal) {
            const nameKey = Object.keys(item).find(k => k.startsWith('nombre_') && k !== 'nombre_ingles');
            if (nameKey) labelVal = item[nameKey];
        }
        
        // Fallback sequentially to IDs
        return labelVal ?? item[idCampo] ?? item.id_registro ?? item.id ?? '';
    }

    _extractPayloadId(item) {
        if (!item) return null;
        const idCampo = this.getAttribute('value-field') || 'id';
        return item[idCampo] ?? item.id_registro ?? item.id;
    }

    _formatDisplayString(item, rawId) {
        if (!item) {
            // [Bugfix S67.3] Global fallback for lazy-hydrated components (readonly drawers)
            const fieldName = this.getAttribute('data-form-component') || this.getAttribute('name');
            if (fieldName && window._LOOKUP_DATA && window._LOOKUP_DATA[fieldName]) {
                const lookupArr = window._LOOKUP_DATA[fieldName];
                const opt = lookupArr.find(o => String(o.value) === String(rawId));
                if (opt && opt.label) return opt.label;
            }
            
            // Global DataStore fallback
            if (window.FormEngine_Resolvers && typeof window.FormEngine_Resolvers.resolveEntityRecord === 'function') {
                const targetEntity = this.getAttribute('target-entity') || this.getAttribute('entity-name');
                if (targetEntity) {
                    const globalRec = window.FormEngine_Resolvers.resolveEntityRecord(targetEntity, rawId);
                    if (globalRec) return this._extractPayloadTitle(globalRec);
                }
            }
            
            return String(rawId);
        }
        return this._extractPayloadTitle(item);
    }

    _resolveSubtitle(item, idVal) {
        const subtitleField = this.getAttribute('subtitle-field');
        const subtitleLookup = this.getAttribute('subtitle-lookup');
        const targetEntity = this.getAttribute('target-entity') || this.getAttribute('entity-name') || '';
        
        let localSubtitleId = subtitleField && item ? item[subtitleField] : null;

        // [S49.13] Edge Traversal para Topologías de Grafo Temporal (Ej. CARGO_PERSONA)
        // [S49.14] Refactored to use centralized Graph_Utils for O(1) indexed lookups
        if (subtitleField && !localSubtitleId && window.Graph_Utils) {
            const targetEntity = this.getAttribute('target-entity') || this.getAttribute('entity-name') || '';
            const sFieldMeta = window.Graph_Utils.getTemporalEdgeMeta(targetEntity, subtitleField);
            
            if (sFieldMeta) {
                localSubtitleId = window.Graph_Utils.resolveLinkedId(idVal, sFieldMeta.graphEdgeType, this.getAttribute('context-id'), false, sFieldMeta.relationType);
            }
        }

        let finalSubtitle = subtitleField ? 'Sin Identificar' : (targetEntity || 'Registro');
        if (localSubtitleId) {
            finalSubtitle = localSubtitleId;
            if (subtitleLookup && window.DataStore) {
                const table = window.DataStore.get(subtitleLookup);
                if (table && table.length) {
                    const foundObj = table.find(c => String(c.id_cargo) === String(localSubtitleId) || String(c.id) === String(localSubtitleId) || String(c.id_numero) === String(localSubtitleId));
                    if (foundObj && foundObj.nombre) {
                        finalSubtitle = foundObj.nombre;
                    }
                }
            }
        }
        
        return finalSubtitle;
    }

    // ===============================================
    // 1. API Contract / Declarative Attributes
    // ===============================================
    static get observedAttributes() {
        return ['entity-name', 'multiple', 'pre-selected', 'disabled', 'max-selection', 'placeholder'];
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
                    console.error(`[TXSearchable] CRITICAL: Fallo al parsear pre-selected en ${this._entityName}: ${e.message}`, newValue);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('txTelemetryError', {
                            detail: { component: 'TXSearchable', error: e.message, rawValue: newValue }
                        }));
                    }
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
        let excluded = [];
        const formContainer = this.closest('form, ion-content, .drawer-content');
        const disallowedEdgesStr = this.getAttribute('disallowed-context-edges');
        
        if (typeof window !== 'undefined' && window.UI_FormUtils && window.UI_FormUtils.getExcludedGraphNodes && formContainer && disallowedEdgesStr) {
            let currentContextId = this.getAttribute('context-id');
            if (!currentContextId) {
                const possiblePkInput = formContainer.querySelector('input[type="hidden"][name^="id_"]');
                if (possiblePkInput && possiblePkInput.value) {
                    currentContextId = possiblePkInput.value;
                }
            }
            
            const currentEntityName = this.getAttribute('entity-name');
            excluded = window.UI_FormUtils.getExcludedGraphNodes(disallowedEdgesStr, currentEntityName, formContainer, currentContextId) || [];
        }

        if (this._isMultiple) {
            let current = Array.from(this._selectedState || new Set());
            if (excluded.length > 0) {
                current = current.filter(id => !excluded.includes(String(id)));
            }
            return current;
        }
        if (excluded.includes(String(this._selectedState))) return null;
        return this._selectedState || null;
    }

    setValidatedValue(val) {
        if (!val) {
            this._selectedState = this._isMultiple ? new Set() : null;
        } else if (this._isMultiple) {
            this._selectedState = new Set(Array.isArray(val) ? val.map(String) : [String(val)]);
        } else {
            this._selectedState = String(val);
        }
        this._scheduleRender();
        this.dispatchSelection(false);
    }

    dispatchSelection(isUserEvent = false) {
        const payload = this.getValidatedValue();
        const ev = new CustomEvent('txChange', {
            detail: {
                value: payload,
                entity: this._entityName,
                isMultiple: this._isMultiple,
                isUserEvent: isUserEvent
            },
            bubbles: true,
            composed: true // Permite que el evento cruce boundaries
        });
        this.dispatchEvent(ev);
    }

    get value() {
        return this.getValidatedValue();
    }

    set value(val) {
        this.setValidatedValue(val);
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
                    this.dispatchSelection(true);
                    this._scheduleRender();
                }
            });
        }

        const singleCardItem = this.querySelector(`#${this._componentId}-single-filled ion-item`);
        if (singleCardItem && !this._singleClickBound) {
            this._singleClickBound = true;
            singleCardItem.style.cursor = 'pointer';
            singleCardItem.addEventListener('click', (ev) => {
                if (ev.target.closest('ion-button')) return;
                const targetEntity = this.getAttribute('target-entity') || this._entityName;
                
                let idToOpen = this._selectedState;
                if (Array.isArray(idToOpen)) idToOpen = idToOpen[0];
                if (typeof idToOpen === 'object' && idToOpen !== null) idToOpen = this._extractPayloadId(idToOpen);
                idToOpen = String(idToOpen).trim();
                
                console.log("[TXSearchable] Click en singleCardItem. Abriendo:", { targetEntity, idToOpen, rawState: this._selectedState });
                
                if (window.openEditForm && targetEntity && idToOpen && idToOpen !== 'undefined' && idToOpen !== 'null') {
                    window.openEditForm(idToOpen, targetEntity);
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
                            this.dispatchSelection(true); // Avisar a formulario (FormRenderer)
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
        if (!document.getElementById('tx-searchable-global-styles')) {
            const style = document.createElement('style');
            style.id = 'tx-searchable-global-styles';
            style.innerHTML = `
                [data-tx-state="hidden"] { display: none !important; }
                [data-tx-state="flex"] { display: flex !important; }
                [data-tx-state="block"] { display: block !important; }
                
                /* Estilos Premium SaaS para el Empty State */
                .tx-placeholder-hover:hover {
                    border-color: var(--ion-color-primary, #3880ff) !important;
                    background: rgba(56, 128, 255, 0.02) !important;
                }
                .tx-placeholder-hover:hover .tx-icon-scale {
                    transform: scale(1.1);
                    background: rgba(56, 128, 255, 0.12) !important;
                }
            `;
            document.head.appendChild(style);
        }

        if (!this._componentId) {
            this._componentId = 'tx-searchable-' + Math.random().toString(36).substr(2, 9);
        }

        const iconName = this.getAttribute('icon-name') || 'folder-outline';
        const iconColor = this.getAttribute('icon-color') || 'step-200';
        this._fieldLabel = this.getAttribute('field-label') || this._entityName;
        
        const readOnlyAttr = this.isMobile() ? 'readonly="true"' : '';
        const searchIconStyle = 'display: flex;'; // Start visible universally

        if (!this.innerHTML.trim()) {
            if (this._isMultiple) {
                this.innerHTML = `
                    <div class="tx-searchable-root" style="width: 100%; position: relative;">
                        <!-- ESTADO PLACEHOLDER (MULTISELECT) -->
                        ${this._getPlaceholderTemplate(`${this._componentId}-placeholder`, true, iconName)}

                        <!-- ESTADO LLENO HEADER (MULTISELECT) -->
                        <div id="${this._componentId}-filled-header" data-tx-state="hidden" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: var(--ion-color-dark); font-size: 14px; margin-left: 4px;">${this._fieldLabel}</strong>
                            <ion-button class="trigger-container" size="small" fill="clear" style="margin: 0; --color: var(--ion-color-primary, #3880ff); font-weight: bold; font-family: var(--sys-font-family, inherit); display: ${this._isDisabled ? 'none' : 'block'};">
                                + AGREGAR
                            </ion-button>
                        </div>
                        
                        ${this._getInlineOverlayTemplate()}

                        <!-- CARDS SIEMPRE VISIBLES DEBAJO -->
                        <div class="tx-multi-cards-container" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px;"></div>
                    </div>
                `;
            } else {
                this.innerHTML = `
                    <div class="tx-searchable-root" style="width: 100%; position: relative;">
                        <!-- ESTADO PLACEHOLDER (SINGLE SELECT) -->
                        ${this._getPlaceholderTemplate(`${this._componentId}-single-ph`, false, iconName)}

                        <!-- ESTADO LLENO HEADER (SINGLE SELECT) -->
                        <div id="${this._componentId}-single-filled-header" data-tx-state="hidden" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong style="color: var(--ion-color-dark); font-size: 14px; margin-left: 4px;">${this._fieldLabel}</strong>
                            <ion-button class="trigger-container" size="small" fill="clear" style="margin: 0; --color: var(--ion-color-primary, #3880ff); font-weight: bold; font-family: var(--sys-font-family, inherit); display: ${this._isDisabled ? 'none' : 'block'};">
                                CAMBIAR
                            </ion-button>
                        </div>
                        
                        ${this._getInlineOverlayTemplate()}
                        
                        <!-- ESTADO LLENO CARD (SINGLE SELECT) -->
                        <div id="${this._componentId}-single-filled" data-tx-state="hidden" style="width: 100%; margin-bottom: 4px;">
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

        // S49.12: Reactive subscription to DataStore changes for relational subtitles (like "Cargo")
        if (typeof window !== 'undefined' && window.AppEventBus && !this._dsSubscriptionBound) {
            this._dsSubscriptionBound = true;
            this._handleDataStoreChange = (e) => {
                if (!e || !e.detail) return;
                const subtitleLookup = this.getAttribute('subtitle-lookup');
                if (subtitleLookup && e.detail.entityName === subtitleLookup) {
                    this._scheduleRender();
                    if (this._overlayNode || this._inlineMode) {
                        this.buildListItems(this._searchTerm || '');
                    }
                }
            };
            window.AppEventBus.subscribe('DATASTORE::CHANGED', this._handleDataStoreChange);
        }

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
        
        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
            this._outsideClickListener = null;
        }
        
        if (typeof window !== 'undefined' && window.AppEventBus && this._handleDataStoreChange) {
            window.AppEventBus.unsubscribe('DATASTORE::CHANGED', this._handleDataStoreChange);
            this._handleDataStoreChange = null;
            this._dsSubscriptionBound = false;
        }
        
        // Destitución de modales anclados en root
        this._cleanupOverlay();
    }

    // ===============================================
    // 4. Communication Interface
    // ===============================================
    dispatchSelection(isUserEvent = false) {
        const payload = this.getValidatedValue();
        const ev = new CustomEvent('txChange', {
            detail: {
                value: payload,
                entity: this._entityName,
                isMultiple: this._isMultiple,
                isUserEvent: isUserEvent
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
        if (!this.isMobile()) {
            if (!this._inlineMode) {
                this._inlineMode = true;
                this._scheduleRender();
                this._bindInlineInternalEvents();
                this.buildListItems(this._searchTerm || '');
                
                // Add outside click listener
                if (!this._outsideClickListener) {
                    this._outsideClickListener = (e) => {
                        if (this._inlineMode && !this.contains(e.target)) {
                            this._closeInlineMode();
                        }
                    };
                    setTimeout(() => {
                        document.addEventListener('click', this._outsideClickListener);
                    }, 0);
                }
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
                this._closeInlineMode();
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
            this._closeInlineMode();
        }

        this.dispatchEvent(new CustomEvent('txSearchableCreate', {
            detail: { targetEntity: targetEntity },
            bubbles: true,
            composed: true // Permitir cruzar Boundary del Shadow DOM / Custom Elements
        }));
    }
    
    _closeInlineMode() {
        if (!this._inlineMode) return;
        this._inlineMode = false;
        this._searchTerm = ''; 
        this._temporaryBlurFlag = false; 
        
        const searchbar = this.querySelector(`#${this._componentId}-inline-searchbar`);
        if (searchbar) searchbar.value = '';
        
        if (this._outsideClickListener) {
            document.removeEventListener('click', this._outsideClickListener);
            this._outsideClickListener = null;
        }
        
        this._scheduleRender();
        this.dispatchSelection(true); 
    }

    _getSharedOverlayHtml(isMob) {
        const targetEntity = this.getAttribute('target-entity') || this._entityName || '';
        const canCreate = !window.ABAC || window.ABAC.can('create', targetEntity);
        const displayName = this._entityName ? this._entityName.replace(/_/g, ' ') : '';
        
        return `
            <ion-header class="ion-no-border" style="border-top-left-radius: var(--border-radius, 16px); border-top-right-radius: var(--border-radius, 16px); overflow: hidden;">
                ${isMob ? `
                <ion-toolbar color="primary">
                    <ion-title style="color: var(--ion-color-primary-contrast, #ffffff); font-weight: 600;">Buscar ${displayName}</ion-title>
                    <ion-buttons slot="end">
                        ${canCreate ? `
                        <ion-button id="${this._componentId}-btn-create-mob" style="font-weight: 600;">
                            <ion-icon slot="start" name="add-outline"></ion-icon> CREAR
                        </ion-button>
                        ` : ''}
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
                
                ${(!isMob && canCreate) ? `
                <div style="border-top: 1px solid var(--color-border, #e0e0e0);">
                    <ion-item id="${this._componentId}-btn-create-desk" button lines="none" detail="false" style="--background: transparent; margin: 0;">
                        <ion-icon slot="start" name="add-outline" style="color: var(--ion-color-primary, #3880ff);"></ion-icon>
                        <ion-label style="color: var(--ion-color-primary, #3880ff); font-weight: 600;">Crear ${displayName}</ion-label>
                    </ion-item>
                </div>
                ` : ''}
            </ion-content>
        `;
    }

    // S44.6: Refactor UX Búsqueda Inline
    _getInlineOverlayTemplate() {
        const targetEntity = this.getAttribute('target-entity') || this._entityName || '';
        const canCreate = !window.ABAC || window.ABAC.can('create', targetEntity);
        const displayName = this._entityName ? this._entityName.replace(/_/g, ' ') : '';

        return `
            <div id="${this._componentId}-inline-list-container" data-tx-state="hidden" style="flex-direction: column; margin-bottom: 12px; border: 1px solid var(--color-border, #cccccc); border-radius: 8px; overflow: hidden; background: var(--ion-background-color, #ffffff);">
                <!-- HEADER / CLOSER -->
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--color-border, #e0e0e0); background: var(--ion-color-secondary, #f8f9fa);">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <strong style="color: var(--ion-color-dark); font-size: 14px;">${this._fieldLabel}</strong>
                        <span id="${this._componentId}-inline-counter" style="font-size: 11px; background: var(--color-border, #e0e0e0); padding: 2px 8px; border-radius: 12px; color: var(--ion-color-dark); ${!this._isMultiple ? 'display:none;' : ''}"></span>
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
                ${canCreate ? `
                <div style="border-top: 1px solid var(--color-border, #e0e0e0);">
                    <ion-item id="${this._componentId}-btn-create-inline" button lines="none" detail="false" style="--background: transparent; margin: 0;">
                        <ion-icon slot="start" name="add-outline" style="color: var(--ion-color-primary, #3880ff);"></ion-icon>
                        <ion-label style="color: var(--ion-color-primary, #3880ff); font-weight: 600;">Crear ${displayName}</ion-label>
                    </ion-item>
                </div>
                ` : ''}
            </div>
        `;
    }

    // S41.13: Refactorización Estructural (DRY UI Factories)
    _getPlaceholderTemplate(domId, isMultiple, iconName) {
        const hidden = this._isMultiple ? (this._selectedItems && this._selectedItems.length > 0) : !!this._selectedValue;
        const customPlaceholder = this.getAttribute('placeholder');
        const lockText = customPlaceholder || 'Para relacionarlo vaya a la sección Taxonomía';
        const displayName = this._entityName ? this._entityName.replace(/_/g, ' ') : '';
        
        return `
            <!-- ACTIVE PLACEHOLDER -->
            <div id="${domId}-active" ${hidden || this._isDisabled ? 'data-tx-state="hidden"' : ''} style="margin-bottom: 4px;">
                <div style="font-size: 12px; margin-bottom: 8px; color: var(--ion-color-medium, #92949c); padding-left: 4px;">${this._fieldLabel}</div>
                <div class="trigger-container tx-placeholder-hover" style="background: #ffffff; border-radius: 12px; border: 2px dashed var(--color-border, #d1d5db); cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 16px 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.02); gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                        <div class="tx-icon-scale" style="width: 40px; height: 40px; border-radius: 50%; background: var(--ion-color-light, #f4f5f8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.3s ease;">
                            <ion-icon name="${iconName}" style="font-size: 20px; color: var(--ion-color-primary, #3880ff);"></ion-icon>
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <h3 style="font-size: 15px; font-weight: 600; margin: 0; padding: 0; color: var(--ion-color-dark, #222428); margin-bottom: 2px; font-family: var(--sys-font-family, inherit);">Vincular ${displayName}</h3>
                            <p style="font-size: 13px; color: var(--ion-color-medium, #92949c); margin: 0; padding: 0; line-height: 1.3;">Busca registros o crea uno nuevo al instante.</p>
                        </div>
                    </div>
                    <ion-button fill="clear" color="primary" style="font-family: var(--ion-font-family, inherit); margin: 0; --padding-start: 8px; --padding-end: 8px; flex-shrink: 0;">
                        <ion-icon slot="icon-only" name="search-outline" style="font-size: 22px;"></ion-icon>
                    </ion-button>
                </div>
            </div>

            <!-- READONLY PLACEHOLDER (CARD SIZE) -->
            <div id="${domId}-readonly" ${hidden || !this._isDisabled ? 'data-tx-state="hidden"' : ''} style="margin-bottom: 4px;">
                <div style="font-size: 12px; margin-bottom: 8px; color: var(--ion-color-medium, #92949c); padding-left: 4px;">${this._fieldLabel}</div>
                <div style="background: var(--ion-color-light-tint, #fbfbfb); border-radius: 8px; border: 1px dashed var(--color-border, #e5e7eb); padding: 16px; display: flex; align-items: center; gap: 16px; opacity: 0.8;">
                    <div style="width: 40px; height: 40px; border-radius: 8px; background: #ffffff; border: 1px solid var(--color-border, #e5e7eb); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <ion-icon name="lock-closed" style="font-size: 20px; color: var(--ion-color-medium, #92949c);"></ion-icon>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 14px; font-weight: 500; color: var(--ion-color-dark, #222428); margin-bottom: 4px;">Sin ${displayName}</div>
                        <div style="font-size: 12px; color: var(--ion-color-danger, #eb445a); display: flex; align-items: center; gap: 4px;">
                            <ion-icon name="lock-closed" style="font-size: 12px;"></ion-icon>
                            <span>${lockText}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    _getSharedCardTemplate(config) {
        const { textId = '', subId = '', btnId = '', iconName, iconColor, title = '', subtitle = '', avatarUrl = '' } = config;
        
        const avatarOrIconHtml = avatarUrl 
            ? `<img id="${textId ? textId.replace('-text', '-avatar-img') : ''}" src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; top: 0; left: 0;" onerror="this.style.display='none'" />
               <ion-icon id="${textId ? textId.replace('-text', '-avatar-icon') : ''}" name="${iconName}" style="color: var(--ion-color-light, white); font-size: 18px; display: none;"></ion-icon>`
            : `<img id="${textId ? textId.replace('-text', '-avatar-img') : ''}" src="" style="width: 100%; height: 100%; object-fit: cover; display: none; position: absolute; top: 0; left: 0;" onerror="this.style.display='none'" />
               <ion-icon id="${textId ? textId.replace('-text', '-avatar-icon') : ''}" name="${iconName}" style="color: var(--ion-color-light, white); font-size: 18px; display: block;"></ion-icon>`;

        return `
            <ion-item lines="none" style="--min-height: 56px; --padding-top: 4px; --padding-bottom: 4px; --border-radius: var(--border-radius, 8px); border-radius: var(--border-radius, 8px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); width: 100%; border: 1px solid var(--color-border, #e0e0e0);">
                <div slot="start" style="width: 32px; height: 32px; background: var(--ion-color-${iconColor}, var(--ion-color-primary)); border-radius: 4px; display: inline-flex; justify-content: center; align-items: center; margin-right: 12px; overflow: hidden; position: relative;">
                    ${avatarOrIconHtml}
                </div>
                <ion-label class="ion-text-wrap" style="flex: 1; margin: 0; padding-right: 8px;">
                    <h3 ${textId ? `id="${textId}"` : ''} style="font-size: 13px; font-weight: bold; margin: 0; padding: 0; line-height: 1.2;">${title}</h3>
                    <p ${subId ? `id="${subId}"` : ''} style="font-size: 11px; color: var(--ion-color-medium, #92949c); margin: 0; padding: 0; line-height: 1.2;">${subtitle}</p>
                </ion-label>
                <ion-button ${btnId ? `id="${btnId}"` : ''} slot="end" fill="clear" color="medium" size="small" style="margin: 0; display: ${this._isDisabled ? 'none' : 'block'};">
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
        const listNode = (this._inlineMode) 
            ? this.querySelector(`#${this._componentId}-inline-list`)
            : (this._overlayNode ? this._overlayNode.querySelector(`#${this._componentId}-list`) : null);
            
        const spinner = (this._inlineMode)
            ? this.querySelector(`#${this._componentId}-inline-spinner`)
            : (this._overlayNode ? this._overlayNode.querySelector(`#${this._componentId}-spinner`) : null);
            
        if (!listNode) return;

        if (spinner) spinner.setAttribute('data-tx-state', 'hidden');

        // RAM-Secure Local Filter (YAGNI Endless Scroll)
        let filtered = this._dataSource || [];

        const formContainer = this.closest('form, ion-content, .drawer-content');
        
        // Exclude the current entity ID from being selected (cannot link to itself)
        let currentEntityIdForExclusion = this.getAttribute('context-id');
        if (!currentEntityIdForExclusion && formContainer) {
            const possiblePkInput = formContainer.querySelector('input[type="hidden"][name^="id_"]');
            if (possiblePkInput && possiblePkInput.value) {
                currentEntityIdForExclusion = possiblePkInput.value;
            }
        }
        
        // AGGRESSIVE FALLBACK
        if (!currentEntityIdForExclusion) {
            const anyDrawerInput = document.querySelector('.drawer-content input[type="hidden"][name^="id_"]');
            if (anyDrawerInput && anyDrawerInput.value) {
                currentEntityIdForExclusion = anyDrawerInput.value;
            }
        }
        if (currentEntityIdForExclusion) {
            filtered = filtered.filter(item => String(this._extractPayloadId(item)) !== String(currentEntityIdForExclusion));
        }

        const disallowedEdgesStr = this.getAttribute('disallowed-context-edges');
        
        if (typeof window !== 'undefined' && window.UI_FormUtils && window.UI_FormUtils.getExcludedGraphNodes && formContainer && disallowedEdgesStr) {
            let currentContextId = this.getAttribute('context-id');
            if (!currentContextId) {
                const possiblePkInput = formContainer.querySelector('input[type="hidden"][name^="id_"]');
                if (possiblePkInput && possiblePkInput.value) {
                    currentContextId = possiblePkInput.value;
                }
            }
            
            const currentEntityName = this.getAttribute('entity-name');
            const excludeIds = window.UI_FormUtils.getExcludedGraphNodes(disallowedEdgesStr, currentEntityName, formContainer, currentContextId);
            
            if (excludeIds && excludeIds.length > 0) {
                filtered = filtered.filter(item => !excludeIds.includes(String(this._extractPayloadId(item))));
            }
        }

        if (query.trim()) {
            const rawQ = query.trim().toLowerCase();
            filtered = filtered.filter(item => String(this._extractPayloadTitle(item)).toLowerCase().includes(rawQ));
        }
        filtered = filtered.slice(0, 100);

        listNode.innerHTML = ''; // Fast Clear
        
        const iconName = this.getAttribute('icon-name') || 'folder-outline';
        const iconColorTheme = this.getAttribute('icon-color') || 'step-300';
        const iconStyleBackground = `var(--ion-color-${iconColorTheme}, #3880ff)`;
        this._entityName = this.getAttribute('entity-name') || 'Registro';
        this._fieldLabel = this.getAttribute('field-label') || this._entityName;
        const subtitleField = this.getAttribute('subtitle-field');

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

            let avatarUrl = '';
            if (item.Avatar) {
                avatarUrl = Array.isArray(item.Avatar) ? (item.Avatar[0]?.url || '') : item.Avatar;
            } else if (item.avatar) {
                avatarUrl = item.avatar;
            }

            const avatarOrIconHtml = avatarUrl 
                ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block; position: absolute; top: 0; left: 0;" onerror="this.style.display='none'" />
                   <ion-icon name="${iconName}" style="color: var(--ion-color-light, white); font-size: 18px; display: none;"></ion-icon>`
                : `<ion-icon name="${iconName}" style="color: var(--ion-color-light, white); font-size: 18px; display: block;"></ion-icon>`;

            const iBoxHtml = `
                <div slot="start" style="width: 32px; height: 32px; background: ${iconStyleBackground}; border-radius: 6px; display: inline-flex; justify-content: center; align-items: center; margin-right: 12px; overflow: hidden; position: relative;">
                    ${avatarOrIconHtml}
                </div>
            `;
            
            const lexicalId = item.lexical_id || item.id_numero || idVal;
            let finalSubtitle = this._resolveSubtitle(item, idVal);
            finalSubtitle = `${finalSubtitle} • ${lexicalId}`;
            
            const labelHtml = `
                <ion-label>
                    <h3 style="font-weight: bold; color: var(--ion-color-dark); margin: 0; padding: 0; line-height: 1.2;">${title}</h3>
                    <p style="font-size: 11px; color: var(--ion-color-medium); margin: 0; padding: 0; line-height: 1.2;">${finalSubtitle}</p>
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
                    this.dispatchSelection(true); // S41.9: Zero-Latency Live Syncing
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
                    this.dispatchSelection(true); // Disparo automático inmediato si es Single
                    
                    if (this._inlineMode) {
                        this._closeInlineMode();
                    } else if (this._overlayNode && typeof this._overlayNode.dismiss === 'function') {
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
            const phNodeActive = this.querySelector(`#${this._componentId}-single-ph-active`);
            const phNodeReadonly = this.querySelector(`#${this._componentId}-single-ph-readonly`);
            const filledHeader = this.querySelector(`#${this._componentId}-single-filled-header`);
            const filledNode = this.querySelector(`#${this._componentId}-single-filled`);
            const textNode = this.querySelector(`#${this._componentId}-single-text`);
            const subNode = this.querySelector(`#${this._componentId}-single-sub`);
            const btnClear = this.querySelector(`#${this._componentId}-mobile-clear`); // Reusando ID del listener
            const inlineContainerNode = this.querySelector(`#${this._componentId}-inline-list-container`);
            
            if (this._inlineMode) {
                if (phNodeActive) phNodeActive.setAttribute('data-tx-state', 'hidden');
                if (phNodeReadonly) phNodeReadonly.setAttribute('data-tx-state', 'hidden');
                if (filledHeader) filledHeader.setAttribute('data-tx-state', 'hidden');
                if (filledNode) filledNode.setAttribute('data-tx-state', 'hidden');
                if (inlineContainerNode) {
                    inlineContainerNode.setAttribute('data-tx-state', 'flex');
                    if (inlineContainerNode.dataset.focused !== 'true') {
                        inlineContainerNode.dataset.focused = 'true';
                        setTimeout(() => inlineContainerNode.querySelector('ion-searchbar')?.setFocus(), 100);
                    }
                }
            } else {
                if (inlineContainerNode) {
                    inlineContainerNode.setAttribute('data-tx-state', 'hidden');
                    delete inlineContainerNode.dataset.focused;
                }
                
                if (hasSelection) {
                    if (phNodeActive) phNodeActive.setAttribute('data-tx-state', 'hidden');
                    if (phNodeReadonly) phNodeReadonly.setAttribute('data-tx-state', 'hidden');
                    if (filledHeader) filledHeader.setAttribute('data-tx-state', 'flex');
                    if (filledNode) filledNode.setAttribute('data-tx-state', 'block');
                    if (btnClear) btnClear.setAttribute('data-tx-state', this._isDisabled ? 'hidden' : 'block');
                    
                    // Also hide "CAMBIAR" if disabled
                    const cambiarBtn = filledHeader ? filledHeader.querySelector('ion-button') : null;
                    if (cambiarBtn) cambiarBtn.style.display = this._isDisabled ? 'none' : 'block';
                    
                    if (textNode) {
                        const rawId = this._selectedState;
                        const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(rawId));
                        textNode.textContent = found ? this._extractPayloadTitle(found) : rawId;
                        if (subNode) {
                            subNode.textContent = found ? (found.lexical_id || found.id_numero || rawId) : rawId;
                        }
                        
                        // S44.x Update Avatar for single state
                        const avatarImg = this.querySelector(`#${this._componentId}-single-avatar-img`);
                        const avatarIcon = this.querySelector(`#${this._componentId}-single-avatar-icon`);
                        if (avatarImg && avatarIcon) {
                            let avatarUrl = '';
                            if (found) {
                                if (found.Avatar) {
                                    avatarUrl = Array.isArray(found.Avatar) ? (found.Avatar[0]?.url || '') : found.Avatar;
                                } else if (found.avatar) {
                                    avatarUrl = found.avatar;
                                }
                            }
                            
                            if (avatarUrl) {
                                avatarImg.src = avatarUrl;
                                avatarImg.style.display = 'block';
                                avatarIcon.style.display = 'none';
                            } else {
                                avatarImg.style.display = 'none';
                                avatarIcon.style.display = 'block';
                            }
                        }
                    }
                } else {
                    if (phNodeActive) phNodeActive.setAttribute('data-tx-state', this._isDisabled ? 'hidden' : 'block');
                    if (phNodeReadonly) phNodeReadonly.setAttribute('data-tx-state', this._isDisabled ? 'block' : 'hidden');
                    if (filledHeader) filledHeader.setAttribute('data-tx-state', 'hidden');
                    if (filledNode) filledNode.setAttribute('data-tx-state', 'hidden');
                    if (btnClear) btnClear.setAttribute('data-tx-state', 'hidden');
                }
            }
        }

        // Render Multi-Cards Container si aplica
        if (this._isMultiple) {
            const phNodeActive = this.querySelector(`#${this._componentId}-placeholder-active`);
            const phNodeReadonly = this.querySelector(`#${this._componentId}-placeholder-readonly`);
            const filledHeaderNode = this.querySelector(`#${this._componentId}-filled-header`);
            const inlineContainerNode = this.querySelector(`#${this._componentId}-inline-list-container`);
            const inlineCounterNode = this.querySelector(`#${this._componentId}-inline-counter`);
            const cardsContainer = this.querySelector('.tx-multi-cards-container');
            
            const hasItems = this._selectedState && this._selectedState.size > 0;
            
            // Toggle de modos de la vista principal
            if (this._inlineMode) {
                if (phNodeActive) phNodeActive.setAttribute('data-tx-state', 'hidden');
                if (phNodeReadonly) phNodeReadonly.setAttribute('data-tx-state', 'hidden');
                if (filledHeaderNode) filledHeaderNode.setAttribute('data-tx-state', 'hidden');
                if (inlineContainerNode) {
                    inlineContainerNode.setAttribute('data-tx-state', 'flex');
                    // Auto-focus de searchbar al transicionar a Inline abierto
                    if (inlineContainerNode.dataset.focused !== 'true') {
                        inlineContainerNode.dataset.focused = 'true';
                        setTimeout(() => {
                            const searchbar = inlineContainerNode.querySelector('ion-searchbar');
                            if (searchbar) searchbar.setFocus();
                        }, 100);
                    }
                }
                const totalItems = this._dataSource ? this._dataSource.length : 0;
                if (inlineCounterNode) inlineCounterNode.textContent = hasItems ? `${this._selectedState.size}/${totalItems}` : `0/${totalItems}`;
            } else {
                if (inlineContainerNode) {
                    inlineContainerNode.setAttribute('data-tx-state', 'hidden');
                    if (inlineContainerNode.dataset.focused) delete inlineContainerNode.dataset.focused;
                }
                if (hasItems) {
                    if (phNodeActive) phNodeActive.setAttribute('data-tx-state', 'hidden');
                    if (phNodeReadonly) phNodeReadonly.setAttribute('data-tx-state', 'hidden');
                    if (filledHeaderNode) {
                        filledHeaderNode.setAttribute('data-tx-state', 'flex');
                        const addBtn = filledHeaderNode.querySelector('ion-button');
                        if (addBtn) addBtn.style.display = this._isDisabled ? 'none' : 'block';
                    }
                } else {
                    if (phNodeActive) {
                        phNodeActive.setAttribute('data-tx-state', this._isDisabled ? 'hidden' : 'block');
                        phNodeActive.style.marginBottom = '4px';
                    }
                    if (phNodeReadonly) {
                        phNodeReadonly.setAttribute('data-tx-state', this._isDisabled ? 'block' : 'hidden');
                        phNodeReadonly.style.marginBottom = '4px';
                    }
                    if (filledHeaderNode) filledHeaderNode.setAttribute('data-tx-state', 'hidden');
                }
            }
            
            if (cardsContainer) {
                window.DOM.clear(cardsContainer);
                const iconName = this.getAttribute('icon-name') || 'extension-puzzle-outline';
                const iconColor = this.getAttribute('icon-color') || 'primary';
                
                if (hasItems) {
                    const validValues = this.getValidatedValue();
                    validValues.forEach(singleId => {
                        const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(singleId));
                        const titleText = found ? this._extractPayloadTitle(found) : singleId;
                        const lexicalId = found ? (found.lexical_id || found.id_numero || singleId) : singleId;
                        
                        let finalCardSub = this._resolveSubtitle(found, singleId);
                        finalCardSub = `${finalCardSub} • ${lexicalId}`;
                        
                        let avatarUrl = '';
                        if (found) {
                            if (found.Avatar) {
                                avatarUrl = Array.isArray(found.Avatar) ? (found.Avatar[0]?.url || '') : found.Avatar;
                            } else if (found.avatar) {
                                avatarUrl = found.avatar;
                            }
                        }
                        
                        const fakeItem = document.createElement('div');
                        fakeItem.innerHTML = this._getSharedCardTemplate({
                            iconName, iconColor, title: titleText, subtitle: finalCardSub, avatarUrl
                        });
                        
                        const finalNode = fakeItem.firstElementChild;
                        
                        finalNode.style.cursor = 'pointer';
                        finalNode.addEventListener('click', (ev) => {
                            if (ev.target.closest('ion-button')) return;
                            const targetEntity = this.getAttribute('target-entity') || this._entityName;
                            
                            let idToOpen = singleId;
                            if (typeof idToOpen === 'object' && idToOpen !== null) idToOpen = this._extractPayloadId(idToOpen);
                            idToOpen = String(idToOpen).trim();
                            
                            console.log("[TXSearchable] Click en multiCard. Abriendo:", { targetEntity, idToOpen, rawState: singleId });
                            
                            if (window.openEditForm && targetEntity && idToOpen && idToOpen !== 'undefined' && idToOpen !== 'null') {
                                window.openEditForm(idToOpen, targetEntity);
                            }
                        });

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
                                
                                this.dispatchSelection(true);
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
