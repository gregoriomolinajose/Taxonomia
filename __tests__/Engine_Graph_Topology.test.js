const { Engine_Graph } = require('../src/Engine_Graph');

describe('Engine_Graph - Topology Defenses (S8.2)', () => {
    
    test('Should allow valid edges with FLAT topology (fallback)', () => {
        const rules = { preventCycles: false, maxDepth: 0, siblingCollisionCheck: false };
        const incoming = [{ id_nodo_padre: 'A', id_nodo_hijo: 'B' }];
        const fullGraph = [];
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).not.toThrow();
    });

    test('Should prevent Sibling Collisions (duplicate active edge)', () => {
        const rules = { siblingCollisionCheck: true };
        const incoming = [{ id_nodo_padre: 'A', id_nodo_hijo: 'B' }];
        const fullGraph = [{ id_nodo_padre: 'A', id_nodo_hijo: 'B', es_version_actual: true }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Colisión de Hermanos/);
    });

    test('Should prevent Cycles (DAG)', () => {
        const rules = { preventCycles: true };
        // Graph: A -> B -> C.  Incoming: C -> A (Creates A -> B -> C -> A)
        const fullGraph = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', es_version_actual: true },
            { id_nodo_padre: 'B', id_nodo_hijo: 'C', es_version_actual: true }
        ];
        const incoming = [{ id_nodo_padre: 'C', id_nodo_hijo: 'A' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Detección de Ciclo/);
    });

    test('Should detect and prevent Max Depth violations', () => {
        const rules = { maxDepth: 3 };
        const fullGraph = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', es_version_actual: true },
            { id_nodo_padre: 'B', id_nodo_hijo: 'C', es_version_actual: true }
        ];
        const incoming = [{ id_nodo_padre: 'C', id_nodo_hijo: 'D' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Profundidad Máxima/);
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
        // Incoming: Child2 -> B (This creates a cycle on the B lineage: B -> Child1 -> Child2 -> B)
        const incoming = [{ id_nodo_padre: 'Child2', id_nodo_hijo: 'B' }];
        
        expect(() => Engine_Graph.analyzeTopology(incoming, fullGraph, rules)).toThrow(/Ciclo infinito detectado en linaje M:N/);
    });
});
