/**
 * mockFactory.js
 * Central fixture generator para Vitest UI Testing (Taxonomia SPA)
 */

export function injectAppSchemasMock(schemas) {
    if (!window.APP_SCHEMAS) {
        window.APP_SCHEMAS = {};
    }
    Object.assign(window.APP_SCHEMAS, schemas);
    
    // Regenerar ENTITY_META derivado as per JS_Core
    window.ENTITY_META = Object.keys(window.APP_SCHEMAS).reduce((acc, key) => {
        if (key !== '_UI_CONFIG' && window.APP_SCHEMAS[key].metadata) {
            acc[key] = window.APP_SCHEMAS[key].metadata;
        }
        return acc;
    }, {});
}

export function populateAppCache(entityName, dataArray) {
    if (!window.__APP_CACHE__) {
        window.__APP_CACHE__ = {};
    }
    window.__APP_CACHE__[entityName] = dataArray;
    
    // Si DataViewEngine existe, forzamos su estado interno (usado por FormEngine_UI)
    if (window.DataViewEngine && typeof window.DataViewEngine._forceState === 'function') {
        const metadata = window.ENTITY_META ? window.ENTITY_META[entityName] : { idField: 'id' };
        window.DataViewEngine._forceState({
            entityName: entityName,
            entityMeta: metadata,
            data: dataArray
        });
    } else if (window.DataViewEngine) {
        // Mock fallback if DataViewEngine exists but has no backdoor
        window.DataViewEngine._getState = () => ({
            entityName: entityName,
            entityMeta: window.ENTITY_META ? window.ENTITY_META[entityName] : { idField: 'id' },
            data: dataArray
        });
    }
}

export function createBasicMockSchema(entityName, fields = []) {
    return {
        [entityName]: {
            metadata: { idField: 'id', titleField: 'name' },
            fields: fields
        }
    };
}
