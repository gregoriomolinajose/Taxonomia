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
                    if (this._isMultiple) {
                        this._selectedState = new Set(Array.isArray(parsed) ? parsed.map(c => typeof c === 'string' ? c : (c.id_registro || c.id)) : []);
                    } else {
                        // SCD-2 Hydration check fallback seguro
                        this._selectedState = Array.isArray(parsed) && parsed.length > 0 
                            ? (typeof parsed[0] === 'string' ? parsed[0] : (parsed[0].id_registro || parsed[0].id)) 
                            : (typeof parsed === 'string' ? parsed : (parsed.id_registro || parsed.id));
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
    connectedCallback() {
        if (!this.innerHTML.trim()) {
            this.innerHTML = `
                <div class="tx-searchable-wrapper" style="width: 100%; position: relative; border: 1px dashed var(--ion-color-medium, #ccc); padding: 8px; border-radius: 4px;">
                    <span style="font-size:12px; color:gray;">[TX-Searchable ${this._entityName} / Mode: ${this._isMultiple ? 'Multi' : 'Single'}] Layout Inicializando...</span>
                </div>
            `;
        }
        this._scheduleRender();
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
        if (this._popoverNode) {
            this._popoverNode.remove();
            this._popoverNode = null;
        }
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

    _render() {
        this._rafId = null; // Liberar pointer al arrancar dibujado
        // [S41.2 Target Placeholder] 
        // Aquí se incrustará el Motor DOM Híbrido.
        const wrapper = this.querySelector('.tx-searchable-wrapper');
        if (wrapper) {
            const count = this._dataSource ? this._dataSource.length : 0;
            wrapper.innerHTML = `
                <span style="font-size:12px; color:gray;">
                   [TX-Searchable ${this._entityName} / Mode: ${this._isMultiple ? 'Multi' : 'Single'} / Pool: ${count} recs / Sel: ${JSON.stringify(this.getValidatedValue())}]
                </span>
            `;
        }
    }
}

// Registrar Elemento globalmente si estamos en Front-End Context
if (typeof window !== 'undefined' && typeof window.customElements !== 'undefined') {
    if (!window.customElements.get('tx-searchable')) {
        window.customElements.define('tx-searchable', TXSearchable);
    }
}
