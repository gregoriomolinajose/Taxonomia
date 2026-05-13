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
            if (strictContext && contextId) {
                return String(e.contexto_id) === String(contextId);
            }
            if (e.estado === 'Borrador') {
                return contextId && String(e.contexto_id) === String(contextId);
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
            if (strictContext && contextId) {
                return String(e.contexto_id) === String(contextId);
            }
            if (e.estado === 'Borrador') {
                return contextId && String(e.contexto_id) === String(contextId);
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
    if (typeof window !== 'undefined' && window.addEventListener) {
        // Since we are likely initialized before AppEventBus binds standard listeners,
        // we expose a global bound method for manual triggering or dispatch listeners.
        window.addEventListener('DATASTORE::CHANGED', (e) => {
            if (e.detail && e.detail.entityName === 'Sys_Graph_Edges') {
                invalidateIndex();
            }
        });
    }

    return {
        resolveLinkedId,
        resolveAllLinkedIds,
        invalidateIndex,
        getTemporalEdgeMeta
    };
})();
