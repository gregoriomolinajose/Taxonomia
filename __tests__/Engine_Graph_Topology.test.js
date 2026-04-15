const { Engine_Graph } = require('../src/Engine_Graph');

describe('Engine_Graph - Topology Defenses (S8.2)', () => {
    
    test('Should allow valid edges with FLAT topology (fallback)', () => {
        const rules = { preventCycles: false, maxDepth: 0, siblingCollisionCheck: false };
        const incoming = [{ id_nodo_padre: 'A', id_nodo_hijo: 'B' }];
        const fullGraph = [];
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).not.toThrow();
    });

    test('Should prevent Sibling Collisions (duplicate active edge in same payload)', () => {
        const rules = { siblingCollisionCheck: true };
        const incoming = [{ id_nodo_padre: 'A', id_nodo_hijo: 'B' }, { id_nodo_padre: 'A', id_nodo_hijo: 'B' }];
        const fullGraph = [];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Colisión de Hermanos/);
    });

    test('Should prevent Cycles (DAG)', () => {
        const rules = { preventCycles: true };
        const fullGraph = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', es_version_actual: true },
            { id_nodo_padre: 'B', id_nodo_hijo: 'C', es_version_actual: true }
        ];
        const incoming = [{ id_nodo_padre: 'C', id_nodo_hijo: 'A' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Ruta circular: A -> C -> B -> A/);
    });

    test('Should detect and prevent Max Depth violations', () => {
        const rules = { maxDepth: 3 };
        const fullGraph = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', es_version_actual: true },
            { id_nodo_padre: 'B', id_nodo_hijo: 'C', es_version_actual: true }
        ];
        const incoming = [{ id_nodo_padre: 'C', id_nodo_hijo: 'D' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Ruta conflictiva: A -> B -> C -> D/);
    });

    test('Should deny orphan stealing if disabled in 1:N hierarchy', () => {
        const rules = { topologyType: "JERARQUICA_ESTRICTA", allowOrphanStealing: false };
        const fullGraph = [{ id_nodo_padre: 'A', id_nodo_hijo: 'Child1', es_version_actual: true }];
        const incoming = [{ id_nodo_padre: 'B', id_nodo_hijo: 'Child1' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Exclusividad de Orfandad/);
    });

    test('Should ALLOW orphan stealing if enabled in 1:N hierarchy', () => {
        const rules = { topologyType: "JERARQUICA_ESTRICTA", allowOrphanStealing: true };
        const fullGraph = [{ id_nodo_padre: 'A', id_nodo_hijo: 'Child1', es_version_actual: true }];
        const incoming = [{ id_nodo_padre: 'B', id_nodo_hijo: 'Child1' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).not.toThrow();
    });

    test('Should ALWAYS allow multiple parents in M:N topologies (No stealing)', () => {
        const rules = { topologyType: "RED_M_N", allowOrphanStealing: false };
        const fullGraph = [{ id_nodo_padre: 'A', id_nodo_hijo: 'Child1', es_version_actual: true }];
        const incoming = [{ id_nodo_padre: 'B', id_nodo_hijo: 'Child1' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).not.toThrow();
    });

    test('analyzeTopology should extract stolen edges to close for 1:N hierarchies in O(1)', () => {
        const rules = { topologyType: "JERARQUICA_ESTRICTA", allowOrphanStealing: true };
        const fullGraph = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'Child1', es_version_actual: true },
            { id_nodo_padre: 'C', id_nodo_hijo: 'Child2', es_version_actual: true }
        ];
        // B steals Child1. D is a new child.
        const incoming = [
            { id_nodo_padre: 'B', id_nodo_hijo: 'Child1' },
            { id_nodo_padre: 'B', id_nodo_hijo: 'D' }
        ];
        
        const result = Engine_Graph.analyzeTopology(incoming, fullGraph, rules);
        expect(result.stolenEdges.length).toBe(1);
        expect(result.stolenEdges[0].id_nodo_padre).toBe('A');
    });

    test('analyzeTopology should return EMPTY stolenEdges in M:N topology because stealing is bypassed', () => {
        const rules = { topologyType: "RED_M_N" };
        const fullGraph = [{ id_nodo_padre: 'A', id_nodo_hijo: 'Child1', es_version_actual: true }];
        const incoming = [{ id_nodo_padre: 'B', id_nodo_hijo: 'Child1' }];
        
        const result = Engine_Graph.analyzeTopology(incoming, fullGraph, rules);
        expect(result.stolenEdges.length).toBe(0);
    });

    test('Should allow valid multi-parent traversal in M:N topology (Poly-Tree)', () => {
        const rules = { preventCycles: true, maxDepth: 4, topologyType: "RED_M_N" };
        const fullGraph = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'Child1', es_version_actual: true },
            { id_nodo_padre: 'B', id_nodo_hijo: 'Child1', es_version_actual: true }
        ];
        // Inserting a child under Child1 should trace back through both A and B without error
        const incoming = [{ id_nodo_padre: 'Child1', id_nodo_hijo: 'Child2' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).not.toThrow();
    });

    test('Should prevent Cycles (DAG) via BFS in M:N topology when a secondary lineage forms a cycle', () => {
        const rules = { preventCycles: true, topologyType: "RED_M_N" };
        const fullGraph = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'Child1', es_version_actual: true },
            { id_nodo_padre: 'B', id_nodo_hijo: 'Child1', es_version_actual: true },
            { id_nodo_padre: 'Child1', id_nodo_hijo: 'Child2', es_version_actual: true }
        ];
        const incoming = [{ id_nodo_padre: 'Child2', id_nodo_hijo: 'B' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Ruta circular: B -> Child2 -> Child1 -> B/);
    });

    describe('Engine_Graph - S8.4 Deletion Strategies Unit of Work', () => {
        
        test('Should isolate exact edges in ORPHAN strategy without cascading nodes', () => {
            const activeGraph = [
                { id_relacion: 'R1', id_nodo_padre: 'A', id_nodo_hijo: 'B' },
                { id_relacion: 'R2', id_nodo_padre: 'D', id_nodo_hijo: 'B' },
                { id_relacion: 'R3', id_nodo_padre: 'B', id_nodo_hijo: 'C' }
            ];
            
            const patch = Engine_Graph.buildDeletionPatch('B', 'ORPHAN', activeGraph);
            
            expect(patch.nodesToDelete).toEqual(['B']);
            expect(patch.edgesToSpawn).toEqual([]);
            expect(patch.edgesToClose.length).toBe(3);
        });

        test('Should CASCADE strictly if the child has NO other active parents', () => {
             const activeGraph = [
                { id_relacion: 'R1', id_nodo_padre: 'A', id_nodo_hijo: 'B' },
                { id_relacion: 'R2', id_nodo_padre: 'B', id_nodo_hijo: 'C' },
                { id_relacion: 'R3', id_nodo_padre: 'C', id_nodo_hijo: 'Z' }
            ];
            
            const patch = Engine_Graph.buildDeletionPatch('B', 'CASCADE', activeGraph);
            
            // C and Z lose their ONLY ultimate parents in chain
            expect(patch.nodesToDelete).toContain('B');
            expect(patch.nodesToDelete).toContain('C');
            expect(patch.nodesToDelete).toContain('Z');
            expect(patch.nodesToDelete.length).toBe(3);
            
            expect(patch.edgesToClose.length).toBe(3); // R1, R2, R3 indirectly closed
        });

        test('Should PRESERVE child in CASCADE if it holds M:N co-parentage (Reference Counting)', () => {
            const activeGraph = [
                { id_relacion: 'R1', id_nodo_padre: 'A', id_nodo_hijo: 'B' },
                { id_relacion: 'R2', id_nodo_padre: 'B', id_nodo_hijo: 'C' }, // B is parent to C
                { id_relacion: 'R3', id_nodo_padre: 'D', id_nodo_hijo: 'C' }  // D is ALSO parent to C
            ];
            
            const patch = Engine_Graph.buildDeletionPatch('B', 'CASCADE', activeGraph);
            
            // C survives because it is anchored to D!
            expect(patch.nodesToDelete).toEqual(['B']); 
            expect(patch.edgesToSpawn).toEqual([]);
            
            // Edges tightly bound to B die
            const closedIds = patch.edgesToClose.map(e => e.id_relacion);
            expect(closedIds).toContain('R1');
            expect(closedIds).toContain('R2');
            expect(closedIds).not.toContain('R3');
        });

        test('Should perform NxM Cartesian Spawning for GRANDPARENT strategy', () => {
             const activeGraph = [
                { id_relacion: 'R1', id_nodo_padre: 'P1', id_nodo_hijo: 'X' },
                { id_relacion: 'R2', id_nodo_padre: 'P2', id_nodo_hijo: 'X' },
                { id_relacion: 'R3', id_nodo_padre: 'X', id_nodo_hijo: 'C1' },
                { id_relacion: 'R4', id_nodo_padre: 'X', id_nodo_hijo: 'C2' }
            ];
            
            const patch = Engine_Graph.buildDeletionPatch('X', 'GRANDPARENT', activeGraph);
            
            expect(patch.nodesToDelete).toEqual(['X']);
            
            // Cross product: (P1, P2) x (C1, C2) = 4 spawned edges
            expect(patch.edgesToSpawn.length).toBe(4);
            const spawnedPairs = patch.edgesToSpawn.map(e => `${e.id_nodo_padre}->${e.id_nodo_hijo}`);
            expect(spawnedPairs).toContain('P1->C1');
            expect(spawnedPairs).toContain('P1->C2');
            expect(spawnedPairs).toContain('P2->C1');
            expect(spawnedPairs).toContain('P2->C2');
        });
        
    });
});
