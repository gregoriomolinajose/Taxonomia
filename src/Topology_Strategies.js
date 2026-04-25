/**
 * Topology_Strategies.js
 * Handlers policy maps for domain-specific graph topology closures.
 */

const TOPOLOGY_UTILS = {
    getActive: function(edges) {
        if (typeof window !== 'undefined' && window.Math_Engine && window.Math_Engine.TopologyGuard) return window.Math_Engine.TopologyGuard.getActiveEdges(edges);
        return edges.filter(e => e.es_version_actual !== false && String(e.es_version_actual).toUpperCase() !== 'FALSE');
    }
};

const strategy_1toN = function(incomingEdges, currentActiveEdges) {

    if (!Array.isArray(incomingEdges) || incomingEdges.length === 0) {
        return { edgesToClose: Array.isArray(currentActiveEdges) ? TOPOLOGY_UTILS.getActive(currentActiveEdges) : [] };
    }


    const incomingChildSet = new Set();
    const payloadMap = new Map();
    incomingEdges.forEach(e => {
        const childId = String(e.id_nodo_hijo ?? '');
        const parentId = String(e.id_nodo_padre ?? '');
        if (!childId) return;
        
        if (incomingChildSet.has(childId)) {
            throw new Error("Topología 1:N violada en Payload: El mismo nodo hijo ('" + childId + "') fue proveído múltiples veces hacia distintos padres en una sola petición de guardado masivo.");
        }
        incomingChildSet.add(childId);
        payloadMap.set(childId, parentId);
    });

    if (!Array.isArray(currentActiveEdges) || currentActiveEdges.length === 0) return { edgesToClose: [] };
    
    // Auto-Close SCD-2 for 1:N relations (Hermetic scope tightly bound to O(1) Set)
    const actives = TOPOLOGY_UTILS.getActive(currentActiveEdges).filter(e => {
        const childId = String(e.id_nodo_hijo ?? '');
        const parentId = String(e.id_nodo_padre ?? '');
        
        // Only process children actively declared in the payload
        if (!incomingChildSet.has(childId)) return false;
        
        // Idempotent Guard: Do not close the edge if it already points exactly to the incoming parent
        if (payloadMap.has(childId) && payloadMap.get(childId) === parentId) return false;
        
        return true;
    });
    return { edgesToClose: actives };
};

const strategy_MtoN = function(incomingEdges, currentActiveEdges) {
    if (!Array.isArray(incomingEdges) || incomingEdges.length === 0) {
        return { edgesToClose: Array.isArray(currentActiveEdges) ? TOPOLOGY_UTILS.getActive(currentActiveEdges) : [] };
    }
    if (!Array.isArray(currentActiveEdges) || currentActiveEdges.length === 0) return { edgesToClose: [] };

    const payloadMap = new Map();
    incomingEdges.forEach(e => {
        const child = String(e.id_nodo_hijo || '');
        const parent = String(e.id_nodo_padre || '');
        if (!child) return;
        
        if (!payloadMap.has(child)) {
            payloadMap.set(child, new Set());
        }
        if (parent) {
            payloadMap.get(child).add(parent);
        }
    });

    const toClose = TOPOLOGY_UTILS.getActive(currentActiveEdges).filter(e => {
        const child = String(e.id_nodo_hijo || '');
        const parent = String(e.id_nodo_padre || '');

        // Scope Binding O(1): Only process children actively declared in the payload
        if (!payloadMap.has(child)) return false;

        // Close explicitly omitted parents for this target child
        return !payloadMap.get(child).has(parent);
    });

    return { edgesToClose: toClose };
};

const TOPOLOGY_STRATEGIES = {
    "1:N": { evaluateTransition: strategy_1toN },
    "M:N": { evaluateTransition: strategy_MtoN },

    /**
     * S44.18: Extraído de orchestrateNestedSave para prevenir duplicidad O(N).
     * @param {Array} incomingEdgesMock - Array of tentative edge objects
     * @param {Array} activeGraph - The current active edges from Sys_Graph_Edges
     * @param {String} cardinality - "1:N" or "M:N"
     * @returns {Object} { edgesToClose: [], edgesToInsert: [] }
     */
    calculateSCD2Transitions: function(incomingEdgesMock, activeGraph, cardinality) {
        const sysDate = new Date().toISOString();
        const activeTopology = cardinality || '1:N';
        let edgesToClose = [];

        // 1. Delegar a la Estrategia Topológica Inyectada (Polymorphism)
        const strategy = this[activeTopology];
        if (strategy && typeof strategy.evaluateTransition === 'function') {
            const result = strategy.evaluateTransition(incomingEdgesMock, activeGraph || []);
            edgesToClose = result.edgesToClose || [];
        }

        // 2. Transición SCD-2 (Auto-Close) - Aplicar Sello de Tiempo
        if (edgesToClose && edgesToClose.length > 0) {
            edgesToClose.forEach(o => {
                if (o.es_version_actual !== false) {
                    o.es_version_actual = false;
                    o.valido_hasta = sysDate;
                    o.updated_at = sysDate;
                }
            });
        }

        // 3. Diff O(1) para Novedades (Insertions)
        const activeHash = new Set();
        (activeGraph || []).forEach(e => {
            if (e.es_version_actual !== false) {
                activeHash.add(String(e.id_nodo_padre) + '::' + String(e.id_nodo_hijo) + '::' + String(e.tipo_relacion));
            }
        });

        const edgesToInsert = [];
        if (incomingEdgesMock && incomingEdgesMock.length > 0) {
            incomingEdgesMock.forEach(child => {
                const pId = String(child.id_nodo_padre);
                const cId = String(child.id_nodo_hijo);
                const relType = String(child.tipo_relacion);
                const isMatch = activeHash.has(pId + '::' + cId + '::' + relType);
                
                if (!isMatch) {
                    const uuidFn = (typeof Utilities !== 'undefined') ? Utilities.getUuid : () => Math.random().toString(36).substring(2,10);
                    const newId = "RELA-" + uuidFn().substring(0, 8).toUpperCase();
                    
                    edgesToInsert.push({
                        id_relacion: newId,
                        id_nodo_padre: pId,
                        id_nodo_hijo: cId,
                        tipo_relacion: relType,
                        valido_desde: child.valido_desde || sysDate,
                        valido_hasta: "",
                        es_version_actual: true,
                        estado: "Activo"
                    });
                }
            });
        }

        return { edgesToClose: edgesToClose, edgesToInsert: edgesToInsert };
    }
};

// Export for Node/Jest testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TOPOLOGY_STRATEGIES };
}
