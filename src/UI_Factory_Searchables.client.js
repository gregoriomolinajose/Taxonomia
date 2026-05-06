/**
 * UI_Factory_Searchables.client.js
 * 
 * E41: SRP Adapter Wrapper
 * Mantiene compatibilidad de FormRenderer y RelationBuilder encapsulando
 * las viejas firmas imperativas, y mapeándolas al nuevo Web Component PWA.
 */
(function (global) {
    global.UI_Factory = global.UI_Factory || {};

    const _buildBaseSearchable = function(fieldDef, isMulti, dataset = [], initialSelection, localEventBus, visualTokens = {}) {
        const node = document.createElement('tx-searchable');
        
        node.setAttribute('entity-name', fieldDef.label || fieldDef.targetEntity || 'Registro');
        if (fieldDef.targetEntity) {
            node.setAttribute('target-entity', fieldDef.targetEntity);
        }
        node.setAttribute('multiple', isMulti ? 'true' : 'false');
        
        if (visualTokens.iconName) node.setAttribute('icon-name', visualTokens.iconName);
        if (visualTokens.color) node.setAttribute('icon-color', visualTokens.color);
        
        // Atributos de Extracción de Payload Dinámico (Esquema estricto)
        if (fieldDef.valueField) node.setAttribute('value-field', fieldDef.valueField);
        if (fieldDef.labelField) node.setAttribute('label-field', fieldDef.labelField);
        if (fieldDef.subtitleField) node.setAttribute('subtitle-field', fieldDef.subtitleField);
        if (fieldDef.subtitleLookup) node.setAttribute('subtitle-lookup', fieldDef.subtitleLookup);

        // Límites S41.9 (De metadata o local)
        const maxSelection = fieldDef.maxSelection || (fieldDef.metadata && fieldDef.metadata.maxItems);
        if (isMulti && maxSelection) {
            node.setAttribute('max-selection', String(maxSelection));
        }
        
        // CSS Legacy compat 
        node.setAttribute(isMulti ? 'data-searchable-multi' : 'data-searchable-single', fieldDef.name);
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
            node.dispatchEvent(new CustomEvent('ionChange', { detail: { value: e.detail.value } }));
            
            if (localEventBus && typeof localEventBus.publish === 'function') {
                const evtName = isMulti ? 'MULTISELECT_CHANGED' : 'SINGLESELECT_CHANGED';
                localEventBus.publish(evtName, { fieldName: fieldDef.name, value: e.detail.value });
            }
        });

        return node;
    };

    /**
     * Reemplazo Oculto a Single Searchable
     */
    global.UI_Factory.buildSearchableSingle = function(fieldDef, dataset = [], initialSelection, localEventBus, visualTokens = {}) {
        return _buildBaseSearchable(fieldDef, false, dataset, initialSelection, localEventBus, visualTokens);
    };

    /**
     * Reemplazo Oculto a Multi Searchable (Subgrid Falso)
     */
    global.UI_Factory.buildSearchableMulti = function(fieldDef, dataset = [], initialSelection, localEventBus, visualTokens = {}) {
        return _buildBaseSearchable(fieldDef, true, dataset, initialSelection, localEventBus, visualTokens);
    };

})(typeof window !== 'undefined' ? window : this);
