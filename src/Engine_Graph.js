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

        const parentsOf = {};
        const childrenOf = {};
        const edgesOf = {}; // We store arrays because M:N can have multiple edges per child
        
        (activeGraphEdges || []).forEach(e => {
            const childId = String(e.id_nodo_hijo);
            const pId = String(e.id_nodo_padre);
            if (!parentsOf[childId]) parentsOf[childId] = [];
            parentsOf[childId].push(pId);
            
            if (!edgesOf[childId]) edgesOf[childId] = [];
            edgesOf[childId].push(e);
            
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

            // 2 & 3. Unified DFS Recursion (Cycles & Max Depth) [Rules 7 & 9]
            if (rules.preventCycles || rules.maxDepth > 0) {
                
                function dfsTraversal(currentNode, pathStack, memo) {
                    if (!currentNode || currentNode === "" || currentNode === "NULL") return { depth: 0, path: [] };
                    
                    if (rules.preventCycles && pathStack.has(currentNode)) {
                        const guiltyPath = Array.from(pathStack).join(' -> ') + ' -> ' + currentNode;
                        throw new Error(`[Topology Error] Detección de Ciclo (DAG): Infracción DAG: Ciclo infinito detectado en linaje M:N. Ruta circular: ${guiltyPath}`);
                    }
                    
                    if (memo.has(currentNode)) return memo.get(currentNode);
                    
                    pathStack.add(currentNode);
                    
                    const nextParents = parentsOf[currentNode] || [];
                    let maxResult = { depth: 0, path: [] };
                    
                    for (const p of nextParents) {
                        const res = dfsTraversal(p, pathStack, memo);
                        if (res.depth > maxResult.depth) maxResult = res;
                    }
                    
                    pathStack.delete(currentNode);
                    
                    const finalResult = { 
                        depth: 1 + maxResult.depth, 
                        path: [...maxResult.path, currentNode] 
                    };
                    memo.set(currentNode, finalResult);
                    return finalResult;
                }
                
                // Preseed pathSet with childId to detect if the new edge to parentId creates a cycle back to childId.
                const pathSet = new Set([childId]);
                const memoMap = new Map();
                const maxDepthUp = dfsTraversal(parentId, pathSet, memoMap);
                
                if (rules.maxDepth > 0) {
                    function getSubtreeMaxDepth(nodeId, visitedDown, memoDown) {
                        if (memoDown.has(nodeId)) return memoDown.get(nodeId);
                        
                        if (!childrenOf[nodeId] || childrenOf[nodeId].length === 0) {
                            const end = { depth: 0, path: [] };
                            memoDown.set(nodeId, end);
                            return end;
                        }
                        
                        let maxResult = { depth: 0, path: [] };
                        
                        childrenOf[nodeId].forEach(c => {
                            if (!visitedDown.has(c)) {
                                visitedDown.add(c);
                                const res = getSubtreeMaxDepth(c, visitedDown, memoDown);
                                const combinedDepth = 1 + res.depth;
                                if (combinedDepth > maxResult.depth) {
                                    maxResult = { depth: combinedDepth, path: [c, ...res.path] };
                                }
                                visitedDown.delete(c);
                            }
                        });
                        
                        memoDown.set(nodeId, maxResult);
                        return maxResult;
                    }
                    
                    const depthChildTree = getSubtreeMaxDepth(childId, new Set([childId]), new Map());
                    const totalDepth = maxDepthUp.depth + 1 + depthChildTree.depth;
                    
                    if (totalDepth > rules.maxDepth) {
                        const guiltyPath = [...maxDepthUp.path, childId, ...depthChildTree.path].join(' -> ');
                        throw new Error(`[Topology Error] Profundidad Máxima Excedida: La vinculación genera una profundidad de ${totalDepth} niveles (Límite: ${rules.maxDepth}). Ruta conflictiva: ${guiltyPath}`);
                    }
                }
            }
            
            // 4. Orphan Stealing Check & O(1) Extraction
            if (rules.topologyType === "JERARQUICA_ESTRICTA" || rules.topologyType === "JERARQUICA_ORGANICA") {
                const oldParents = parentsOf[childId] || [];
                oldParents.forEach(oldParent => {
                    if (oldParent !== parentId) {
                        if (rules.allowOrphanStealing === false) {
                            throw new Error(`[Topology Error] Exclusividad de Orfandad: El nodo ${childId} ya pertenece a ${oldParent} y el robo de nodos está deshabilitado.`);
                        }
                        const childEdges = edgesOf[childId] || [];
                        const oldEdge = childEdges.find(e => String(e.id_nodo_padre) === oldParent);
                        if (oldEdge) result.stolenEdges.push(oldEdge);
                    }
                });
                // Wipe arrays so we don't double loop inside the same array iteration
                parentsOf[childId] = [];
                edgesOf[childId] = [];
            }

            // Assign temporary mapping to validate subsequent edges in the same payload
            if (!parentsOf[childId]) parentsOf[childId] = [];
            parentsOf[childId].push(parentId);
            
            if (!edgesOf[childId]) edgesOf[childId] = [];
            edgesOf[childId].push(newEdge);
            
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
    patchSCD2Edges: function(incomingEdges, currentActiveEdges, topologyCardinality) {
        const sysDate = new Date().toISOString();
        const activeTopology = topologyCardinality || '1:N';
        
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
    },

    /**
     * S8.4 - M:N Deletion Strategies (Unit of Work Calculation)
     * Calculates the entire mathematical ripple effect of a node deletion 
     * without mutating the database, using Reference Counting for safe M:N pruning.
     * 
     * @param {string|number} targetNodeId 
     * @param {string} strategy (ORPHAN, CASCADE, GRANDPARENT)
     * @param {Array} activeGraph 
     * @returns {Object} { edgesToClose: [], edgesToSpawn: [], nodesToDelete: [] }
     */
    buildDeletionPatch: function(targetNodeId, strategy, activeGraph) {
        // [Pattern] Start with the exact target as the only guaranteed node deletion.
        const patch = {
            edgesToClose: [],
            edgesToSpawn: [],
            nodesToDelete: [targetNodeId] 
        };

        const parentsOf = {};
        const childrenOf = {};
        
        // Hash map O(N) indexing
        activeGraph.forEach(e => {
            if (!parentsOf[e.id_nodo_hijo]) parentsOf[e.id_nodo_hijo] = [];
            parentsOf[e.id_nodo_hijo].push(e.id_nodo_padre);
            
            if (!childrenOf[e.id_nodo_padre]) childrenOf[e.id_nodo_padre] = [];
            childrenOf[e.id_nodo_padre].push(e.id_nodo_hijo);
        });

        if (strategy === "ORPHAN" || !strategy) {
            patch.edgesToClose = activeGraph.filter(e => e.id_nodo_padre === targetNodeId || e.id_nodo_hijo === targetNodeId);
            return patch; 
        }

        if (strategy === "CASCADE") {
            // BFS with M:N Reference Counting for surviving branches
            let processQueue = [targetNodeId];
            let nodesToDeleteSet = new Set([targetNodeId]);
            let edgesToCloseSet = new Set();
            
            while (processQueue.length > 0) {
                const currentId = processQueue.shift();
                
                // 1. Collect touching edges
                activeGraph.forEach(e => {
                    if ((e.id_nodo_padre === currentId || e.id_nodo_hijo === currentId) && !edgesToCloseSet.has(e)) {
                        edgesToCloseSet.add(e);
                        patch.edgesToClose.push(e);
                    }
                });
                
                // 2. Reference counting children
                const children = childrenOf[currentId] || [];
                children.forEach(child => {
                    if (!nodesToDeleteSet.has(child)) {
                        // A child only dies if ALL of its parents are in the dying pool
                        const parents = parentsOf[child] || [];
                        const survivingParents = parents.filter(p => !nodesToDeleteSet.has(p));
                        
                        if (survivingParents.length === 0) {
                            nodesToDeleteSet.add(child);
                            processQueue.push(child);
                            patch.nodesToDelete.push(child);
                        }
                    }
                });
            }
            return patch;
        }

        if (strategy === "GRANDPARENT") {
            patch.edgesToClose = activeGraph.filter(e => e.id_nodo_padre === targetNodeId || e.id_nodo_hijo === targetNodeId);
            
            const children = childrenOf[targetNodeId] || [];
            const parents = parentsOf[targetNodeId] || [];
            
            // Cartesian product NxM for poly-tree skipping
            parents.forEach(pId => {
                children.forEach(cId => {
                    // Prevent M:N SCD-2 collisions (if the grandparent already directly governs the child)
                    const alreadyExists = activeGraph.some(e => e.id_nodo_padre === pId && e.id_nodo_hijo === cId);
                    if (!alreadyExists) {
                        patch.edgesToSpawn.push({
                            id_nodo_padre: pId,
                            id_nodo_hijo: cId
                        });
                    }
                });
            });
            return patch;
        }

        return patch; // Fallback for unknown strategies
    }
};

// Export for Node/Jest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Engine_Graph };
}
