/**
 * Engine_Graph.js
 * Encapsulate all temporal edge logic (SCD-2) and topological cardinalities via Strategy Pattern.
 */

// If running in Jest, require the strategies
if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    var { TOPOLOGY_STRATEGIES } = require('./Topology_Strategies');
}

const Engine_Graph = {
    /**
     * Patch SCD-2 metrics for edges based on topology Strategy Handlers.
     * @param {Array} incomingEdges Current edges to save/update (from UI payload)
     * @param {Array} currentActiveEdges ALL valid edges existing in the DB for this node
     * @param {String} topology The structure dictionary rule
     */
    patchSCD2Edges: function(incomingEdges, currentActiveEdges, topology) {
        const sysDate = new Date().toISOString();
        const activeTopology = topology || 'JERARQUICA_LINEAL';
        
        let edgesToClose = [];

        // 1. Delegar a la Estrategia Topológica Inyectada (Polymorphism)
        if (activeTopology && TOPOLOGY_STRATEGIES[activeTopology]) {
            const strategy = TOPOLOGY_STRATEGIES[activeTopology];
            if (typeof strategy.evaluateTransition === 'function') {
                const result = strategy.evaluateTransition(incomingEdges, currentActiveEdges || []);
                edgesToClose = result.edgesToClose || [];
            }
        }
        
        // 2. Transición SCD-2 (Auto-Close) - Sello de tiempo aplicado por el writer
        if (edgesToClose && edgesToClose.length > 0) {
            edgesToClose.forEach(o => {
                if (o.es_version_actual !== false) {
                    o.es_version_actual = false;
                    o.valido_hasta = sysDate;
                    o.updated_at = sysDate;
                }
            });
            if (typeof Logger !== 'undefined') Logger.log(`[Engine_Graph] Temporal edges closed: ${edgesToClose.length} orphans.`);
        }
        
        // 3. Process Active Edges (Open validity for new ones)
        if (incomingEdges && incomingEdges.length > 0) {
            incomingEdges.forEach(child => {
                if (!child.valido_desde) {
                    child.valido_desde = sysDate;
                    child.valido_hasta = "";
                    child.es_version_actual = true;
                    child.created_at = sysDate;
                    child.created_by = "UI_SUBGRID";
                }
            });
        }
        
        return edgesToClose;
    }
};

// Export for Node/Jest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Engine_Graph };
}
