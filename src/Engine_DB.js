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
        'Producto': 'getProductosOptions',
        'Unidad_Negocio': 'getUnidadesNegocioOptions',
        'Equipo': 'getEquiposOptions'
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

    /**
     * orchestrateNestedSave: Maneja transacciones Maestro-Detalle (Regla 15).
     * 1. Desempaqueta hijos del payload.
     * 2. Guarda Padre.
     * 3. Inyecta FK en Hijos.
     * 4. Guarda Hijos masivamente.
     */
    orchestrateNestedSave: function (entityName, payload, config) {
        const nestedData = {};
        const flatPayload = { ...payload };

        // Paso A: Desempaquetado basado en esquema
        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
        if (schema) {
            const fields = schema.fields || (typeof schema === 'object' ? Object.keys(schema).map(k => ({ name: k, ...schema[k] })) : []);
            fields.forEach(f => {
                if (f.type === 'relation' && Array.isArray(payload[f.name])) {
                    nestedData[f.name] = payload[f.name];
                    delete flatPayload[f.name];
                }
            });
        }

        // Paso B: Transacción Padre
        const parentResults = this.save(entityName, flatPayload, config);
        
        // Determinar la PK del padre (asumimos que viene en el payload ya que es client-side generated)
        // O la extraemos del resultado del adapter
        const parentIdField = Object.keys(flatPayload).find(k => k.startsWith('id_'));
        const parentPK = flatPayload[parentIdField];

        // Paso C y D: Inyección de FK y Transacción Hijos
        if (schema) {
            const fields = schema.fields || (typeof schema === 'object' ? Object.keys(schema).map(k => ({ name: k, ...schema[k] })) : []);
            fields.forEach(f => {
                if (f.type === 'relation' && nestedData[f.name]) {
                    const children = nestedData[f.name];
                    const targetEntity = f.targetEntity;
                    const fkField = f.foreignKey;

                    // --- RECONCILIACIÓN (DIFFING) ---
                    // Paso A: Buscar hijos huérfanos antes de actualizar
                    const currentInDB = _Adapter_Sheets.list(targetEntity, config, 'objects') || { rows: [] };
                    const orphanMatches = (currentInDB.rows || []).filter(c => c[fkField] == parentPK);
                    
                    // Paso B: Determinar cuáles ya no están en el nuevo payload
                    const tableKey = targetEntity.toLowerCase();
                    const singularKey = tableKey.endsWith('s') ? tableKey.slice(0, -1) : (tableKey.endsWith('es') ? tableKey.slice(0, -2) : tableKey);
                    const pkField = 'id_' + singularKey;
                    
                    const incomingIds = children.map(c => String(c[pkField] || ''));
                    const orphans = orphanMatches.filter(c => c && !incomingIds.includes(String(c[pkField] || '')));

                    if (orphans.length > 0) {
                        Logger.log(`[Diffing] Detectados ${orphans.length} huérfanos para desvincular.`);
                        orphans.forEach(o => o[fkField] = ""); // Desvincular físicamente
                        _Adapter_Sheets.upsertBatch(targetEntity, orphans, config);
                    }

                    // Inyectar FK
                    children.forEach(child => {
                        child[fkField] = parentPK;
                        
                        // Si el registro es nuevo (no tiene PK), generarla
                        if (!child[pkField]) {
                            const prefix = targetEntity.substring(0, 4).toUpperCase();
                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                            let suffix = '';
                            for (let i = 0; i < 5; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
                            child[pkField] = `${prefix}-${suffix}`;
                        }
                    });

                    // Guardar masivamente (Batch)
                    if (config.useSheets) {
                        _Adapter_Sheets.upsertBatch(targetEntity, children, config);
                    }
                    if (config.useCloudDB) {
                        // Omitido para brevedad o implementado si el adapter soporta batch
                    }
                    
                    // IMPORTANTE: Invalidar Backend Cache del hijo recién modificado en el Subgrid
                    _invalidateCache(targetEntity);
                }
            });
        }

        return parentResults;
    },

    create: function (entityName, data) {
        Logger.log("Engine_DB_create_router: Routing " + entityName + " with Orchestration.");
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
        
        // Usar orquestador para manejar posibles relaciones anidadas
        const result = this.orchestrateNestedSave(entityName, data, config);
        
        // Cache Busting
        _invalidateCache(entityName);
        
        return {
            success: true,
            adapter_results: result
        };
    },

    upsertBatch: function (tableName, items, config) {
        if (!Array.isArray(items) || items.length === 0) return { status: 'success', count: 0 };
        const results = items.map(item => this.save(tableName, item, config)); // Changed from this.upsert to this.save
        return { status: 'success', count: results.length, details: results };
    },

    read: function (entityName, id) {
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true };
        const results = _Adapter_Sheets.list(entityName, config, 'objects');
        const pkField = 'id_' + entityName.toLowerCase().replace(/s$/, '');
        return results.rows.find(r => r[pkField] == id || r['id_' + entityName.toLowerCase()] == id);
    },

    /**
     * readFull: Lee un registro e hidrata sus relaciones (Regla 15).
     */
    readFull: function (entityName, id) {
        const mainRecord = this.read(entityName, id);
        if (!mainRecord) return null;

        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
        if (schema) {
            const fields = schema.fields || (typeof schema === 'object' ? Object.keys(schema).map(k => ({ name: k, ...schema[k] })) : []);
            fields.forEach(f => {
                if (f.type === 'relation') {
                    const targetEntity = f.targetEntity;
                    const fkField = f.foreignKey;
                    
                    // Buscar hijos en la tabla destino
                    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true };
                    const allChildren = _Adapter_Sheets.list(targetEntity, config, 'objects');
                    
                    // Filtrar por FK
                    const matches = allChildren.rows.filter(child => child[fkField] == id);
                    mainRecord[f.name] = matches;
                    
                    if (typeof Logger !== 'undefined') {
                        Logger.log(`[Engine_DB.readFull] Hydrated ${matches.length} matches into ${f.name} for ID ${id}`);
                    }
                }
            });
        }

        return mainRecord;
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
        Logger.log("Engine_DB_update_router: Routing " + entityName + " (ID: " + id + ") with Orchestration.");
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
        
        // Usar orquestador para manejar posibles relaciones anidadas
        const result = this.orchestrateNestedSave(entityName, data, config);

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
