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
        return item.nombre || item.label || item.descripcion || item.title || 'Desconocido';
    }

    _extractPayloadId(item) {
        return item.id_registro || item.id_numero || item.id || item.codigo || item;
    }

    // ===============================================
    // 1. API Contract / Declarative Attributes
    // ===============================================
    static get observedAttributes() {
        return ['entity-name', 'multiple', 'pre-selected', 'disabled'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue === newValue) return;

        switch(name) {
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
                // CSS hook for disablement
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
        const trigger = this.querySelector('.trigger-container');
        if (trigger && !this._triggerBound) {
            trigger.addEventListener('click', () => {
                if (this._temporaryBlurFlag) return;
                this.executeSearchAndOpen();
            });
            this._triggerBound = true;
        }
    }

    connectedCallback() {
        if (!this._componentId) {
            this._componentId = 'tx-searchable-' + Math.random().toString(36).substr(2, 9);
        }

        if (!this.innerHTML.trim()) {
            this.innerHTML = `
                <div class="tx-searchable-root" style="width: 100%; position: relative;">
                    <!-- S41.2: Trigger Container -->
                    <div class="trigger-container" style="position: relative; cursor: pointer; display: block; width: 100%;">
                        <ion-input 
                            id="${this._componentId}-input"
                            class="tx-search-input"
                            label="Seleccionar ${this._entityName}" 
                            label-placement="floating" 
                            fill="outline"
                            readonly="true"
                            style="cursor: pointer; --padding-end: 35px;"
                            placeholder="Toca para seleccionar..."
                        ></ion-input>
                        
                        <!-- S41.2: Lupa Overlay -->
                        <div style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--ion-color-medium, gray); z-index: 2; display: flex; align-items: center;">
                            <ion-icon name="search-outline" style="font-size: 20px;"></ion-icon>
                        </div>
                    </div>
                    <!-- Node Anchors for overlays -->
                    <div id="${this._componentId}-overlay-anchor" style="position: absolute; width: 100%; bottom: 0;"></div>
                </div>
            `;
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
                return found ? this._extractPayloadTitle(found) : singleId;
            }
            return `${this._selectedState.size} ítem(s) seleccionado(s)`;
        }
        
        // Single Mode
        const rawId = this._selectedState;
        const found = this._dataSource.find(item => String(this._extractPayloadId(item)) === String(rawId));
        return found ? this._extractPayloadTitle(found) : rawId;
    }

    // ===============================================
    // 6. Overlay Sub-Engine (Popovers / Modals)
    // ===============================================
    executeSearchAndOpen() {
        if (this._overlayNode) return; // Prevent double-tap spawning

        const isMob = this.isMobile();
        const baseHtml = `
            <ion-header>
                ${isMob ? `
                <ion-toolbar>
                    <ion-title>Buscar ${this._entityName}</ion-title>
                    <ion-buttons slot="end">
                        <ion-button id="${this._componentId}-btn-close">Cerrar</ion-button>
                    </ion-buttons>
                </ion-toolbar>
                ` : ''}
                <ion-toolbar>
                    <ion-searchbar id="${this._componentId}-searchbar" placeholder="Escribe para buscar..."></ion-searchbar>
                </ion-toolbar>
                ${this._isMultiple ? `
                <ion-toolbar>
                    <ion-button expand="block" id="${this._componentId}-btn-apply">Aplicar Selección</ion-button>
                </ion-toolbar>
                ` : ''}
            </ion-header>
            <ion-content>
                <div style="text-align:center; padding: 15px;" id="${this._componentId}-spinner">
                    <ion-spinner></ion-spinner>
                </div>
                <ion-list id="${this._componentId}-list"></ion-list>
            </ion-content>
        `;

        if (isMob) {
            const modal = document.createElement('ion-modal');
            modal.initialBreakpoint = 0.5;
            modal.breakpoints = [0, 0.5, 0.85, 1];
            modal.innerHTML = baseHtml;
            document.body.appendChild(modal);
            this._overlayNode = modal;
        } else {
            const popover = document.createElement('ion-popover');
            popover.trigger = `${this._componentId}-input`;
            popover.size = "cover";
            popover.innerHTML = baseHtml;
            document.body.appendChild(popover);
            this._overlayNode = popover;
        }

        // Link Dismiss Events to Anti-Race Engine
        if (isMob) {
            this._overlayNode.addEventListener('ionModalDidDismiss', () => this._cleanupOverlay());
        } else {
            this._overlayNode.addEventListener('ionPopoverDidDismiss', () => this._cleanupOverlay());
        }
        
        this._overlayNode.present().then(() => {
            this._bindOverlayInternalEvents();
            this.buildListItems(); // Dibujar el Pool Inicial
            
            // Auto Focus
            const searchbar = this._overlayNode.querySelector('ion-searchbar');
            if (searchbar) {
                setTimeout(() => searchbar.setFocus(), 150);
            }
        });
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
                this.buildListItems(query);
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
            filtered = filtered.filter(item => this._extractPayloadTitle(item).toLowerCase().includes(query.trim()));
        }
        filtered = filtered.slice(0, 100);

        listNode.innerHTML = ''; // Fast Clear
        
        filtered.forEach(item => {
            const idVal = String(this._extractPayloadId(item));
            const title = this._extractPayloadTitle(item);
            const el = document.createElement('ion-item');
            el.button = true;

            if (this._isMultiple) {
                const isChecked = this._selectedState.has(idVal);
                el.innerHTML = `
                    <ion-label>${title}</ion-label>
                    <ion-checkbox slot="end" ${isChecked ? 'checked="true"' : ''}></ion-checkbox>
                `;
                el.addEventListener('click', (e) => {
                    e.preventDefault(); // Evitar doble evento de Ion-Checkbox
                    const checkbox = el.querySelector('ion-checkbox');
                    if (this._selectedState.has(idVal)) {
                        this._selectedState.delete(idVal);
                        checkbox.checked = false;
                    } else {
                        this._selectedState.add(idVal);
                        checkbox.checked = true;
                    }
                    this._scheduleRender(); // Reflejar cuenta externamente
                });
            } else {
                const isSelected = String(this._selectedState) === idVal;
                el.innerHTML = `
                    <ion-label>${title}</ion-label>
                    ${isSelected ? '<ion-icon name="checkmark-outline" slot="end" color="primary"></ion-icon>' : ''}
                `;
                el.addEventListener('click', () => {
                    this._selectedState = idVal;
                    this._scheduleRender();
                    this.dispatchSelection(); // Disparo automático inmediato si es Single
                    this._overlayNode.dismiss();
                });
            }
            listNode.appendChild(el);
        });

        if (filtered.length === 0) {
            listNode.innerHTML = `<ion-item><ion-label color="medium">No se encontraron resultados</ion-label></ion-item>`;
        }
    }

    _render() {
        this._rafId = null; // Liberar pointer al arrancar dibujado
        
        const inputBase = this.querySelector('ion-input.tx-search-input');
        if (inputBase) {
            const displ = this._getDisplayValue();
            inputBase.value = displ;
            
            // Ajustar Label color para que se vea activo (Formato Ionic custom)
            if (displ) {
                inputBase.classList.add('ion-valid');
            } else {
                inputBase.classList.remove('ion-valid');
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
