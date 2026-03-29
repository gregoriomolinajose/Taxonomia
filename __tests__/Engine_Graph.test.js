const { Engine_Graph } = require('../src/Engine_Graph');

describe('S6.5: Diccionario de Topologías Polimórfico (Strategy Pattern + Auto-Close)', () => {

    test('Escenario 1: Hard Error - Strategy 1:N (Lineal) rechaza payload malicioso que excede límite', () => {
        const incomingEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD' },
            { id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-CHILD' }
        ];
        const currentActiveEdges = []; // BD Vacía

        expect(() => {
            Engine_Graph.patchSCD2Edges(incomingEdges, currentActiveEdges, 'JERARQUICA_LINEAL');
        }).toThrow('Violación de Topología: Payload excede el límite de padres simultáneos.');
    });

    test('Escenario 2: Auto-Close - Strategy evalúa transacción exitosa de reemplazo', () => {
        // Viene 1 nuevo padre en payload (respeta límite 1 de JERARQUICA_LINEAL)
        const incomingEdges = [
            { id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-CHILD' } 
        ];
        
        // BD retorna que 'DOM-A' es actualmente el jefe activo
        const currentActiveEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD', es_version_actual: true, valido_hasta: '' },
            { id_nodo_padre: 'DOM-Z', id_nodo_hijo: 'DOM-CHILD', es_version_actual: false, valido_hasta: 'Ayer' } // Historical
        ];

        let edgesToClose;
        expect(() => {
            edgesToClose = Engine_Graph.patchSCD2Edges(incomingEdges, currentActiveEdges, 'JERARQUICA_LINEAL');
        }).not.toThrow();

        // El motor determinó correctamente cerrar únicamente el que era activo (DOM-A)
        expect(edgesToClose.length).toBe(1);
        expect(edgesToClose[0].id_nodo_padre).toBe('DOM-A');
        
        // Verificamos que patcSCD2Edges les haya inyectado el cierre al devuelto
        expect(edgesToClose[0].es_version_actual).toBe(false);
        expect(edgesToClose[0].valido_hasta).not.toBe('');
        
        // Verificamos inicialización del nuevo payload
        expect(incomingEdges[0].es_version_actual).toBe(true);
        expect(incomingEdges[0].valido_desde).not.toBeUndefined();
    });

    test('Strategy M:N (Matricial/Proyectos) admite múltiples padres y solo cierra disidentes', () => {
        const incomingEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD' },
            { id_nodo_padre: 'DOM-C', id_nodo_hijo: 'DOM-CHILD' } // C is new
        ];
        
        // DB had A and B active
        const currentActiveEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD', es_version_actual: true, valido_hasta: '' },
            { id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-CHILD', es_version_actual: true, valido_hasta: '' }
        ];

        let edgesToClose;
        expect(() => {
            edgesToClose = Engine_Graph.patchSCD2Edges(incomingEdges, currentActiveEdges, 'HIBRIDA_MATRICIAL');
        }).not.toThrow();
        
        // Cierres
        expect(edgesToClose.length).toBe(1);
        expect(edgesToClose[0].id_nodo_padre).toBe('DOM-B'); // B fue removido del subset matricial

        // Inicializados (solo al nuevo se le inyecta data inicial, el A ya existe, el sistema asume que la DB lo persiste intocado)
        expect(incomingEdges.find(e => e.id_nodo_padre === 'DOM-C').es_version_actual).toBe(true);
    });
});
