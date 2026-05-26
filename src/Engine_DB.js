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
 * _getAppVersionHash (Cache Strategy)
 * Provee un hash único para evitar Cache-Pollution cross-deployments.
 */
function _getAppVersionHash() {
    return (typeof CONFIG !== 'undefined' && CONFIG.APP_VERSION) ? String(CONFIG.APP_VERSION).replace(/[^a-zA-Z0-9]/g, '') : 'V0';
}

/**
 * _invalidateCache (Directiva Architect: Cache Busting)
 * Purga la RAM para forzar lectura fresca tras mutaciones.
 */
function _invalidateCache(entityName) {
    if (typeof CacheService === 'undefined') return;
    const cache = CacheService.getScriptCache();

    // Invalidación de lista principal (soportando Chunking y versionado dinámico)
    _removeCacheChunked(cache, 'CACHE_LIST_' + entityName);
    _removeCacheChunked(cache, `CACHE_LIST_${_getAppVersionHash()}_${entityName}`);
    
    // Invalidación de lookups asociados
    const lookupMap = {
        'Portafolio': 'getPortafoliosOptions',
        'Grupo_Productos': 'getGruposProductosOptions',
        'Producto': 'getProductosOptions',
        'Unidad_Negocio': 'getUnidadesNegocioOptions',
        'Equipo': 'getEquiposOptions'
    };
    if (lookupMap[entityName]) {
        _removeCacheChunked(cache, 'CACHE_LOOKUP_' + lookupMap[entityName]);
    }
    
    if (typeof Logger !== 'undefined') Logger.log(`[Cache] BUSTED para ${entityName}`);
}

/**
 * [S42.1] Fragmentación Dinámica de RAM (Chunking O(1))
 * Soluciona el Límite Crítico Físico de 100KB de Google Apps Script CacheService
 */
function _getCacheChunked(cache, key) {
    const metaStr = cache.get(key);
    if (!metaStr) return null;
    if (!metaStr.startsWith('{"isChunked":true')) return metaStr; // Legacy Support
    
    const meta = JSON.parse(metaStr);
    let fullData = "";
    for (let i = 0; i < meta.chunks; i++) {
        const chunk = cache.get(key + '_chunk_' + i);
        if (!chunk) return null; // Cache truncado / evadido prematuramente
        fullData += chunk;
    }
    return fullData;
}

function _putCacheChunked(cache, key, strData, expiration) {
    try {
        const CHUNK_SIZE = 90000; // Safety threshold de 90KB
        if (strData.length <= CHUNK_SIZE) {
            cache.put(key, strData, expiration);
            return;
        }
        
        const chunks = Math.ceil(strData.length / CHUNK_SIZE);
        const meta = JSON.stringify({ isChunked: true, chunks: chunks });
        
        const payloadDict = {};
        payloadDict[key] = meta;
        for (let i = 0; i < chunks; i++) {
            payloadDict[key + '_chunk_' + i] = strData.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        }
        
        cache.putAll(payloadDict, expiration);
        if (typeof Logger !== 'undefined') Logger.log(`[Cache Chunking] Clave ${key} fragmentada en ${chunks} pedazos.`);
    } catch(e) {
        if (typeof Logger !== 'undefined') Logger.log(`[Cache Error] Falló al inyectar caché para ${key}: ` + e.message);
    }
}

function _removeCacheChunked(cache, key) {
    const metaStr = cache.get(key);
    if (metaStr && metaStr.startsWith('{"isChunked":true')) {
        try {
            const meta = JSON.parse(metaStr);
            const keysToRemove = [key];
            for (let i = 0; i < meta.chunks; i++) {
                keysToRemove.push(key + '_chunk_' + i);
            }
            cache.removeAll(keysToRemove);
            return;
        } catch(e) {}
    }
    cache.remove(key);
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
        // [S60/E6] Guard de routing: entidades con adapter especial no usan Sheets
        const schemaForAdapter = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
        if (schemaForAdapter && schemaForAdapter.metadata && schemaForAdapter.metadata.adapter === 'config') {
            if (typeof Adapter_Config !== 'undefined') {
                return Adapter_Config.setAll(payload);
            }
            throw new Error('[Engine_DB] Adapter_Config requerido para guardar ' + entityName + '. Ejecuta S61 para crearlo.');
        }

        const nestedData = {};
        const flatPayload = { ...payload };
        let precalculatedGraphContext = {};
        let cachedGraphFull = null;

        // [S5.6] Dynamic DAG Subgrid takes over Transient Edge
        // La topología se administra directamente mediante subgrids hacia Sys_Graph_Edges.

        // Paso A: Desempaquetado basado en esquema
        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
        if (schema) {
            const fields = schema.fields || (typeof schema === 'object' ? Object.keys(schema).map(k => ({ name: k, ...schema[k] })) : []);
            fields.forEach(f => {
                if ((f.type === 'relation' || f.isTemporalGraph) && payload[f.name] !== undefined) {
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
            // [S-Tier Fix] Use explicit Schema schema.primaryKey instead of naive regex matching
            const parentIdField = schema.primaryKey || (typeof JS_SchemaUtils !== 'undefined' ? JS_SchemaUtils.getPrimaryKey(entityName) : 'id_' + entityName.toLowerCase());
            let tempParentPK = flatPayload[parentIdField];
            
            // Fallback para IDs dinámicamente generados o injectados (si aplica)
            if (!tempParentPK && payload.id) tempParentPK = payload.id;
            
            fields.forEach(f => {
                if ((f.type === 'relation' || f.isTemporalGraph) && nestedData[f.name] && f.isTemporalGraph && typeof Engine_Graph !== 'undefined') {
                    const children = nestedData[f.name];
                    // [S27.4/Rx] Clone rules to prevent memory leaks across subgrids (State Mutation Bug)
                    let baseRules = (typeof getEntityTopologyRules !== 'undefined') ? getEntityTopologyRules(entityName) : null;
                    if (!baseRules || baseRules.topologyType === "FLAT") {
                        // Fallback to target entity if the current entity (e.g. Taxonomia workspace) lacks specific DAG rules
                        const targetRules = (typeof getEntityTopologyRules !== 'undefined') ? getEntityTopologyRules(f.targetEntity) : null;
                        if (targetRules) baseRules = targetRules;
                    }
                    if (!baseRules) baseRules = { preventCycles: false, maxDepth: 0, siblingCollisionCheck: false, allowOrphanStealing: false };
                    
                    const topologyRules = { ...baseRules }; // Shallow clone
                                            
                    // [S27.4/Rx] Normalize passive field metadata into active topological enforcement
                    const cardinality = f.topologyCardinality || "M:N";
                    if (cardinality === "1:N") {
                        topologyRules.enforceSingleParent = true;
                    } else if (cardinality === "M:N") {
                        topologyRules.enforceSingleParent = false;
                        topologyRules.allowOrphanStealing = false;
                        if (topologyRules.topologyType === "JERARQUICA_ESTRICTA" || topologyRules.topologyType === "JERARQUICA_ORGANICA") {
                            topologyRules.topologyType = "FLAT"; // S44.2 Evitar que reglas estructurales strict generen robos M:N
                        }
                    }
                    
                    const edgeName = (f.graphEdgeType || f.name).toUpperCase();
                    topologyRules.edgeType = edgeName; // For precise stealing checks
                    
                    let fullGraph;
                    if (f.graphEntity === 'Sys_Graph_Edges') {
                        if (!cachedGraphFull) cachedGraphFull = this.list('Sys_Graph_Edges', 'objects').rows || [];
                        fullGraph = cachedGraphFull;
                    } else {
                        fullGraph = this.list(f.graphEntity, 'objects').rows || [];
                    }
                    const activeGraph = fullGraph.filter(e => e.es_version_actual !== false);
                    
                    let graphToAnalyze = activeGraph;
                    if (f.workspaceMode) {
                        const ctxId = String(tempParentPK).trim();
                        graphToAnalyze = activeGraph.filter(e => String(e.contexto_id).trim() === ctxId);
                    }

                    const targetEntity = f.targetEntity;
                    const nestedSchema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[targetEntity] : null;
                    let childPkField = nestedSchema && nestedSchema.primaryKey ? nestedSchema.primaryKey : null;
                    
                    if (!childPkField) {
                        throw new Error(`[AR-Governance] Violación de Schema-Driven Design: La entidad relacionada '${targetEntity}' no tiene definida su 'primaryKey' en APP_SCHEMAS. El fallback determinista por sufijo está deprecado.`);
                    }

                    const incomingEdgesMock = children.map(child => {
                        let mockPadre, mockHijo;
                        if (f.workspaceMode) {
                            let dynPadre = flatPayload[f.dynamicParentField];
                            if (dynPadre === undefined && f.dynamicParentField && nestedData[f.dynamicParentField] && nestedData[f.dynamicParentField].length > 0) {
                                dynPadre = nestedData[f.dynamicParentField][0].id_registro;
                            }
                            mockPadre = f.dynamicParentField ? dynPadre : f.fixedParentId;
                            mockHijo = child[childPkField] || child['id_registro'];
                        } else {
                            mockPadre = f.relationType === 'hijo' ? tempParentPK : (child[childPkField] || child['id_registro']);
                            mockHijo = f.relationType === 'hijo' ? (child[childPkField] || child['id_registro']) : tempParentPK;
                        }
                        return {
                            ...child,
                            id_nodo_padre: mockPadre,
                            id_nodo_hijo: mockHijo,
                            tipo_relacion: edgeName
                        };
                    });

                    const topologyResult = Engine_Graph.analyzeTopology(incomingEdgesMock, graphToAnalyze, topologyRules);
                    const stolenEdges = topologyResult.stolenEdges || [];
                    
                    let currentActiveEdgesForNode = [];
                    if (f.workspaceMode) {
                        let dynPadre = flatPayload[f.dynamicParentField];
                        if (dynPadre === undefined && f.dynamicParentField && nestedData[f.dynamicParentField] && nestedData[f.dynamicParentField].length > 0) {
                            dynPadre = nestedData[f.dynamicParentField][0].id_registro;
                        }
                        const effectiveParentId = f.dynamicParentField ? dynPadre : f.fixedParentId;
                        currentActiveEdgesForNode = activeGraph.filter(e => 
                            String(e.id_nodo_padre).trim() === String(effectiveParentId).trim() && 
                            e.tipo_relacion === edgeName &&
                            String(e.contexto_id).trim() === String(tempParentPK).trim()
                        );
                    } else if (f.relationType === 'padre') {
                        currentActiveEdgesForNode = activeGraph.filter(e => String(e.id_nodo_hijo).trim() === String(tempParentPK).trim() && e.tipo_relacion === edgeName);
                    } else {
                        currentActiveEdgesForNode = activeGraph.filter(e => String(e.id_nodo_padre).trim() === String(tempParentPK).trim() && e.tipo_relacion === edgeName);
                    }
                    
                    // [S53.6] Workspace Isolation: Restrict diffing pool to edges inside the explicit work context.
                    // This prevents Draft changes from accidentally deleting Baseline relationships.
                    if (flatPayload._work_context) {
                        currentActiveEdgesForNode = currentActiveEdgesForNode.filter(e => String(e.contexto_id).trim() === String(flatPayload._work_context).trim());
                    }
                    
                    const normalResult = Engine_Graph.patchSCD2Edges(incomingEdgesMock, currentActiveEdgesForNode, f.topologyCardinality) || {};
                    const normalClose = normalResult.edgesToClose || [];
                    const stealResult = Engine_Graph.patchSCD2Edges([], stolenEdges, f.topologyCardinality) || {};
                    let stealClose = stealResult.edgesToClose || [];
                    
                    // [S54.5 Fix Contextual Graph Leak] Prevent drafts from stealing global baseline relationships.
                    if (flatPayload._work_context) {
                        stealClose = stealClose.filter(e => String(e.contexto_id).trim() === String(flatPayload._work_context).trim());
                    }
                    
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
        const parentIdField = schema ? schema.primaryKey : "id_dominio";
        
        // S-Tier Fix 2: Adapter_Sheets returns .pk as the Column Name (e.g. 'id_persona'), NOT the value.
        // The value is in .val or .lexical_id.
        let parentPK = parentResults.val || parentResults.lexical_id || flatPayload[parentIdField];
        
        // Mapeo exhaustivo en cascada en caso de adaptadores anidados
        if (!parentPK && parentResults.adapter_results && parentResults.adapter_results.sheets) {
            parentPK = parentResults.adapter_results.sheets.val || parentResults.adapter_results.sheets.lexical_id;
        }
        const globalBatches = {};
        const globalCachesToBust = new Set();
        globalCachesToBust.add(entityName); // [FIX] Invalidate parent entity cache to prevent UI staleness and Job idempotency failure

        if (schema) {
            const fields = schema.fields || (typeof schema === 'object' ? Object.keys(schema).map(k => ({ name: k, ...schema[k] })) : []);
            fields.forEach(f => {
                if ((f.type === 'relation' || f.isTemporalGraph) && nestedData[f.name]) {
                    const children = nestedData[f.name];
                    const targetEntity = f.targetEntity;
                    const fkField = f.foreignKey;

                    // --- RECONCILIACIÓN (DIFFING) ---
                    // Paso A: Buscar hijos huérfanos antes de actualizar
                    const currentInDB = this.list(targetEntity, 'objects') || { rows: [] };
                    const orphanMatches = (currentInDB.rows || []).filter(c => c[fkField] == parentPK);
                    
                    // Paso B: Determinar cuáles ya no están en el nuevo payload
                    const nestedSchema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[targetEntity] : null;
                    const pkField = nestedSchema && nestedSchema.primaryKey ? nestedSchema.primaryKey : null;
                    if (!pkField) throw new Error(`[AR-Governance] La entidad huerfano '${targetEntity}' carece de 'primaryKey' en Schema_Engine. gs`);
                    
                    const incomingIds = children.map(c => String(c[pkField] || c['id_registro'] || ''));
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

                    const targetTableForOrphans = f.isTemporalGraph ? f.graphEntity : targetEntity;
                    if (orphansToProcess.length > 0) {
                        if (typeof Logger !== 'undefined') Logger.log(`[Diffing] Detectados ${orphansToProcess.length} huérfanos para desvincular.`);
                        if (!globalBatches[targetTableForOrphans]) globalBatches[targetTableForOrphans] = [];
                        globalBatches[targetTableForOrphans].push(...orphansToProcess);
                        globalCachesToBust.add(targetTableForOrphans);
                    }

                    // Inyectar FK y Guardar Masivamente (Batch)
                    if (f.isTemporalGraph) {
                        const uuidFn = (typeof Utilities !== 'undefined') ? Utilities.getUuid : () => Math.random().toString(36).substring(2,10);
                        
                        // Idempotent Guard: Diff already calculated in Engine_Graph (O(1))
                        const newChildrenToInsert = precalculatedGraphContext[f.name] ? precalculatedGraphContext[f.name].edgesToInsert || [] : [];

                        const edgeRecords = newChildrenToInsert.map(child => {
                            const newId = "RELA-" + uuidFn().substring(0, 8).toUpperCase();
                            let edgePadre, edgeHijo;
                            if (f.workspaceMode) {
                                let dynPadre = flatPayload[f.dynamicParentField];
                                if (dynPadre === undefined && f.dynamicParentField && nestedData[f.dynamicParentField] && nestedData[f.dynamicParentField].length > 0) {
                                    dynPadre = nestedData[f.dynamicParentField][0].id_registro;
                                }
                                edgePadre = f.dynamicParentField ? dynPadre : f.fixedParentId;
                                edgeHijo = child[pkField] || child['id_registro'];
                            } else {
                                edgePadre = f.relationType === 'hijo' ? parentPK : (child[pkField] || child['id_registro']);
                                edgeHijo = f.relationType === 'hijo' ? (child[pkField] || child['id_registro']) : parentPK;
                            }
                            const edgePayload = {
                                id_relacion: newId,
                                id_nodo_padre: edgePadre,
                                id_nodo_hijo: edgeHijo,
                                tipo_relacion: (f.graphEdgeType || f.name).toUpperCase(),
                                valido_desde: child.valido_desde || new Date().toISOString(),
                                valido_hasta: child.valido_hasta || "",
                                es_version_actual: child.es_version_actual !== undefined ? child.es_version_actual : true,
                                estado: child._estado_arista || child.estado || flatPayload.estado || "Activo",
                                contexto_id: child._contexto_arista || child.contexto_id || flatPayload._work_context || ""
                            };
                            return edgePayload;
                        });
                        
                        if (typeof Logger !== 'undefined') Logger.log(`[Diffing] Ignorados ${children.length - newChildrenToInsert.length} nodos idénticos. Insertando ${newChildrenToInsert.length} aristas nuevas.`);
                        if (edgeRecords.length > 0) {
                            if (!globalBatches[f.graphEntity]) globalBatches[f.graphEntity] = [];
                            globalBatches[f.graphEntity].push(...edgeRecords);
                            globalCachesToBust.add(f.graphEntity);
                        }

                        if (!parentResults.orchestratedChildren) parentResults.orchestratedChildren = {};
                        if (!parentResults.orchestratedChildren[f.graphEntity]) parentResults.orchestratedChildren[f.graphEntity] = [];
                        parentResults.orchestratedChildren[f.graphEntity].push(...edgeRecords);
                        if (orphansToProcess.length > 0) {
                            parentResults.orchestratedChildren[f.graphEntity].push(...orphansToProcess);
                        }
                    } else {
                        children.forEach(child => {
                            child[fkField] = parentPK;
                            
                            // Si el registro es nuevo (no tiene PK), generarla
                            if (!child[pkField]) {
                                const prefix = targetEntity.substring(0, 4).toUpperCase();
                                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                                let suffix = '';
                                for (let i = 0; i < 8; i++) suffix += chars.charAt(Math.floor(Math.random() * chars.length));
                                child[pkField] = `${prefix}-${suffix}`;
                            }
                        });

                        if (children.length > 0) {
                            if (!globalBatches[targetEntity]) globalBatches[targetEntity] = [];
                            globalBatches[targetEntity].push(...children);
                            globalCachesToBust.add(targetEntity);
                        }
                        
                        if (!parentResults.orchestratedChildren) parentResults.orchestratedChildren = {};
                        if (!parentResults.orchestratedChildren[targetEntity]) parentResults.orchestratedChildren[targetEntity] = [];
                        parentResults.orchestratedChildren[targetEntity].push(...children);
                    }
                    if (config.useCloudDB) {
                        // Omitido para brevedad o implementado si el adapter soporta batch
                    }
                    
                    // Removido: _invalidateCache recursivo intermedio. Se ejecutará externamente.
                }
            });
        }
        
        // --- S42.3 EJECUCIÓN CONSOLIDADA O(1) ---
        if (config.useSheets) {
            Object.keys(globalBatches).forEach(tableName => {
                if (globalBatches[tableName].length > 0) {
                    try {
                        if (typeof Logger !== 'undefined') {
                            Logger.log(`[Engine_DB] Ejecuando UpsertBatch para Entity=${tableName}. Tratando de persistir ${globalBatches[tableName].length} aristas (M:N).`);
                        }
                        _Adapter_Sheets.upsertBatch(tableName, globalBatches[tableName], config);
                        if (typeof Logger !== 'undefined') Logger.log(`[Engine_DB] UpsertBatch Exitoso para ${tableName}.`);
                    } catch (e) {
                        if (typeof Logger !== 'undefined') {
                            Logger.log(`[Engine_DB CRTICAL] Fallo Persistencia de Grafo (M:N) en ${tableName}! Error: ${e.message}`);
                        }
                    }
                }
            });
        }
        
        // Purgar la RAM agrupadamente (Rule 2: No Duplication, AR Request)
        globalCachesToBust.forEach(tableName => {
            _invalidateCache(tableName);
        });

        // [S34.2] Materialized View Headcount Aggregation
        try {
            let equiposToRecalc = new Set();
            
            if (entityName === 'Equipo') {
                equiposToRecalc.add(String(parentPK).trim());
            } else if (entityName === 'Persona') {
                if (nestedData['equipo'] && nestedData['equipo'].length > 0) {
                    equiposToRecalc.add(String(nestedData['equipo'][0].id_registro || '').trim());
                }
                if (precalculatedGraphContext['equipo'] && precalculatedGraphContext['equipo'].precalculatedEdgesForNode) {
                    precalculatedGraphContext['equipo'].precalculatedEdgesForNode.forEach(oldEdge => {
                        equiposToRecalc.add(String(oldEdge.id_nodo_padre).trim());
                    });
                }
            }

            equiposToRecalc.forEach(eqId => {
                if (!eqId || eqId === 'undefined' || eqId === '') return;
                
                if (!cachedGraphFull) cachedGraphFull = _Adapter_Sheets.list('Sys_Graph_Edges', config, 'objects').rows || [];
                const eqEdges = cachedGraphFull.filter(e => e.es_version_actual !== false && e.tipo_relacion === 'PERSONA_EQUIPO' && String(e.id_nodo_padre).trim() === eqId);
                const count = eqEdges.length;

                if (typeof Logger !== 'undefined') Logger.log(`[Materialized Headcount] Equipo ${eqId} recalibrado a: ${count}`);
                
                const updatePayload = { id_equipo: eqId, total_integrantes: count };
                if (config.useSheets) {
                    _Adapter_Sheets.upsertBatch('Equipo', [updatePayload], config);
                }
                _invalidateCache('Equipo');
            });
            
        } catch(aggErr) {
            if (typeof Logger !== 'undefined') Logger.log(`[Materialized Headcount Error] ${aggErr.message}`);
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
        // [Performance Fix]: Calling the lock-protected Adapter bulk method directly. O(N) -> O(1) Locks+I/O.
        const results = _Adapter_Sheets.upsertBatch(tableName, items, config);
        _invalidateCache(tableName);
        return results;
    },

    read: function (entityName, id) {
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true };
        const results = _Adapter_Sheets.list(entityName, config, 'objects');
        
        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
        let pkField = schema ? schema.primaryKey : null;

        if (!pkField) {
            pkField = 'id';
        }

        return results.rows.find(r => String(r[pkField]) === String(id));
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
                        const activeEdges = (edgesContext && edgesContext.rows ? edgesContext.rows : []).filter(e => e.es_version_actual !== false && e.estado !== 'Eliminado' && e.estado !== 'Borrador');
                        
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
                        
                        // Inherit explicitly from schema
                        const targetSchema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[targetEntity] : null;
                        let inferredPk = (targetSchema && targetSchema.primaryKey) ? targetSchema.primaryKey : null;
                        if (!inferredPk) {
                            inferredPk = 'id';
                        }
                        
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
    list: function (entityName, format, options) {
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, SPREADSHEET_ID_DB: '' };

        // [S60/E6] Guard de routing: entidades con adapter especial no usan Sheets
        const schemaForAdapter = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
        if (schemaForAdapter && schemaForAdapter.metadata && schemaForAdapter.metadata.adapter === 'config') {
            if (typeof Adapter_Config !== 'undefined') {
                return Adapter_Config.asListResponse();
            }
            if (typeof Logger !== 'undefined') Logger.log('[Engine_DB] WARN: Adapter_Config no disponible aún para ' + entityName + '. Retornando vacío.');
            return { headers: [], rows: [] };
        }
        // Intentar leer de RAM (CacheService) con Fragmentación Inteligente S42.1
        const cacheKey = `CACHE_LIST_${_getAppVersionHash()}_${entityName}`;
        if (typeof CacheService !== 'undefined' && (!options || !options.skipCache)) {
            const cache = CacheService.getScriptCache();
            const cached = _getCacheChunked(cache, cacheKey);
            if (cached && format !== 'tuples') {
                Logger.log(`[Cache Engine] HIT para ${entityName}`);
                return JSON.parse(cached);
            }
        }

        Logger.log(`[Cache Engine] MISS para ${entityName}. Leyendo de DB...`);
        const result = _Adapter_Sheets.list(entityName, config, format);
        
        // Guardar en caché si no es formato tuplas (Chunked blindado)
        if (typeof CacheService !== 'undefined' && format !== 'tuples' && result) {
            const cache = CacheService.getScriptCache();
            _putCacheChunked(cache, cacheKey, JSON.stringify(result), 3600);
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

    /**
     * [S50.4] Mass Approval ETL
     * Promotes a full Taxonomy draft context to Live/Active state atomically.
     * @param {string} contextId
     * @returns {Object} { approvedEdges: number }
     */
    publishDraftContext: function(contextId) {
        if (!contextId) throw new Error("publishDraftContext: contextId requerido.");
        if (typeof Logger !== 'undefined') Logger.log(`[Mass Approval] Publicando Draft Context: ${contextId}`);
        const sysDate = new Date().toISOString();

        // 1. Update master entity (Taxonomia)
        const taxRes = _Adapter_Sheets.list('Taxonomia', { useSheets: true }, 'objects');
        const taxRecords = taxRes && taxRes.rows ? taxRes.rows : [];
        const taxRecord = taxRecords.find(r => r.id_registro === contextId || r.id_taxonomia === contextId);
        if (taxRecord) {
            taxRecord.estado = 'Activo';
            taxRecord.updated_at = sysDate;
            _Adapter_Sheets.upsertBatch('Taxonomia', [taxRecord], { isVolatile: false });
            _invalidateCache('Taxonomia');
        }

        // 2. Mass update edges
        const edgesRes = _Adapter_Sheets.list('Sys_Graph_Edges', { useSheets: true }, 'objects');
        const edges = edgesRes && edgesRes.rows ? edgesRes.rows : [];
        const edgesToUpdate = edges.filter(e => e.contexto_id === contextId && e.estado === 'Borrador');
        
        if (edgesToUpdate.length > 0) {
            edgesToUpdate.forEach(e => {
                e.estado = 'Activo';
                e.updated_at = sysDate;
            });
            _Adapter_Sheets.upsertBatch('Sys_Graph_Edges', edgesToUpdate, { isVolatile: false });
            _invalidateCache('Sys_Graph_Edges');
            if (typeof Logger !== 'undefined') Logger.log(`[Mass Approval] ${edgesToUpdate.length} aristas validadas.`);
        }

        return { approvedEdges: edgesToUpdate.length };
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
            // Use Sys_Graph_Edges for standard topology or fallback to specific graph table if needed
            const graphTableName = "Sys_Graph_Edges";
            const listResponse = _Adapter_Sheets.list(graphTableName, config, "objects");
            const activeGraph = (listResponse && listResponse.rows) ? listResponse.rows.filter(r => r.es_version_actual !== false) : [];
            
            // 2. Build Patch Mathematically (No DB touch)
            let patch = { edgesToClose: [], edgesToSpawn: [], nodesToDelete: [id] };
            if (typeof Engine_Graph !== 'undefined' && typeof Engine_Graph.buildDeletionPatch === 'function') {
                patch = Engine_Graph.buildDeletionPatch(id, strategy, activeGraph);
            } else {
                if (typeof Logger !== 'undefined') Logger.log("[WARN] Engine_Graph not found, falling back to basic self soft-delete.");
            }

            // [S51.4 Quality Fix] Orphaned Tripartite Edges Cleanup
            // Any edge where the deleted node acts as the context (e.g. Taxonomia workspaces) must be closed
            const contextualEdges = activeGraph.filter(e => String(e.contexto_id).trim() === String(id).trim());
            contextualEdges.forEach(ce => {
                if (!patch.edgesToClose.some(existing => existing.id_relacion === ce.id_relacion)) {
                    patch.edgesToClose.push(ce);
                }
            });

            const sysDate = new Date().toISOString();
            const currentUser = (typeof Session !== 'undefined') ? Session.getActiveUser().getEmail() : 'system@localhost';

            // 3. Translate Edges to Upsert Payloads
            const edgesClosed = patch.edgesToClose.map(e => ({
                id_relacion: e.id_relacion,
                es_version_actual: false,
                estado: 'Eliminado',
                valido_hasta: sysDate,
                updated_at: sysDate,
                updated_by: currentUser
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
            const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
            const pkField = schema && schema.primaryKey ? schema.primaryKey : null;
            if (!pkField) throw new Error(`[AR-Governance] Violación Topológica: Imposible eliminar nodos para '${entityName}'. Falta declarar 'primaryKey' en Schema_Engine.`);

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
                this.upsertBatch(graphTableName, edgesToUpsert, config);
            }

            if (nodesToSoftDelete.length > 0) {
                if (typeof Logger !== 'undefined') Logger.log(`[Unit of Work] Logical bulk deletion of ${nodesToSoftDelete.length} nodes in DB_${entityName}.`);
                results.sheets = this.upsertBatch(entityName, nodesToSoftDelete, config);
            }

            _invalidateCache(graphTableName);

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
