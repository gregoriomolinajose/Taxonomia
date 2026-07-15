/**
 * Topology_Strategies.js
 * Handlers policy maps for domain-specific graph topology closures.
 */

const TOPOLOGY_UTILS = {
    getActive: function(edges) {
        if (typeof window !== 'undefined' && window.Math_Engine && window.Math_Engine.TopologyGuard) return window.Math_Engine.TopologyGuard.getActiveEdges(edges);
        return edges.filter(e => e.es_version_actual !== false && String(e.es_version_actual).toUpperCase() !== 'FALSE');
    },
    buildCompoundKey: function(childId, relType) {
        return String(childId ?? '') + "::" + String(relType ?? '');
    },
    buildFullKey: function(parentId, childId, relType) {
        return String(parentId ?? '') + "::" + String(childId ?? '') + "::" + String(relType ?? '');
    }
};

const strategy_1toN = function(incomingEdges, currentActiveEdges) {

    if (!Array.isArray(incomingEdges) || incomingEdges.length === 0) {
        return { edgesToClose: Array.isArray(currentActiveEdges) ? TOPOLOGY_UTILS.getActive(currentActiveEdges) : [] };
    }


    const incomingChildSet = new Set();
    const payloadMap = new Map();
    const uniqueIncomingEdges = [];
    
    incomingEdges.forEach(e => {
        const childId = String(e.id_nodo_hijo ?? '');
        const parentId = String(e.id_nodo_padre ?? '');
        const relType = String(e.tipo_relacion ?? '');
        if (!childId) return;
        
        const compoundKey = TOPOLOGY_UTILS.buildCompoundKey(childId, relType);
        
        if (incomingChildSet.has(compoundKey)) {
            // Evitamos arrojar un Error duro para no congelar el ETL / Sync Job.
            if (typeof Logger !== 'undefined') Logger.log("Topología 1:N violada en Payload: El mismo nodo hijo ('" + childId + "') fue proveído múltiples veces hacia distintos padres en la relación '" + relType + "'. Se omitirá la arista duplicada.");
            return;
        }
        incomingChildSet.add(compoundKey);
        payloadMap.set(compoundKey, parentId);
        uniqueIncomingEdges.push(e);
    });

    if (!Array.isArray(currentActiveEdges) || currentActiveEdges.length === 0) return { edgesToClose: [], validEdges: uniqueIncomingEdges };
    
    // Auto-Close SCD-2 for 1:N relations (Hermetic scope tightly bound to O(1) Set)
    const actives = TOPOLOGY_UTILS.getActive(currentActiveEdges).filter(e => {
        const childId = String(e.id_nodo_hijo ?? '');
        const parentId = String(e.id_nodo_padre ?? '');
        const relType = String(e.tipo_relacion ?? '');
        const compoundKey = TOPOLOGY_UTILS.buildCompoundKey(childId, relType);
        
        // Only process children actively declared in the payload
        if (!incomingChildSet.has(compoundKey)) return false;
        
        // Idempotent Guard: Do not close the edge if it already points exactly to the incoming parent
        if (payloadMap.has(compoundKey) && payloadMap.get(compoundKey) === parentId) return false;
        
        return true;
    });
    
    return { edgesToClose: actives, validEdges: uniqueIncomingEdges };
};

const strategy_MtoN = function(incomingEdges, currentActiveEdges) {
    if (!Array.isArray(incomingEdges) || incomingEdges.length === 0) {
        return { edgesToClose: Array.isArray(currentActiveEdges) ? TOPOLOGY_UTILS.getActive(currentActiveEdges) : [] };
    }
    if (!Array.isArray(currentActiveEdges) || currentActiveEdges.length === 0) return { edgesToClose: [], validEdges: incomingEdges };

    const payloadMap = new Map();
    incomingEdges.forEach(e => {
        const child = String(e.id_nodo_hijo || '');
        const parent = String(e.id_nodo_padre || '');
        const relType = String(e.tipo_relacion ?? '');
        if (!child) return;
        
        const compoundKey = TOPOLOGY_UTILS.buildCompoundKey(child, relType);
        if (!payloadMap.has(compoundKey)) {
            payloadMap.set(compoundKey, new Set());
        }
        if (parent) {
            payloadMap.get(compoundKey).add(parent);
        }
    });

    const toClose = TOPOLOGY_UTILS.getActive(currentActiveEdges).filter(e => {
        const child = String(e.id_nodo_hijo || '');
        const parent = String(e.id_nodo_padre || '');
        const relType = String(e.tipo_relacion ?? '');
        const compoundKey = TOPOLOGY_UTILS.buildCompoundKey(child, relType);

        // Scope Binding O(1): Only process children actively declared in the payload FOR THIS RELATION
        if (!payloadMap.has(compoundKey)) return false;

        // Close explicitly omitted parents for this target child and relation type
        return !payloadMap.get(compoundKey).has(parent);
    });

    return { edgesToClose: toClose, validEdges: incomingEdges };
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
        let validIncomingEdges = incomingEdgesMock;

        // 1. Delegar a la Estrategia Topológica Inyectada (Polymorphism)
        const strategy = this[activeTopology];
        if (strategy && typeof strategy.evaluateTransition === 'function') {
            const result = strategy.evaluateTransition(incomingEdgesMock, activeGraph || []);
            edgesToClose = result.edgesToClose || [];
            if (result.validEdges) {
                validIncomingEdges = result.validEdges;
            }
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
                activeHash.add(TOPOLOGY_UTILS.buildFullKey(e.id_nodo_padre, e.id_nodo_hijo, e.tipo_relacion));
            }
        });

        const edgesToInsert = [];
        if (validIncomingEdges && validIncomingEdges.length > 0) {
            validIncomingEdges.forEach(child => {
                const fullKey = TOPOLOGY_UTILS.buildFullKey(child.id_nodo_padre, child.id_nodo_hijo, child.tipo_relacion);
                const isMatch = activeHash.has(fullKey);
                
                if (!isMatch) {
                    const uuidFn = (typeof Utilities !== 'undefined') ? Utilities.getUuid : () => Math.random().toString(36).substring(2,10);
                    const newId = "RELA-" + uuidFn().substring(0, 8).toUpperCase();
                    
                    edgesToInsert.push({
                        id_relacion: newId,
                        id_nodo_padre: String(child.id_nodo_padre),
                        id_nodo_hijo: String(child.id_nodo_hijo),
                        tipo_relacion: String(child.tipo_relacion ?? ''),
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
