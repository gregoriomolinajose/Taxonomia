/**
 * UI_Factory_Searchables.client.js
 * 
 * E41: SRP Adapter Wrapper
 * Mantiene compatibilidad de FormRenderer y RelationBuilder encapsulando
 * las viejas firmas imperativas, y mapeándolas al nuevo Web Component PWA.
 */
(function (global) {
    global.UI_Factory = global.UI_Factory || {};

    /**
     * Reemplazo Oculto a Single Searchable
     */
    global.UI_Factory.buildSearchableSingle = function(fieldDef, dataset = [], initialSelection, localEventBus, visualTokens = {}) {
        const node = document.createElement('tx-searchable');
        
        node.setAttribute('entity-name', fieldDef.targetEntity || fieldDef.label || 'Registro');
        node.setAttribute('multiple', 'false');
        
        // CSS Legacy compat 
        node.setAttribute('data-searchable-single', fieldDef.name);
        node.setAttribute('data-form-component', fieldDef.name);
        node.style.width = '100%';
        
        // Carga Inicial
        if (initialSelection !== null && initialSelection !== undefined) {
            node.setAttribute('pre-selected', typeof initialSelection === 'object' ? JSON.stringify(initialSelection) : String(initialSelection));
        }

        // Bridge de Memoria Directa
        node.dataSource = dataset || [];

        // Bridge Legacy Contract (API H14 Fix para RelationBuilder)
        node.updateConfig = function(newData, disabledState, placeholderText) {
            this.dataSource = newData || [];
            if (disabledState === true) {
                this.setAttribute('disabled', 'true');
            } else if (disabledState === false) {
                this.removeAttribute('disabled');
            }
        };

        // Retransmisión al motor del ABAC Form
        node.addEventListener('txChange', (e) => {
            // Emular evento nativo ionChange para FormRenderer base validators
            node.dispatchEvent(new CustomEvent('ionChange', { detail: { value: e.detail.value } }));
            
            if (localEventBus && typeof localEventBus.publish === 'function') {
                localEventBus.publish('SINGLESELECT_CHANGED', { fieldName: fieldDef.name, value: e.detail.value });
            }
        });

        return node;
    };

    /**
     * Reemplazo Oculto a Multi Searchable (Subgrid Falso)
     */
    global.UI_Factory.buildSearchableMulti = function(fieldDef, dataset = [], initialSelection, localEventBus) {
        const node = document.createElement('tx-searchable');
        
        node.setAttribute('entity-name', fieldDef.targetEntity || fieldDef.label || 'Múltiples Registros');
        node.setAttribute('multiple', 'true');
        
        // CSS Legacy compat
        node.setAttribute('data-searchable-multi', fieldDef.name);
        node.setAttribute('data-form-component', fieldDef.name);
        node.style.width = '100%';
        
        // Carga Inicial
        if (initialSelection !== null && initialSelection !== undefined) {
            node.setAttribute('pre-selected', typeof initialSelection === 'object' ? JSON.stringify(initialSelection) : String(initialSelection));
        }

        // Bridge de Memoria Directa
        node.dataSource = dataset || [];

        // Bridge Legacy Contract (API H14 Fix para RelationBuilder)
        node.updateConfig = function(newData, disabledState, placeholderText) {
            this.dataSource = newData || [];
            if (disabledState === true) {
                this.setAttribute('disabled', 'true');
            } else if (disabledState === false) {
                this.removeAttribute('disabled');
            }
        };

        // Retransmisión al motor del ABAC Form
        node.addEventListener('txChange', (e) => {
            if (localEventBus && typeof localEventBus.publish === 'function') {
                localEventBus.publish('MULTISELECT_CHANGED', { fieldName: fieldDef.name, value: e.detail.value });
            }
        });

        // La lectura ya ocurre naturalmente usando node.getValidatedValue() desde el Web Component
        return node;
    };

})(typeof window !== 'undefined' ? window : this);
