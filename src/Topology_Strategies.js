/**
 * Topology_Strategies.js
 * Handlers policy maps for domain-specific graph topology closures.
 */

const default1toNHandler = function(incomingEdges, currentActiveEdges) {
    if (incomingEdges.length > 1) {
        throw new Error("Violación de Topología: Payload excede el límite de padres simultáneos.");
    }
    
    // Auto-Close SCD-2 for 1:N relations
    const actives = currentActiveEdges.filter(e => e.es_version_actual !== false);
    return { edgesToClose: actives };
};

const defaultMtoNHandler = function(incomingEdges, currentActiveEdges) {
    const incomingIds = incomingEdges.map(e => String(e.id_nodo_padre || ''));
    // Close only the edges that were actively omitted by the incoming payload
    const toClose = currentActiveEdges.filter(e => e.es_version_actual !== false && !incomingIds.includes(String(e.id_nodo_padre || '')));
    return { edgesToClose: toClose };
};

const TOPOLOGY_STRATEGIES = {
    FUNCIONAL: { evaluateTransition: default1toNHandler },
    DIVISIONAL: { evaluateTransition: default1toNHandler },
    PLANA_HORIZONTAL: { evaluateTransition: defaultMtoNHandler },
    EQUIPOS: { evaluateTransition: defaultMtoNHandler },
    JERARQUICA_LINEAL: { evaluateTransition: default1toNHandler },
    JERARQUICA_MILITAR: { evaluateTransition: default1toNHandler },
    LINEA_STAFF: { evaluateTransition: defaultMtoNHandler },
    PROYECTOS: { evaluateTransition: defaultMtoNHandler },
    HIBRIDA_MATRICIAL: { evaluateTransition: defaultMtoNHandler }
};

// Export for Node/Jest testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TOPOLOGY_STRATEGIES };
}
