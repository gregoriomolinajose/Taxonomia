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
     * Checks both directions (Origen <-> Destino).
     * 
     * @param {string} localRecordId - The ID of the record traversing the graph
     * @param {string} edgeType - The relationship identifier (e.g. 'CARGO_PERSONA')
     * @returns {string|null} The linked record ID, or null if not found
     */
    function resolveLinkedId(localRecordId, edgeType, contextId = null, strictContext = false) {
        if (!_graphIndex) _buildIndex();
        if (!_graphIndex) return null; // Fallback safely if DataStore is missing

        const lId = String(localRecordId);
        
        const isValidEdge = (e) => {
            if (e.tipo_relacion !== edgeType) return false;
            if (e.es_version_actual === false) return false;
            
            const estadoLower = String(e.estado || '').toLowerCase().trim();
            if (estadoLower === 'eliminado') return false;
            
            if (estadoLower === 'borrador') {
                return !!contextId && String(e.contexto_id) === String(contextId);
            }
            
            if (strictContext) {
                return !!contextId && String(e.contexto_id) === String(contextId);
            }
            
            return true;
        };

        // 1. Buscamos asumiendo que el ID local es el Destino
        if (_graphIndex.byDestino[lId]) {
            const match = _graphIndex.byDestino[lId].find(isValidEdge);
            if (match) return match.id_nodo_padre;
        }

        // 2. Buscamos asumiendo que el ID local es el Origen
        if (_graphIndex.byOrigen[lId]) {
            const match = _graphIndex.byOrigen[lId].find(isValidEdge);
            if (match) return match.id_nodo_hijo;
        }

        return null;
    }

    /**
     * Resolves ALL linked Entity IDs across a temporal graph edge (for 1:N or M:N relationships).
     * 
     * @param {string} localRecordId - The ID of the record traversing the graph
     * @param {string} edgeType - The relationship identifier
     * @param {string} contextId - Optional context ID to include draft edges
     * @returns {Array<string>} An array of linked record IDs
     */
    function resolveAllLinkedIds(localRecordId, edgeType, contextId = null, strictContext = false) {
        if (!_graphIndex) _buildIndex();
        if (!_graphIndex) return [];

        const lId = String(localRecordId);
        const results = [];

        const isValidEdge = (e) => {
            if (e.tipo_relacion !== edgeType) return false;
            if (e.es_version_actual === false) return false;
            
            const estadoLower = String(e.estado || '').toLowerCase().trim();
            if (estadoLower === 'eliminado') return false;
            
            if (estadoLower === 'borrador') {
                return !!contextId && String(e.contexto_id) === String(contextId);
            }
            
            if (strictContext) {
                return !!contextId && String(e.contexto_id) === String(contextId);
            }
            
            return true;
        };

        if (_graphIndex.byDestino[lId]) {
            _graphIndex.byDestino[lId].filter(isValidEdge).forEach(e => results.push(e.id_nodo_padre));
        }

        if (_graphIndex.byOrigen[lId]) {
            _graphIndex.byOrigen[lId].filter(isValidEdge).forEach(e => results.push(e.id_nodo_hijo));
        }

        return [...new Set(results)]; // Deduplicate
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
    function computeDelta(activeEdges, draftEdges) {
        const delta = { additions: [], removals: [], kept: [] };
        
        // Pure edge topology signature
        const getHash = (e) => `${e.id_nodo_padre}::${e.id_nodo_hijo}::${e.tipo_relacion}`;
        
        const activeMap = new Map();
        (activeEdges || []).forEach(e => {
            activeMap.set(getHash(e), e);
        });
        
        const draftMap = new Map();
        (draftEdges || []).forEach(e => {
            draftMap.set(getHash(e), e);
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
        
        // Find Removals
        (activeEdges || []).forEach(e => {
            const hash = getHash(e);
            if (!draftMap.has(hash)) {
                delta.removals.push(e);
            }
        });
        
        return delta;
    }

    return {
        resolveLinkedId,
        resolveAllLinkedIds,
        invalidateIndex,
        getTemporalEdgeMeta,
        computeDelta
    };
})();
