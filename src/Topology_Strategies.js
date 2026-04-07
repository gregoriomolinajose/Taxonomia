/**
 * Topology_Strategies.js
 * Handlers policy maps for domain-specific graph topology closures.
 */

const strategy_1toN = function(incomingEdges, currentActiveEdges) {
    if (!Array.isArray(incomingEdges) || incomingEdges.length === 0) return { edgesToClose: [] };

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
    
    // Helper de resiliencia Topo lógica para evitar hardcoding
    const getActive = function(edges) {
        if (typeof window !== 'undefined' && window.Math_Engine && window.Math_Engine.TopologyGuard) return window.Math_Engine.TopologyGuard.getActiveEdges(edges);
        // Fallback para ejecución en V8 Apps Script puro
        return edges.filter(e => e.es_version_actual !== false && String(e.es_version_actual).toUpperCase() !== 'FALSE');
    };
    
    // Auto-Close SCD-2 for 1:N relations (Hermetic scope tightly bound to O(1) Set)
    const actives = getActive(currentActiveEdges).filter(e => {
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
    if (!Array.isArray(incomingEdges) || incomingEdges.length === 0) return { edgesToClose: [] };
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

    const getActive = function(edges) {
        if (typeof window !== 'undefined' && window.Math_Engine && window.Math_Engine.TopologyGuard) return window.Math_Engine.TopologyGuard.getActiveEdges(edges);
        return edges.filter(e => e.es_version_actual !== false && String(e.es_version_actual).toUpperCase() !== 'FALSE');
    };

    const toClose = getActive(currentActiveEdges).filter(e => {
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
    "M:N": { evaluateTransition: strategy_MtoN }
};

// Export for Node/Jest testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TOPOLOGY_STRATEGIES };
}
