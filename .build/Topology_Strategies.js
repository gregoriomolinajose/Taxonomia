/**
 * Topology_Strategies.js
 * Handlers policy maps for domain-specific graph topology closures.
 */

const strategy_1toN = function(incomingEdges, currentActiveEdges) {
    if (!Array.isArray(incomingEdges) || incomingEdges.length === 0) return { edgesToClose: [] };
    if (!Array.isArray(currentActiveEdges) || currentActiveEdges.length === 0) return { edgesToClose: [] };

    const incomingChildSet = new Set();
    incomingEdges.forEach(e => {
        const childId = String(e.id_nodo_hijo || '');
        if (!childId) return;
        
        if (incomingChildSet.has(childId)) {
            throw new Error("La regla de topología piramidal prohíbe relaciones cíclicas (no puedes asignar a un padre/ancestro como hijo)");
        }
        incomingChildSet.add(childId);
    });
    
    // Helper de resiliencia Topo lógica para evitar hardcoding
    const getActive = function(edges) {
        if (typeof window !== 'undefined' && window.TopologyGuard) return window.TopologyGuard.getActiveEdges(edges);
        // Fallback para ejecución en V8 Apps Script puro
        return edges.filter(e => e.es_version_actual !== false && String(e.es_version_actual).toUpperCase() !== 'FALSE');
    };
    
    // Auto-Close SCD-2 for 1:N relations (Hermetic scope tightly bound to O(1) Set)
    const actives = getActive(currentActiveEdges).filter(e => 
        incomingChildSet.has(String(e.id_nodo_hijo || ''))
    );
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
        if (typeof window !== 'undefined' && window.TopologyGuard) return window.TopologyGuard.getActiveEdges(edges);
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
