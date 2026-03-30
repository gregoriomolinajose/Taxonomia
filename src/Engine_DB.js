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

/**
 * [S5.4 Quality] Dependency Injection: Matrix Provider
 * Desacopla la lógica topológica de la API nativa de Google Sheets para posibilitar Tests locales (Jest).
 */
const SheetMatrixIO = {
    readRelacionDominios: function(config) {
        if (typeof SpreadsheetApp === 'undefined') return { sheet: null, data: [] };
        const ssStr = (config && config.SPREADSHEET_ID_DB) ? config.SPREADSHEET_ID_DB : (typeof CONFIG !== 'undefined' ? CONFIG.SPREADSHEET_ID_DB : null);
        if (!ssStr) return { sheet: null, data: [] };
        const ss = SpreadsheetApp.openById(ssStr);
        const relSheet = ss.getSheetByName("Relacion_Dominios");
        if (!relSheet) return { sheet: null, data: [] };
        return { sheet: relSheet, data: relSheet.getDataRange().getValues() };
    },
    writeBulk: function(sheet, data, headersLength) {
        if (sheet && typeof SpreadsheetApp !== 'undefined') sheet.getRange(1, 1, data.length, headersLength).setValues(data);
    },
    writeRow: function(sheet, rowNum, rowData, headersLength) {
        if (sheet && typeof SpreadsheetApp !== 'undefined') sheet.getRange(rowNum, 1, 1, headersLength).setValues([rowData]);
    },
    appendRow: function(sheet, rowData) {
        if (sheet && typeof SpreadsheetApp !== 'undefined') sheet.appendRow(rowData);
    }
};

/**
 * _updateGraphEdges (S5.3)
 * Orquesta transacciones SCD-2 interrumpiendo el flujo plano para poblar el Grafo Temporal.
 */
function _updateGraphEdges(childId, newParentId, config) {
    newParentId = (newParentId === "NULL" || !newParentId) ? "" : String(newParentId).trim();

    const io = SheetMatrixIO.readRelacionDominios(config);
    let data = io.data;
    if (data.length === 0) return;
    
    const headers = data[0];
    const idxHid = headers.indexOf("id_nodo_hijo");
    const idxPid = headers.indexOf("id_nodo_padre");
    const idxHasta = headers.indexOf("valido_hasta");
    const idxActual = headers.indexOf("es_version_actual");
    const idxUpdated = headers.indexOf("updated_at");
    
    let currentActiveIdx = -1;
    let oldParentId = "";
    
    for (let i = 1; i < data.length; i++) {
        if (data[i][idxHid] === childId && data[i][idxActual] === true) {
            currentActiveIdx = i;
            oldParentId = data[i][idxPid];
            break;
        }
    }
    
    if (currentActiveIdx !== -1 && oldParentId === newParentId) return; 
    
    const sysDate = new Date().toISOString();
    
    // Soft-Expire Old Edge (SCD-2)
    if (currentActiveIdx !== -1) {
        data[currentActiveIdx][idxHasta] = sysDate;
        data[currentActiveIdx][idxActual] = false;
        data[currentActiveIdx][idxUpdated] = sysDate;
        
        SheetMatrixIO.writeRow(io.sheet, currentActiveIdx + 1, data[currentActiveIdx], headers.length);
        if (typeof Logger !== 'undefined') Logger.log(`[DAG] Caducada arista vieja para hijo ${childId} (padre previo: ${oldParentId})`);
    }
    
    // Spawn Active Edge
    if (newParentId !== "") {
        let rID = "RELA-" + Utilities.getUuid().substring(0, 8).toUpperCase(); // [S5.4 Quality] Collision hardening
        let newEdge = [];
        for (let i = 0; i < headers.length; i++) {
            let h = headers[i];
            if (h === "id_relacion") newEdge.push(rID);
            else if (h === "id_nodo_padre") newEdge.push(newParentId);
            else if (h === "id_nodo_hijo") newEdge.push(childId);
            else if (h === "tipo_relacion") newEdge.push("Militar_Directa");
            else if (h === "peso_influencia") newEdge.push(1);
            else if (h === "valido_desde") newEdge.push(sysDate);
            else if (h === "valido_hasta") newEdge.push("");
            else if (h === "es_version_actual") newEdge.push(true);
            else if (h === "created_at") newEdge.push(sysDate);
            else if (h === "created_by") newEdge.push("DAG_SETTER");
            else newEdge.push("");
        }
        SheetMatrixIO.appendRow(io.sheet, newEdge);
        if (typeof Logger !== 'undefined') Logger.log(`[DAG] Arista nueva instanciada: ${newParentId} -> ${childId}`);
    }
    
    _invalidateCache("Relacion_Dominios");
}

/**
 * _flattenGraphNode (S5.4)
 * O(1) Bulk RAM Push para curar Grafos Temporales ante Deletes.
 */
function _flattenGraphNode(nodeIdToDelete, config) {
    const io = SheetMatrixIO.readRelacionDominios(config);
    let data = io.data;
    if (data.length <= 1) return;
    
    const headers = data[0];
    const idxHid = headers.indexOf("id_nodo_hijo");
    const idxPid = headers.indexOf("id_nodo_padre");
    const idxHasta = headers.indexOf("valido_hasta");
    const idxActual = headers.indexOf("es_version_actual");
    const idxUpdated = headers.indexOf("updated_at");
    
    const sysDate = new Date().toISOString();
    
    let abueloId = null;
    let aristaSuperiorIdx = -1;
    let tieneCambios = false;
    
    // 1. Extraer Arista Superior (Mapeo de Abuelo)
    for (let i = 1; i < data.length; i++) {
        if (data[i][idxHid] === nodeIdToDelete && data[i][idxActual] === true) {
            abueloId = data[i][idxPid];
            aristaSuperiorIdx = i;
            break;
        }
    }
    
    // Caducar Arista Superior SCD-2
    if (aristaSuperiorIdx !== -1) {
        data[aristaSuperiorIdx][idxHasta] = sysDate;
        data[aristaSuperiorIdx][idxActual] = false;
        data[aristaSuperiorIdx][idxUpdated] = sysDate;
        tieneCambios = true;
        if (typeof Logger !== 'undefined') Logger.log(`[DAG Flatten] Edge Superior (hacia Abuelo ${abueloId}) caducado.`);
    }
    
    // 2. Extraer Aristas Inferiores (Mapeo de Nietos)
    let nietos = [];
    for (let i = 1; i < data.length; i++) {
        if (data[i][idxPid] === nodeIdToDelete && data[i][idxActual] === true) {
            data[i][idxHasta] = sysDate;
            data[i][idxActual] = false;
            data[i][idxUpdated] = sysDate;
            nietos.push(data[i][idxHid]);
            tieneCambios = true;
        }
    }
    
    if (nietos.length > 0) {
        if (typeof Logger !== 'undefined') Logger.log(`[DAG Flatten] Identificados ${nietos.length} nietos huérfanos. Formulando Saneamiento...`);
    }

    // 3. Reasignar Descendientes (Si Abuelo existe)
    // [S5.4 Quality] Strict truthiness coercion 
    if (abueloId !== null && abueloId !== "" && nietos.length > 0) {
        nietos.forEach(nietoId => {
            let rID = "RELA-" + Utilities.getUuid().substring(0, 8).toUpperCase();
            let newEdge = [];
            for (let j = 0; j < headers.length; j++) {
                let h = headers[j];
                if (h === "id_relacion") newEdge.push(rID);
                else if (h === "id_nodo_padre") newEdge.push(abueloId);
                else if (h === "id_nodo_hijo") newEdge.push(nietoId);
                else if (h === "tipo_relacion") newEdge.push("Militar_Directa");
                else if (h === "peso_influencia") newEdge.push(1);
                else if (h === "valido_desde") newEdge.push(sysDate);
                else if (h === "valido_hasta") newEdge.push("");
                else if (h === "es_version_actual") newEdge.push(true);
                else if (h === "created_at") newEdge.push(sysDate);
                else if (h === "created_by") newEdge.push("DAG_CASCADE_FLATTEN");
                else newEdge.push("");
            }
            data.push(newEdge);
            tieneCambios = true;
        });
        if (typeof Logger !== 'undefined') Logger.log(`[DAG Flatten] Nietos re-anclados exitosamente al Abuelo ${abueloId}.`);
    } else if ((abueloId === null || abueloId === "") && nietos.length > 0) {
         // Edge Case: Root Node Deletion
         if (typeof Logger !== 'undefined') Logger.log(`[DAG Flatten] Root Node Exception: Nodo eliminado no poseía Abuelo (Nivel 0). Promoviendo ${nietos.length} nietos a Nodos Raíz.`);
    }
    
    // 4. BULK OPS IMPERATIVE: Volcado Íntegro
    if (tieneCambios) {
        SheetMatrixIO.writeBulk(io.sheet, data, headers.length);
        if (typeof Logger !== 'undefined') Logger.log(`[DAG Flatten] O(1) Bulk RAM Push ejecutado. Arrays Volcados: ${data.length}`);
        _invalidateCache("Relacion_Dominios");
    }
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

        // [S5.6] Dynamic DAG Subgrid takes over Transient Edge
        // transientParentId y _updateGraphEdges ya no se usan porque la topología
        // se administra directamente mediante subgrids hacia Relacion_Dominios.

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
        
        // Determinar la PK extrayéndola del flatPayload
        const parentIdField = Object.keys(flatPayload).find(k => k.startsWith('id_')) || "id_dominio";
        const parentPK = flatPayload[parentIdField];

        // [S5.6] Legacy Graph Edge SCD-2 Orchestrator eliminado (Delegado al bloque de relaciones)

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
                    let orphansToProcess = [];

                    // [S6.1] Config-Driven Delegation to Engine_Graph
                    if (f.isTemporalGraph) {
                        if (typeof Engine_Graph !== 'undefined') {
                            // [S8.2] Backend Enforcer - Validate Topology 
                            const topologyRules = (typeof getEntityTopologyRules !== 'undefined') 
                                                    ? getEntityTopologyRules(entityName) // Entity name of the parent being configured
                                                    : { preventCycles: false, maxDepth: 0, siblingCollisionCheck: false };
                            const fullGraph = _Adapter_Sheets.list(f.graphEntity, config, 'objects').rows || [];
                            Engine_Graph.validateTopology(children, fullGraph, topologyRules);

                            // [S8.3] Backend Enforcer - Capture Re-parented nodes to expire them gracefully
                            const stolenEdges = Engine_Graph.getReParentingEdges(children, fullGraph, topologyRules);

                            // En SR-Strategy delegamos que el motor calcule y devuelva los edge que se deben cerrar
                            const normalClose = Engine_Graph.patchSCD2Edges(children, orphanMatches, f.topology) || [];
                            const stealClose = Engine_Graph.patchSCD2Edges([], stolenEdges, f.topology) || [];
                            
                            orphansToProcess = normalClose.concat(stealClose);
                        } else {
                            if (typeof Logger !== 'undefined') Logger.log(`[ERROR] Engine_Graph no encontrado para resolver topología ${f.topology}.`);
                        }
                    } else {
                        // Standard Unlink para 1:N no temporal
                        orphansToProcess = orphanMatches.filter(c => c && !incomingIds.includes(String(c[pkField] || '')));
                        if (orphansToProcess.length > 0) {
                            orphansToProcess.forEach(o => o[fkField] = ""); // Desvincular físicamente
                        }
                    }

                    if (orphansToProcess.length > 0) {
                        if (typeof Logger !== 'undefined') Logger.log(`[Diffing] Detectados ${orphansToProcess.length} huérfanos para desvincular.`);
                        _Adapter_Sheets.upsertBatch(targetEntity, orphansToProcess, config);
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
        
        // [S5.4] Cascade Flattening Hook (Tree Node Orphans Relocation)
        if (entityName === "Dominio") {
            _flattenGraphNode(id, config);
        }

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
