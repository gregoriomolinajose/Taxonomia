/**
 * UI_Factory_Searchables.client.js
 * 
 * E41: SRP Adapter Wrapper
 * Mantiene compatibilidad de FormRenderer y RelationBuilder encapsulando
 * las viejas firmas imperativas, y mapeándolas al nuevo Web Component PWA.
 */
(function (global) {
    global.UI_Factory = global.UI_Factory || {};

    const _buildBaseSearchable = function(fieldDef, isMulti, dataset = [], initialSelection, localEventBus, componentConfig = {}) {
        const node = document.createElement('tx-searchable');
        
        node.setAttribute('entity-name', fieldDef.label || fieldDef.targetEntity || 'Registro');
        if (fieldDef.targetEntity) {
            node.setAttribute('target-entity', fieldDef.targetEntity);
        }
        node.setAttribute('multiple', isMulti ? 'true' : 'false');
        
        if (componentConfig.iconName) node.setAttribute('icon-name', componentConfig.iconName);
        if (componentConfig.color) node.setAttribute('icon-color', componentConfig.color);
        if (componentConfig.contextId) node.setAttribute('context-id', componentConfig.contextId);
        
        // Atributos de Solo Lectura (Readonly / Disabled)
        if (fieldDef.readonly === true || componentConfig.readonly === true || fieldDef.disabled === true) {
            node.setAttribute('disabled', 'true');
        }
        
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
    global.UI_Factory.buildSearchableSingle = function(fieldDef, dataset = [], initialSelection, localEventBus, componentConfig = {}) {
        return _buildBaseSearchable(fieldDef, false, dataset, initialSelection, localEventBus, componentConfig);
    };

    /**
     * Reemplazo Oculto a Multi Searchable (Subgrid Falso)
     */
    global.UI_Factory.buildSearchableMulti = function(fieldDef, dataset = [], initialSelection, localEventBus, componentConfig = {}) {
        return _buildBaseSearchable(fieldDef, true, dataset, initialSelection, localEventBus, componentConfig);
    };

})(typeof window !== 'undefined' ? window : this);
