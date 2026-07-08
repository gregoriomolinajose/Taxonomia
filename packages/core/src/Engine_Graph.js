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
            parentsOf[childId].push({ id: pId, type: e.tipo_relacion });
            
            if (!edgesOf[childId]) edgesOf[childId] = [];
            edgesOf[childId].push(e);
            
            if (!childrenOf[pId]) childrenOf[pId] = [];
            childrenOf[pId].push({ id: childId, type: e.tipo_relacion });
        });
        
        const seenIncomingEdges = new Set();
        (incomingEdges || []).forEach(newEdge => {
            const childId = String(newEdge.id_nodo_hijo);
            const parentId = String(newEdge.id_nodo_padre);
            
            if (!childId || !parentId || parentId === 'undefined' || childId === 'undefined') return;

            // 1. Sibling Collision Check [Rule 11]
            if (rules.siblingCollisionCheck) {
                const edgeFingerprint = `${parentId}_${childId}`;
                // Prevención de duplicados INTRACARGA (En el mismo payload)
                if (seenIncomingEdges.has(edgeFingerprint)) {
                    throw new Error(`[Topology Error] Colisión de Hermanos: Payload contiene relaciones duplicadas para ${childId} bajo ${parentId}.`);
                }
                seenIncomingEdges.add(edgeFingerprint);
                
                // NOTA: No lanzamos error si la relación ya existe en la DB (parentsOf[childId].includes(parentId)).
                // S30: El enfoque Declarativo-SCD2 envía el estado ABSOLUTO de la grilla. Las aristas inmutadas 
                // ya presentes en DB llegarán por acá nativamente y Engine_Graph.patchSCD2Edges sabrá 
                // ignorarlas vía diffing delta sin generar colisiones ficticias.
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
                        if (p.type !== newEdge.tipo_relacion) continue;
                        const res = dfsTraversal(p.id, pathStack, memo);
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
                            if (c.type !== newEdge.tipo_relacion) return;
                            if (!visitedDown.has(c.id)) {
                                visitedDown.add(c.id);
                                const res = getSubtreeMaxDepth(c.id, visitedDown, memoDown);
                                const combinedDepth = 1 + res.depth;
                                if (combinedDepth > maxResult.depth) {
                                    maxResult = { depth: combinedDepth, path: [c.id, ...res.path] };
                                }
                                visitedDown.delete(c.id);
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
            if (rules.enforceSingleParent || rules.topologyType === "JERARQUICA_ESTRICTA" || rules.topologyType === "JERARQUICA_ORGANICA") {
                const childEdges = edgesOf[childId] || [];
                childEdges.forEach(oldEdge => {
                    if (oldEdge.tipo_relacion !== newEdge.tipo_relacion) return;
                    
                    const oldParent = String(oldEdge.id_nodo_padre);
                    if (oldParent !== parentId) {
                        if (rules.allowOrphanStealing === false) {
                            throw new Error(`[Topology Error] Exclusividad de Orfandad: El nodo ${childId} ya pertenece a ${oldParent} y el robo de nodos está deshabilitado.`);
                        }
                        result.stolenEdges.push(oldEdge);
                    }
                });
                // Wipe mapping locally so we don't double loop inside the same array iteration
                parentsOf[childId] = (parentsOf[childId] || []).filter(p => p.type !== newEdge.tipo_relacion);
                edgesOf[childId] = (edgesOf[childId] || []).filter(e => e.tipo_relacion !== newEdge.tipo_relacion);
            }
            // Assign temporary mapping to validate subsequent edges in the same payload
            if (!parentsOf[childId]) parentsOf[childId] = [];
            parentsOf[childId].push({ id: parentId, type: newEdge.tipo_relacion });
            
            if (!edgesOf[childId]) edgesOf[childId] = [];
            edgesOf[childId].push(newEdge);
            
            if (!childrenOf[parentId]) childrenOf[parentId] = [];
            childrenOf[parentId].push({ id: childId, type: newEdge.tipo_relacion });
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
        
        // 3. Diff O(1) para Novedades (Insertions)
        const activeHash = new Set();
        (currentActiveEdges || []).forEach(e => {
            if (e.es_version_actual !== false) {
                // Ensure strings for strict matching
                activeHash.add(String(e.id_nodo_padre) + '::' + String(e.id_nodo_hijo));
            }
        });

        const edgesToInsert = [];
        if (incomingEdges && incomingEdges.length > 0) {
            incomingEdges.forEach(child => {
                const pId = String(child.id_nodo_padre);
                const cId = String(child.id_nodo_hijo);
                const isMatch = activeHash.has(pId + '::' + cId);
                
                if (!isMatch) {
                    // Only stamp validity if exactly missing
                    child.valido_desde = child.valido_desde || sysDate;
                    child.valido_hasta = child.valido_hasta || "";
                    child.es_version_actual = child.es_version_actual !== undefined ? child.es_version_actual : true;
                    child.created_at = child.created_at || sysDate;
                    child.created_by = child.created_by || "UI_SUBGRID";
                    edgesToInsert.push(child);
                }
            });
        }
        
        return { edgesToClose, edgesToInsert };
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
    },

    /**
     * S55.3 - Graph Diffing Engine
     * Compares active topology against draft topology to calculate additions, removals, and kept edges.
     * Pure function, no side effects.
     * @param {Array} activeEdges - Edges currently in production (es_version_actual: true).
     * @param {Array} draftEdges - Edges in the current draft workspace.
     * @returns {Object} { additions: [], removals: [], kept: [] }
     */
    computeDelta: function(activeEdges, draftEdges) {
        const delta = { additions: [], removals: [], kept: [] };
        
        // Pure edge topology signature (ignoring internal PKs, workspace modes, timestamps)
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
};

// Export for Node/Jest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Engine_Graph };
}
