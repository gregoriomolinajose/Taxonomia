const { Engine_Graph } = require('../src/Engine_Graph');

describe('S6.2: Diccionario de Topologías (SCD-2 Proxy)', () => {

    test('Escenario 1: Hard Error - Rechaza payload malicioso que excede límite 1:N', () => {
        const activeEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD' },
            { id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-CHILD' }
        ];
        const orphanEdges = [];

        expect(() => {
            Engine_Graph.patchSCD2Edges(activeEdges, orphanEdges, 'JERARQUICA_LINEAL');
        }).toThrow('Violación de Topología: Payload excede el límite de padres simultáneos.');
    });

    test('Escenario 2: Auto-Close Transición SCD-2 (Reemplazo exitoso sin Hard Error)', () => {
        // Viene 1 nuevo padre en payload (respeta límite 1 de JERARQUICA_LINEAL)
        const activeEdges = [
            { id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-CHILD' } // Nuevo jefe
        ];
        
        // DB arrojó el padre existente como orphan porque no está en payload
        const orphanEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD', es_version_actual: true, valido_hasta: '' }
        ];

        // Ensure it DOES NOT throw
        expect(() => {
            Engine_Graph.patchSCD2Edges(activeEdges, orphanEdges, 'JERARQUICA_LINEAL');
        }).not.toThrow();

        // Verificamos que se haya aplicado el Auto-Close al viejo
        expect(orphanEdges[0].es_version_actual).toBe(false);
        expect(orphanEdges[0].valido_hasta).not.toBe('');
        
        // Verificamos inicialización del nuevo
        expect(activeEdges[0].es_version_actual).toBe(true);
        expect(activeEdges[0].valido_desde).not.toBeUndefined();
    });

    test('Matricial/Proyectos admiten múltiples padres sin error', () => {
        const activeEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD' },
            { id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-CHILD' },
            { id_nodo_padre: 'DOM-C', id_nodo_hijo: 'DOM-CHILD' }
        ];
        const orphanEdges = [];

        expect(() => {
            Engine_Graph.patchSCD2Edges(activeEdges, orphanEdges, 'HIBRIDA_MATRICIAL');
            Engine_Graph.patchSCD2Edges(activeEdges, orphanEdges, 'PROYECTOS');
        }).not.toThrow();
        
        expect(activeEdges[0].es_version_actual).toBe(true);
    });
});
