const { Engine_Graph } = require('../src/Engine_Graph');

describe('Engine_Graph.computeDelta', () => {
    it('should correctly identify additions, removals, and kept edges', () => {
        const activeEdges = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', tipo_relacion: 'REL_1', id_arista: 'ar1' },
            { id_nodo_padre: 'A', id_nodo_hijo: 'C', tipo_relacion: 'REL_1', id_arista: 'ar2' },
            { id_nodo_padre: 'B', id_nodo_hijo: 'D', tipo_relacion: 'REL_2', id_arista: 'ar3' }
        ];

        const draftEdges = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', tipo_relacion: 'REL_1', id_arista: 'draft1' }, // kept
            { id_nodo_padre: 'A', id_nodo_hijo: 'E', tipo_relacion: 'REL_1', id_arista: 'draft2' }, // added
            { id_nodo_padre: 'B', id_nodo_hijo: 'D', tipo_relacion: 'REL_2', id_arista: 'draft3' }  // kept
        ];

        // C is removed

        const delta = Engine_Graph.computeDelta(activeEdges, draftEdges);

        expect(delta.kept.length).toBe(2);
        expect(delta.kept.some(e => e.id_nodo_hijo === 'B')).toBe(true);
        expect(delta.kept.some(e => e.id_nodo_hijo === 'D')).toBe(true);

        expect(delta.additions.length).toBe(1);
        expect(delta.additions[0].id_nodo_hijo).toBe('E');

        expect(delta.removals.length).toBe(1);
        expect(delta.removals[0].id_nodo_hijo).toBe('C');
    });

    it('should handle empty active edges (all additions)', () => {
        const activeEdges = [];
        const draftEdges = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', tipo_relacion: 'REL_1' }
        ];

        const delta = Engine_Graph.computeDelta(activeEdges, draftEdges);
        expect(delta.additions.length).toBe(1);
        expect(delta.removals.length).toBe(0);
        expect(delta.kept.length).toBe(0);
    });

    it('should handle empty draft edges (all removals)', () => {
        const activeEdges = [
            { id_nodo_padre: 'A', id_nodo_hijo: 'B', tipo_relacion: 'REL_1' }
        ];
        const draftEdges = [];

        const delta = Engine_Graph.computeDelta(activeEdges, draftEdges);
        expect(delta.additions.length).toBe(0);
        expect(delta.removals.length).toBe(1);
        expect(delta.kept.length).toBe(0);
    });

    it('should handle completely empty inputs', () => {
        const delta = Engine_Graph.computeDelta(null, undefined);
        expect(delta.additions.length).toBe(0);
        expect(delta.removals.length).toBe(0);
        expect(delta.kept.length).toBe(0);
    });
});
