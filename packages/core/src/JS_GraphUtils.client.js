/**
 * JS_GraphUtils.client.js
 * 
 * Centralized Utility for Temporal Graph (Sys_Graph_Edges) traversal and indexing.
 * Resolves Architecture Review finding H10 (Pattern Duplication).
 * Designed for low-RAM mobile devices: indexes O(N) linear lookups into O(1) hash maps.
 */

window.Graph_Utils = (function () {
    let _graphIndex = null;

    /**
     * Rebuilds the internal memory index based on current DataStore state.
     * Indexes by Destino -> Origen, and Origen -> Destino to ensure O(1) lookups.
     */
    function _buildIndex() {
        if (!window.DataStore) return;
        const activeEdges = window.DataStore.get('Sys_Graph_Edges') || [];
        
        _graphIndex = {
            byDestino: {}, // targetId -> array of edges
            byOrigen: {}   // sourceId -> array of edges
        };

        for (let i = 0; i < activeEdges.length; i++) {
            const edge = activeEdges[i];
            if (edge.estatus === false || edge.estatus === 'false' || edge.es_version_actual === false) continue;

            const dId = String(edge.id_nodo_hijo);
            const oId = String(edge.id_nodo_padre);

            if (!_graphIndex.byDestino[dId]) _graphIndex.byDestino[dId] = [];
            _graphIndex.byDestino[dId].push(edge);

            if (!_graphIndex.byOrigen[oId]) _graphIndex.byOrigen[oId] = [];
            _graphIndex.byOrigen[oId].push(edge);
        }
    }

    /**
     * Resolves the linked Entity ID across a temporal graph edge.
     * Checks both directions (Origen <-> Destino) or only the requested direction if relationType is provided.
     * 
     * @param {string} localRecordId - The ID of the record traversing the graph
     * @param {string} edgeType - The relationship identifier (e.g. 'CARGO_PERSONA')
     * @param {string} contextId - Optional context ID to include draft edges
     * @param {boolean} strictContext - If true, restricts to contextId
     * @param {string} relationType - Optional 'padre' or 'hijo' to restrict traversal direction
     * @returns {string|null} The linked record ID, or null if not found
     */
    function resolveLinkedId(localRecordId, edgeType, contextId = null, strictContext = false, relationType = null) {
        if (!_graphIndex) _buildIndex();
        if (!_graphIndex) return null; // Fallback safely if DataStore is missing

        const lId = String(localRecordId);
        let activeId = null;
        let isDeletedInDraft = false;

        const processEdges = (edges, isDraftPass) => {
            if (!edges) return;
            for (let i = 0; i < edges.length; i++) {
                const e = edges[i];
                if (e.tipo_relacion !== edgeType) continue;
                if (e.es_version_actual === false) continue;
                
                const estadoLower = String(e.estado || '').toLowerCase().trim();
                const isDraft = estadoLower === 'borrador';
                const isDeleted = estadoLower === 'eliminado';
                const matchesContext = !!contextId && String(e.contexto_id) === String(contextId);
                
                if (strictContext && isDraft && !matchesContext) continue;
                if (strictContext && isDeleted && !matchesContext) continue;
                
                const targetId = relationType === 'padre' ? e.id_nodo_padre : 
                                 (relationType === 'hijo' ? e.id_nodo_hijo : 
                                 (String(e.id_nodo_padre) === lId ? e.id_nodo_hijo : e.id_nodo_padre));

                if (isDeleted && matchesContext) {
                    isDeletedInDraft = true;
                    continue;
                }
                
                if (isDeleted) continue;
                if (isDraft && !matchesContext) continue;
                
                if (isDraftPass === isDraft) {
                    activeId = targetId;
                }
            }
        };

        let edgesToProcess = [];
        if (relationType === 'padre') {
            edgesToProcess = _graphIndex.byDestino[lId] || [];
        } else if (relationType === 'hijo') {
            edgesToProcess = _graphIndex.byOrigen[lId] || [];
        } else {
            edgesToProcess = [...(_graphIndex.byDestino[lId] || []), ...(_graphIndex.byOrigen[lId] || [])];
        }

        processEdges(edgesToProcess, false); // Pass 1: Global/Approved
        processEdges(edgesToProcess, true);  // Pass 2: Draft overrides
        
        return isDeletedInDraft ? null : activeId;
    }

    /**
     * Resolves ALL linked Entity IDs across a temporal graph edge (for 1:N or M:N relationships).
     * 
     * @param {string} localRecordId - The ID of the record traversing the graph
     * @param {string} edgeType - The relationship identifier
     * @param {string} contextId - Optional context ID to include draft edges
     * @param {boolean} strictContext - If true, restricts to contextId
     * @param {string} relationType - Optional 'padre' or 'hijo' to restrict traversal direction
     * @returns {Array<string>} An array of linked record IDs
     */
    function resolveAllLinkedIds(localRecordId, edgeType, contextId = null, strictContext = false, relationType = null) {
        if (!_graphIndex) _buildIndex();
        if (!_graphIndex) return [];

        const lId = String(localRecordId);
        const activeIds = new Set();
        const removedIds = new Set(); // To track edges deleted in the draft

        const processEdges = (edges, isDraftPass) => {
            if (!edges) return;
            edges.forEach(e => {
                if (e.tipo_relacion !== edgeType) return;
                if (e.es_version_actual === false) return;
                
                const estadoLower = String(e.estado || '').toLowerCase().trim();
                const isDraft = estadoLower === 'borrador';
                const isDeleted = estadoLower === 'eliminado';
                const matchesContext = !!contextId && String(e.contexto_id) === String(contextId);
                
                // If we are in strictContext, we ONLY consider:
                // 1. Draft/Deleted edges from THIS context
                // 2. Global edges (if we are allowing them to be merged and not deleted)
                if (strictContext && isDraft && !matchesContext) return;
                if (strictContext && isDeleted && !matchesContext) return;
                
                // If it's a context deletion override
                const targetId = relationType === 'padre' ? e.id_nodo_padre : 
                                 (relationType === 'hijo' ? e.id_nodo_hijo : 
                                 (String(e.id_nodo_padre) === lId ? e.id_nodo_hijo : e.id_nodo_padre));

                if (isDeleted && matchesContext) {
                    removedIds.add(String(targetId));
                    return;
                }
                
                if (isDeleted) return; // Ignore global deleted edges
                
                // If it's a draft from another context, ignore it
                if (isDraft && !matchesContext) return;
                
                // If strictContext is true, should we hide global edges entirely?
                // No, we must show them if they haven't been removed in the current draft.
                // We add it to activeIds, and later we will filter out removedIds.
                if (isDraftPass === isDraft) {
                    activeIds.add(String(targetId));
                }
            });
        };

        let edgesToProcess = [];
        if (relationType === 'padre') {
            edgesToProcess = _graphIndex.byDestino[lId] || [];
        } else if (relationType === 'hijo') {
            edgesToProcess = _graphIndex.byOrigen[lId] || [];
        } else {
            edgesToProcess = [...(_graphIndex.byDestino[lId] || []), ...(_graphIndex.byOrigen[lId] || [])];
        }

        // Pass 1: Global/Approved edges
        processEdges(edgesToProcess, false);
        // Pass 2: Draft overrides (Additions and Deletions)
        processEdges(edgesToProcess, true);

        // Filter out any IDs that were explicitly removed in the draft
        const results = [];
        activeIds.forEach(id => {
            if (!removedIds.has(id)) {
                results.push(id);
            }
        });

        return results;
    }

    /**
     * Forces an index rebuild (typically bound to AppEventBus DATASTORE::CHANGED)
     */
    function invalidateIndex() {
        _graphIndex = null;
    }

    /**
     * Extracts target entity schema metadata robustly with fallback.
     */
    function getTemporalEdgeMeta(entityName, fieldName) {
        if (!entityName || !window.APP_SCHEMAS) return null;
        const targetSchema = window.APP_SCHEMAS[entityName];
        if (!targetSchema) return null;

        const fieldsArr = targetSchema.fields || Object.keys(targetSchema).filter(k => typeof targetSchema[k] === 'object').map(k => targetSchema[k]);
        const sFieldMeta = fieldsArr.find(f => f.name === fieldName);
        
        if (sFieldMeta && sFieldMeta.isTemporalGraph && sFieldMeta.graphEdgeType) {
            return sFieldMeta;
        }
        return null;
    }

    // Auto-subscribe to DataStore changes to maintain memory efficiency
    if (typeof window !== 'undefined') {
        const bindAppEventBus = () => {
            if (window.AppEventBus) {
                window.AppEventBus.subscribe('DATASTORE::CHANGED', (payload) => {
                    if (payload && payload.entityName === 'Sys_Graph_Edges') {
                        invalidateIndex();
                    }
                });
                window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', () => {
                    invalidateIndex();
                });
            } else {
                setTimeout(bindAppEventBus, 50); // Retry if not yet loaded
            }
        };
        bindAppEventBus();
    }

    /**
     * S55.3/S55.4 - Graph Diffing Engine (Client)
     * Compares active topology against draft topology to calculate additions, removals, and kept edges.
     * Pure function, no side effects.
     * @param {Array} activeEdges - Edges currently in production (es_version_actual: true).
     * @param {Array} draftEdges - Edges in the current draft workspace.
     * @returns {Object} { additions: [], removals: [], kept: [] }
     */
    function computeDelta(activeEdges, draftEdges, contextId) {
        const delta = { additions: [], removals: [], kept: [] };
        
        // Pure edge topology signature
        const getHash = (e) => `${e.id_nodo_padre}::${e.id_nodo_hijo}::${e.tipo_relacion}`;
        
        // Compound child-relation signature (for 1:N rules)
        const getChildRelHash = (e) => `${e.id_nodo_hijo}::${e.tipo_relacion}`;

        const draftMap = new Map();
        const draftChildRelSet = new Set();
        
        (draftEdges || []).forEach(e => {
            const hash = getHash(e);
            draftMap.set(hash, e);
            draftChildRelSet.add(getChildRelHash(e));
        });
        
        const activeMap = new Map();
        (activeEdges || []).forEach(e => {
            const hash = getHash(e);
            activeMap.set(hash, e);
            
            // Is this edge being overridden by 1:N rule?
            // If the draft contains this child+relType, but the full hash is NOT in draftMap,
            // it means the draft is pointing this child to a DIFFERENT parent.
            // This is a Topology Override Removal.
            const childRelHash = getChildRelHash(e);
            const isTopologyOverride = draftChildRelSet.has(childRelHash) && !draftMap.has(hash);
            
            // Is this edge explicitly deleted from the current context?
            const isContextRemoval = String(e.contexto_id) === String(contextId) && !draftMap.has(hash);
            
            if (isTopologyOverride || isContextRemoval) {
                delta.removals.push(e);
            }
        });
        
        // Find Additions and Kept
        (draftEdges || []).forEach(e => {
            const hash = getHash(e);
            if (activeMap.has(hash)) {
                delta.kept.push(e);
            } else {
                delta.additions.push(e);
            }
        });
        
        return delta;
    }

    function upsertTemporalEdge(parentId, childId, edgeType, contextId) {
        if (!window.DataStore) return;
        const edges = window.DataStore.get('Sys_Graph_Edges') || [];
        
        const existing = edges.find(e => 
            String(e.id_nodo_padre) === String(parentId) && 
            String(e.id_nodo_hijo) === String(childId) && 
            e.tipo_relacion === edgeType &&
            String(e.contexto_id) === String(contextId)
        );
        
        if (existing) {
            existing.estado = 'Borrador';
            existing.es_version_actual = true;
        } else {
            edges.push({
                id_registro: `TEMP_EDGE_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                id_nodo_padre: parentId,
                id_nodo_hijo: childId,
                tipo_relacion: edgeType,
                estado: 'Borrador',
                es_version_actual: true,
                contexto_id: contextId
            });
        }
        
        window.DataStore.set('Sys_Graph_Edges', edges);
        invalidateIndex();
    }

    function deleteTemporalEdge(parentId, childId, edgeType, contextId) {
        if (!window.DataStore) return;
        const edges = window.DataStore.get('Sys_Graph_Edges') || [];
        
        const existingIdx = edges.findIndex(e => 
            String(e.id_nodo_padre) === String(parentId) && 
            String(e.id_nodo_hijo) === String(childId) && 
            e.tipo_relacion === edgeType &&
            String(e.contexto_id) === String(contextId)
        );
        
        if (existingIdx >= 0) {
            if (edges[existingIdx].estado === 'Borrador') {
                edges.splice(existingIdx, 1);
            } else {
                edges[existingIdx].estado = 'Eliminado';
            }
        } else {
            const activeEdge = edges.find(e => 
                String(e.id_nodo_padre) === String(parentId) && 
                String(e.id_nodo_hijo) === String(childId) && 
                e.tipo_relacion === edgeType &&
                e.es_version_actual === true
            );
            if (activeEdge) {
                edges.push({
                    id_registro: `TEMP_EDGE_DEL_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,
                    id_nodo_padre: parentId,
                    id_nodo_hijo: childId,
                    tipo_relacion: edgeType,
                    estado: 'Eliminado',
                    es_version_actual: true,
                    contexto_id: contextId,
                    metadata: { replaces: activeEdge.id_registro }
                });
            }
        }
        
        window.DataStore.set('Sys_Graph_Edges', edges);
        invalidateIndex();
    }

    return {
        resolveLinkedId,
        resolveAllLinkedIds,
        invalidateIndex,
        getTemporalEdgeMeta,
        computeDelta,
        upsertTemporalEdge,
        deleteTemporalEdge
    };
})();
