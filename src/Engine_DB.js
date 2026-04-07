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
            else if (h === "tipo_relacion") newEdge.push("SCD2_EDGE");
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
        let precalculatedGraphContext = {};

        // [S5.6] Dynamic DAG Subgrid takes over Transient Edge
        // transientParentId y _updateGraphEdges ya no se usan porque la topología
        // se administra directamente mediante subgrids hacia Relacion_Dominios.

        // Paso A: Desempaquetado basado en esquema
        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
        if (schema) {
            const fields = schema.fields || (typeof schema === 'object' ? Object.keys(schema).map(k => ({ name: k, ...schema[k] })) : []);
            fields.forEach(f => {
                if (f.type === 'relation' && payload[f.name] !== undefined) {
                    let relData = payload[f.name];
                    
                    // Normalización de escalares provenientes de uiComponent: 'select_single'
                    if (!Array.isArray(relData)) {
                        // Empaquetamos el string crudo en un array de objetos compatible con el motor de grafos
                        relData = (relData && String(relData).trim() !== "") ? [{ id_registro: String(relData).trim() }] : [];
                    } else {
                        // [RAI-DEBUG/S-Tier Fix]: Normalizar arreglos de primitivos (ej. ["ID1"]) generados por subgrids
                        relData = relData.map(item => {
                            if (typeof item === 'string' || typeof item === 'number') {
                                return { id_registro: String(item).trim() };
                            }
                            return item;
                        });
                    }
                    
                    nestedData[f.name] = relData;
                    delete flatPayload[f.name];
                }
            });

            // Paso A.1: Pre-Validación Topológica Atómica (Evita Padre Huérfano)
            const parentIdField = Object.keys(flatPayload).find(k => k.startsWith('id_')) || "id_dominio";
            const tempParentPK = flatPayload[parentIdField];
            
            fields.forEach(f => {
                if (f.type === 'relation' && nestedData[f.name] && f.isTemporalGraph && typeof Engine_Graph !== 'undefined') {
                    const children = nestedData[f.name];
                    const topologyRules = (typeof getEntityTopologyRules !== 'undefined') 
                                            ? getEntityTopologyRules(entityName)
                                            : { preventCycles: false, maxDepth: 0, siblingCollisionCheck: false };
                    const fullGraph = _Adapter_Sheets.list(f.graphEntity, config, 'objects').rows || [];
                    const activeGraph = fullGraph.filter(e => e.es_version_actual !== false);

                    const topologyResult = Engine_Graph.analyzeTopology(children, activeGraph, topologyRules);
                    const stolenEdges = topologyResult.stolenEdges || [];
                    
                    const edgeName = (f.graphEdgeType || f.name).toUpperCase();
                    let currentActiveEdgesForNode = [];
                    if (f.relationType === 'padre') {
                        currentActiveEdgesForNode = activeGraph.filter(e => String(e.id_nodo_hijo).trim() === String(tempParentPK).trim() && e.tipo_relacion === edgeName);
                    } else {
                        currentActiveEdgesForNode = activeGraph.filter(e => String(e.id_nodo_padre).trim() === String(tempParentPK).trim() && e.tipo_relacion === edgeName);
                    }
                    
                    const targetEntity = f.targetEntity;
                    const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[targetEntity] : null;
                    let childPkField = schema && schema.primaryKey ? schema.primaryKey : null;
                    
                    if (!childPkField) {
                        const tableKey = targetEntity.toLowerCase();
                        const singularKey = tableKey.endsWith('s') ? tableKey.slice(0, -1) : (tableKey.endsWith('es') ? tableKey.slice(0, -2) : tableKey);
                        childPkField = 'id_' + singularKey;
                    }

                    const incomingEdgesMock = children.map(child => ({
                        ...child,
                        id_nodo_padre: f.relationType === 'hijo' ? tempParentPK : (child[childPkField] || child['id_registro']),
                        id_nodo_hijo: f.relationType === 'hijo' ? (child[childPkField] || child['id_registro']) : tempParentPK,
                        tipo_relacion: edgeName
                    }));

                    
                    const normalResult = Engine_Graph.patchSCD2Edges(incomingEdgesMock, currentActiveEdgesForNode, f.topologyCardinality) || {};
                    const normalClose = normalResult.edgesToClose || [];
                    const stealResult = Engine_Graph.patchSCD2Edges([], stolenEdges, f.topologyCardinality) || {};
                    const stealClose = stealResult.edgesToClose || [];
                    
                    precalculatedGraphContext[f.name] = { 
                        orphansToProcess: normalClose.concat(stealClose),
                        edgesToInsert: normalResult.edgesToInsert || [],
                        precalculatedEdgesForNode: currentActiveEdgesForNode
                    };
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
                        if (precalculatedGraphContext[f.name]) {
                            orphansToProcess = precalculatedGraphContext[f.name].orphansToProcess || [];
                            
                            // [Fix] Manejar la eliminación explícita desde el Subgrid
                            const nodeEdges = precalculatedGraphContext[f.name].precalculatedEdgesForNode || [];
                            const explicitlyRemovedEdges = nodeEdges.filter(e => {
                                const relatedId = f.relationType === 'hijo' ? e.id_nodo_hijo : e.id_nodo_padre;
                                return !incomingIds.includes(String(relatedId));
                            });
                            
                            if (explicitlyRemovedEdges.length > 0) {
                                const sysDate = new Date().toISOString();
                                explicitlyRemovedEdges.forEach(e => {
                                    e.es_version_actual = false;
                                    e.valido_hasta = sysDate;
                                    e.updated_at = sysDate;
                                });
                                orphansToProcess = orphansToProcess.concat(explicitlyRemovedEdges);
                            }
                        } else {
                            if (typeof Logger !== 'undefined') Logger.log(`[WARN] GraphQL Context no precalculado para ${f.name}`);
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
                        _Adapter_Sheets.upsertBatch(f.isTemporalGraph ? f.graphEntity : targetEntity, orphansToProcess, config);
                    }

                    // Inyectar FK y Guardar Masivamente (Batch)
                    if (f.isTemporalGraph) {
                        const uuidFn = (typeof Utilities !== 'undefined') ? Utilities.getUuid : () => Math.random().toString(36).substring(2,10);
                        
                        // Idempotent Guard: Diff already calculated in Engine_Graph (O(1))
                        const newChildrenToInsert = precalculatedGraphContext[f.name] ? precalculatedGraphContext[f.name].edgesToInsert || [] : [];


                        const edgeRecords = newChildrenToInsert.map(child => {
                            const newId = "RELA-" + uuidFn().substring(0, 8).toUpperCase();
                            const edgePayload = {
                                id_relacion: newId,
                                id_nodo_padre: f.relationType === 'hijo' ? parentPK : (child[pkField] || child['id_registro']),
                                id_nodo_hijo: f.relationType === 'hijo' ? (child[pkField] || child['id_registro']) : parentPK,
                                tipo_relacion: (f.graphEdgeType || f.name).toUpperCase(),
                                valido_desde: child.valido_desde || new Date().toISOString(),
                                valido_hasta: child.valido_hasta || "",
                                es_version_actual: child.es_version_actual !== undefined ? child.es_version_actual : true,
                                estado: "Activo"
                            };
                            return edgePayload;
                        });
                        
                        if (typeof Logger !== 'undefined') Logger.log(`[Diffing] Ignorados ${children.length - newChildrenToInsert.length} nodos idénticos. Insertando ${newChildrenToInsert.length} aristas nuevas.`);
                        if (config.useSheets && edgeRecords.length > 0) {
                            _Adapter_Sheets.upsertBatch(f.graphEntity, edgeRecords, config);
                        }
                    } else {
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

                        if (config.useSheets) {
                            _Adapter_Sheets.upsertBatch(targetEntity, children, config);
                        }
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
                    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true };
                    
                    let matches = [];
                    
                    if (f.isTemporalGraph && f.graphEntity) {
                        // Graph Edge Hydration
                        const edgesContext = _Adapter_Sheets.list(f.graphEntity, config, 'objects');
                        const activeEdges = (edgesContext && edgesContext.rows ? edgesContext.rows : []).filter(e => e.es_version_actual !== false && e.estado !== 'Eliminado');
                        
                        let matchedIds = [];
                        const edgeName = (f.graphEdgeType || f.name).toUpperCase();
                        if (f.relationType === 'padre') {
                            // Si pido "el padre", busco aristas donde yo soy el hijo.
                            matchedIds = activeEdges.filter(e => String(e.id_nodo_hijo).trim() === String(id).trim() && e.tipo_relacion === edgeName).map(e => String(e.id_nodo_padre).trim());
                        } else {
                            // Si pido "los hijos", busco aristas donde yo soy el padre.
                            matchedIds = activeEdges.filter(e => String(e.id_nodo_padre).trim() === String(id).trim() && e.tipo_relacion === edgeName).map(e => String(e.id_nodo_hijo).trim());
                        }
                        
                        const targetContext = _Adapter_Sheets.list(targetEntity, config, 'objects');
                        const targetRows = targetContext && targetContext.rows ? targetContext.rows : [];
                        
                        // Infer PK based on targetEntity
                        const singularTarget = targetEntity.toLowerCase().endsWith('es') ? targetEntity.slice(0, -2) : (targetEntity.toLowerCase().endsWith('s') ? targetEntity.slice(0, -1) : targetEntity.toLowerCase());
                        const inferredPk = 'id_' + singularTarget;
                        
                        matches = targetRows.filter(c => matchedIds.includes(String(c[inferredPk] || c['id_registro']).trim()));
                    } else {
                        // Legacy Direct FK Hydration
                        const fkField = f.foreignKey;
                        if (fkField) {
                            const targetContext = _Adapter_Sheets.list(targetEntity, config, 'objects');
                            const targetRows = targetContext && targetContext.rows ? targetContext.rows : [];
                            matches = targetRows.filter(child => String(child[fkField]) === String(id));
                        }
                    }
                    
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
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
        if (typeof Logger !== 'undefined') Logger.log("Engine_DB_delete_router: Routing " + entityName + " (ID: " + id + ") to Architect Unit of Work Deletion.");
        
        let results = { sheets: {}, cloud: {} };

        // [S8.1] Check graph topology configuration
        let strategy = "ORPHAN"; 
        let isGraphEntity = false;
        if (typeof getEntityTopologyRules !== 'undefined') {
            const rules = getEntityTopologyRules(entityName);
            // Si la entidad tiene configuración de grafo explícita pero NO ES FLAT, es un Poly-Tree sujeto a cascadas topológicas.
            if (rules && rules.topologyType && rules.topologyType !== "FLAT") {
                isGraphEntity = true;
                strategy = rules.deletionStrategy || "ORPHAN";
            }
        } else {
            // Legacy hardcode validation
            if (entityName === "Dominio") {
                isGraphEntity = true;
                strategy = "GRANDPARENT"; // fallback behavior if Schema_Engine isn't strictly loaded
            }
        }

        if (isGraphEntity && config.useSheets) {
            // ==============================================
            // UNIT OF WORK ORCHESTRATION (M:N DAGS)
            // ==============================================
            
            // 1. Load active graph
            // Asume que _Adapter_Sheets expone list(Entity, Config, Format).
            const listResponse = _Adapter_Sheets.list("Relacion_Dominios", config, "objects");
            const activeGraph = (listResponse && listResponse.rows) ? listResponse.rows.filter(r => r.es_version_actual !== false) : [];
            
            // 2. Build Patch Mathematically (No DB touch)
            let patch = { edgesToClose: [], edgesToSpawn: [], nodesToDelete: [id] };
            if (typeof Engine_Graph !== 'undefined' && typeof Engine_Graph.buildDeletionPatch === 'function') {
                patch = Engine_Graph.buildDeletionPatch(id, strategy, activeGraph);
            } else {
                if (typeof Logger !== 'undefined') Logger.log("[WARN] Engine_Graph not found, falling back to basic self soft-delete.");
            }

            const sysDate = new Date().toISOString();
            const currentUser = (typeof Session !== 'undefined') ? Session.getActiveUser().getEmail() : 'system@localhost';

            // 3. Translate Edges to Upsert Payloads
            const edgesClosed = patch.edgesToClose.map(e => ({
                id_relacion: e.id_relacion,
                es_version_actual: false,
                valido_hasta: sysDate,
                updated_at: sysDate
            }));

            const uuidFn = (typeof Utilities !== 'undefined') ? Utilities.getUuid : () => Math.random().toString(36).substring(2,10);
            
            const edgesSpawned = patch.edgesToSpawn.map(e => {
                let rID = "RELA-" + uuidFn().substring(0, 8).toUpperCase();
                return {
                    id_relacion: rID,
                    id_nodo_padre: e.id_nodo_padre,
                    id_nodo_hijo: e.id_nodo_hijo,
                    tipo_relacion: e.tipo_relacion || "SCD2_EDGE",
                    peso_influencia: 1,
                    valido_desde: sysDate,
                    valido_hasta: "",
                    es_version_actual: true,
                    created_at: sysDate,
                    created_by: "DAG_DELETION_" + strategy
                };
            });

            const edgesToUpsert = [...edgesClosed, ...edgesSpawned];

            // 4. Translate Nodes to Soft-Delete Upsert Payloads
            const pkPrefix = entityName.toLowerCase().endsWith('es') ? entityName.toLowerCase().slice(0, -2) : (entityName.toLowerCase().endsWith('s') ? entityName.toLowerCase().slice(0, -1) : entityName.toLowerCase());
            const pkField = 'id_' + pkPrefix;

            const nodesToSoftDelete = patch.nodesToDelete.map(nId => {
                const nodePayload = {
                    estado: 'Eliminado',
                    deleted_at: sysDate,
                    deleted_by: currentUser
                };
                nodePayload[pkField] = nId;
                return nodePayload;
            });

            // 5. Commit Unit of Work (The O(1) Bulk Pushes)
            if (edgesToUpsert.length > 0) {
                if (typeof Logger !== 'undefined') Logger.log(`[Unit of Work] Upserting ${edgesToUpsert.length} graph edges (SCD-2) to array.`);
                this.upsertBatch("Relacion_Dominios", edgesToUpsert, config);
            }

            if (nodesToSoftDelete.length > 0) {
                if (typeof Logger !== 'undefined') Logger.log(`[Unit of Work] Logical bulk deletion of ${nodesToSoftDelete.length} nodes in DB_${entityName}.`);
                results.sheets = this.upsertBatch(entityName, nodesToSoftDelete, config);
            }

            _invalidateCache("Relacion_Dominios");

        } else {
            // ==============================================
            // STANDARD SINGULAR DELETETION 
            // ==============================================
            if (config.useSheets) {
                results.sheets = _Adapter_Sheets.remove(entityName, id, config);
            }
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
