// src/Engine_DB.js

/**
 * Engine_DB: Database Abstraction Layer for Google Sheets & Cloud NoSQL
 * Operates purely as a Facade Router.
 */

let _Adapter_Sheets;
let _Adapter_CloudDB;

if (typeof require !== 'undefined') {
    // Entorno Node (Jest)
    _Adapter_Sheets = require('./Adapter_Sheets');
    _Adapter_CloudDB = require('./Adapter_CloudDB');
} else {
    // Entorno Google Apps Script (Globales)
    _Adapter_Sheets = Adapter_Sheets;
    _Adapter_CloudDB = Adapter_CloudDB;
}

/**
 * _invalidateCache (Directiva Architect: Cache Busting)
 * Purga la RAM para forzar lectura fresca tras mutaciones.
 */
function _invalidateCache(entityName) {
    if (typeof CacheService === 'undefined') return;
    const cache = CacheService.getScriptCache();
    
    // Invalidación de lista principal
    cache.remove('CACHE_LIST_' + entityName);
    
    // Invalidación de lookups asociados
    const lookupMap = {
        'Portafolio': 'getPortafoliosOptions',
        'Grupo_Productos': 'getGruposProductosOptions',
        'Producto': 'getProductosOptions'
    };
    if (lookupMap[entityName]) {
        cache.remove('CACHE_LOOKUP_' + lookupMap[entityName]);
    }
    
    if (typeof Logger !== 'undefined') Logger.log(`[Cache] BUSTED para ${entityName}`);
}

const Engine_DB = {
    save: function (tableName, payload, config) {
        const results = { sheets: {}, cloud: {} };

        // Dispatch a Sheets Síncrono
        if (config.useSheets) {
            // No atrapamos el error aquí — dejamos que suba para que API_Universal_Router lo capture y
            // devuelva {status:'error'} correcto al frontend. Evita falsos positivos de "guardado con éxito".
            results.sheets = _Adapter_Sheets.upsert(tableName, payload, config);
        }


        // Dispatch a Cloud (Resiliencia Dual-Write: Catch Sync y Async)
        if (config.useCloudDB) {
            try {
                const cloudResult = _Adapter_CloudDB.upsert(tableName, payload, config);
                // Si es una promesa (Jest Mock / Nube Real Asíncrona), atrapar el rechazo
                if (cloudResult && typeof cloudResult.catch === 'function') {
                    results.cloud = { status: 'pending' };
                    cloudResult.catch(err => {
                        if (typeof Logger !== 'undefined') Logger.log("CloudDB Async Error: " + err.message);
                        results.cloud = { status: 'error', error: err.message };
                    });
                } else {
                    results.cloud = cloudResult;
                }
            } catch (err) {
                if (typeof Logger !== 'undefined') Logger.log("CloudDB Sync Error: " + err.message);
                results.cloud = { status: 'error', error: err.message };
            }
        }

        return results;
    },

    create: function (entityName, data) {
        Logger.log("Engine_DB_create_router: Routing " + entityName + " to Adapters.");
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
        const result = this.save(entityName, data, config);
        
        // Cache Busting
        _invalidateCache(entityName);
        
        return {
            success: true,
            Entity: entityName,
            adapter_results: result
        };
    },

    read: function (entityName, id) {
        // Lógica futura de enrutamiento READ (single record by ID)
    },

    /**
     * list(entityName, format)
     * Devuelve todos los registros de una entidad como { headers[], rows[] }.
     * Delega a Adapter_Sheets con CAPA DE CACHÉ (Directiva Architect).
     */
    list: function (entityName, format) {
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, SPREADSHEET_ID_DB: '' };
        
        // Intentar leer de RAM (CacheService)
        const cacheKey = 'CACHE_LIST_' + entityName;
        if (typeof CacheService !== 'undefined') {
            const cached = CacheService.getScriptCache().get(cacheKey);
            if (cached && format !== 'tuples') { // No cacheamos tuplas por ahora para evitar colisiones de formato
                Logger.log(`[Cache Engine] HIT para ${entityName}`);
                return JSON.parse(cached);
            }
        }

        Logger.log(`[Cache Engine] MISS para ${entityName}. Leyendo de DB...`);
        const result = _Adapter_Sheets.list(entityName, config, format);
        
        // Guardar en caché si no es formato tuplas (para simplificar)
        if (typeof CacheService !== 'undefined' && format !== 'tuples' && result) {
            CacheService.getScriptCache().put(cacheKey, JSON.stringify(result), 3600);
        }
        
        return result;
    },

    update: function (entityName, id, data) {
        Logger.log("Engine_DB_update_router: Routing " + entityName + " (ID: " + id + ") to Adapters.");
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
        const result = this.save(entityName, data, config);

        // Cache Busting
        _invalidateCache(entityName);

        return {
            success: true,
            Entity: entityName,
            adapter_results: result
        };
    },

    delete: function (entityName, id) {
        Logger.log("Engine_DB_delete_router: Routing " + entityName + " (ID: " + id + ") to Adapter_Sheets.remove.");
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
        let results = { sheets: {}, cloud: {} };
        if (config.useSheets) {
            results.sheets = _Adapter_Sheets.remove(entityName, id, config);
        }

        // Cache Busting
        _invalidateCache(entityName);

        return {
            success: true,
            Entity: entityName,
            adapter_results: results
        };
    }
};

if (typeof module !== 'undefined') {
    module.exports = Engine_DB;
}
