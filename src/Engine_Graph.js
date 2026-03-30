/**
 * Engine_Graph.js
 * Encapsulate all temporal edge logic (SCD-2) and topological cardinalities via Strategy Pattern.
 */

// Dynamic import handles both Jest and Apps Script V8 Environment without hoisting collisions
const Engine_Graph = {
    /**
     * S8.3.1 Algorithmic Refinement: Single-pass topological validation and orphan stealing extraction.
     * Throws an error on violations (cycles, collisions, depth).
     * Returns: { stolenEdges: Array }
     */
    analyzeTopology: function(incomingEdges, activeGraphEdges, rules) {
        const result = { stolenEdges: [] };
        if (!rules || typeof rules !== 'object') return result;

        const parentOf = {};
        const childrenOf = {};
        const edgeOf = {}; // O(1) retrieval for stolen edges
        
        (activeGraphEdges || []).forEach(e => {
            const childId = String(e.id_nodo_hijo);
            const pId = String(e.id_nodo_padre);
            parentOf[childId] = pId;
            edgeOf[childId] = e;
            if (!childrenOf[pId]) childrenOf[pId] = [];
            childrenOf[pId].push(childId);
        });
        
        (incomingEdges || []).forEach(newEdge => {
            const childId = String(newEdge.id_nodo_hijo);
            const parentId = String(newEdge.id_nodo_padre);
            
            if (!childId || !parentId || parentId === 'undefined' || childId === 'undefined') return;

            // 1. Sibling Collision Check [Rule 11]
            if (rules.siblingCollisionCheck) {
                if (childrenOf[parentId] && childrenOf[parentId].includes(childId)) {
                    throw new Error(`[Topology Error] Colisión de Hermanos: El nodo ${childId} ya existe como subordinado de ${parentId}.`);
                }
                const incomingDuplicates = incomingEdges.filter(e => String(e.id_nodo_padre) === parentId && String(e.id_nodo_hijo) === childId);
                if (incomingDuplicates.length > 1) {
                    throw new Error(`[Topology Error] Colisión de Hermanos: Payload contiene relaciones duplicadas para ${childId} bajo ${parentId}.`);
                }
            }

            // 2. Prevent Cycles (DAG) [Rule 7]
            if (rules.preventCycles) {
                let currentAncestor = parentId;
                const visited = new Set();
                while (currentAncestor && currentAncestor !== "" && currentAncestor !== "NULL") {
                    if (currentAncestor === childId) {
                        throw new Error(`[Topology Error] Detección de Ciclo (DAG): El nodo ${childId} no puede ser ancestro de su propio padre ${parentId}.`);
                    }
                    if (visited.has(currentAncestor)) break; // graph already has a cycle somewhere, avoid infinite loop
                    visited.add(currentAncestor);
                    currentAncestor = parentOf[currentAncestor];
                }
            }
            
            // 3. Max Depth Calculation [Rule 9]
            if (rules.maxDepth > 0) {
                let depthParent = 0;
                let current = parentId;
                const visitedUp = new Set();
                while (current && current !== "" && current !== "NULL") {
                    depthParent++;
                    if (visitedUp.has(current)) break;
                    visitedUp.add(current);
                    current = parentOf[current];
                }
                
                function getSubtreeMaxDepth(nodeId, visitedDown) {
                    if (!childrenOf[nodeId] || childrenOf[nodeId].length === 0) return 0;
                    let maxD = 0;
                    childrenOf[nodeId].forEach(c => {
                        if (!visitedDown.has(c)) {
                            visitedDown.add(c);
                            const d = 1 + getSubtreeMaxDepth(c, visitedDown);
                            if (d > maxD) maxD = d;
                            visitedDown.delete(c);
                        }
                    });
                    return maxD;
                }
                
                const depthChildTree = getSubtreeMaxDepth(childId, new Set([childId]));
                const totalDepth = depthParent + 1 + depthChildTree;
                
                if (totalDepth > rules.maxDepth) {
                    throw new Error(`[Topology Error] Profundidad Máxima Excedida: La vinculación genera una profundidad de ${totalDepth} niveles (Límite: ${rules.maxDepth}).`);
                }
            }
            
            // 4. Orphan Stealing Check & O(1) Extraction
            if (rules.topologyType === "JERARQUICA_ESTRICTA" || rules.topologyType === "JERARQUICA_ORGANICA") {
                const oldParent = parentOf[childId];
                if (oldParent && oldParent !== parentId) {
                    if (rules.allowOrphanStealing === false) {
                        throw new Error(`[Topology Error] Exclusividad de Orfandad: El nodo ${childId} ya pertenece a ${oldParent} y el robo de nodos está deshabilitado.`);
                    }
                    if (edgeOf[childId]) {
                        result.stolenEdges.push(edgeOf[childId]);
                    }
                }
            }

            // Assign temporary mapping to validate subsequent edges in the same payload
            parentOf[childId] = parentId;
            edgeOf[childId] = newEdge;
            if (!childrenOf[parentId]) childrenOf[parentId] = [];
            childrenOf[parentId].push(childId);
        });
        
        return result;
    },

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
        let STRATEGIES = null;
        if (typeof TOPOLOGY_STRATEGIES !== 'undefined') {
            STRATEGIES = TOPOLOGY_STRATEGIES;
        } else if (typeof require !== 'undefined') {
            STRATEGIES = require('./Topology_Strategies').TOPOLOGY_STRATEGIES;
        }

        if (activeTopology && STRATEGIES && STRATEGIES[activeTopology]) {
            const strategy = STRATEGIES[activeTopology];
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
