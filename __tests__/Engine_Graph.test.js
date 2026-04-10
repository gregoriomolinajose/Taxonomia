const { Engine_Graph } = require('../src/Engine_Graph');

describe('S6.5: Diccionario de Topologías Polimórfico (Strategy Pattern + Auto-Close)', () => {

    test('Escenario 1: Hard Error - Strategy 1:N (Lineal) rechaza payload malicioso que excede límite', () => {
        const incomingEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-CHILD' },
            { id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-CHILD' }
        ];
        const currentActiveEdges = []; // BD Vacía

        expect(() => {
            Engine_Graph.patchSCD2Edges(incomingEdges, currentActiveEdges, '1:N');
        }).toThrow("Topología 1:N violada en Payload: El mismo nodo hijo ('DOM-CHILD') fue proveído múltiples veces hacia distintos padres en una sola petición de guardado masivo.");
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

        let result;
        expect(() => {
            result = Engine_Graph.patchSCD2Edges(incomingEdges, currentActiveEdges, '1:N');
        }).not.toThrow();
        let edgesToClose = result.edgesToClose;

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

        let result;
        expect(() => {
            result = Engine_Graph.patchSCD2Edges(incomingEdges, currentActiveEdges, 'M:N');
        }).not.toThrow();
        let edgesToClose = result.edgesToClose;
        
        // Cierres
        expect(edgesToClose.length).toBe(1);
        expect(edgesToClose[0].id_nodo_padre).toBe('DOM-B'); // B fue removido del subset matricial

        // Inicializados (solo al nuevo se le inyecta data inicial, el A ya existe, el sistema asume que la DB lo persiste intocado)
        expect(incomingEdges.find(e => e.id_nodo_padre === 'DOM-C').es_version_actual).toBe(true);
    });

    test('Escenario 4: Orphan Stealing via analyzeTopology con enforceSingleParent', () => {
        const incomingEdges = [
            { id_nodo_padre: 'UN-1', id_nodo_hijo: 'PORT-1' } 
        ];
        // En DB, PORT-1 ya pertenece a UN-2
        const currentActiveEdges = [
            { id_nodo_padre: 'UN-2', id_nodo_hijo: 'PORT-1', es_version_actual: true, tipo_relacion: 'UN_PORT' }
        ];

        // Simulamos el topologyRules transformado por Engine_DB
        const rules = {
            enforceSingleParent: true,
            edgeType: 'UN_PORT'
        };

        const result = Engine_Graph.analyzeTopology(incomingEdges, currentActiveEdges, rules);
        
        // Debería identificar la relación con UN-2 como un stolenEdge (robado por UN-1)
        expect(result.stolenEdges).toBeDefined();
        expect(result.stolenEdges.length).toBe(1);
        expect(result.stolenEdges[0].id_nodo_padre).toBe('UN-2');
    });

    test('Escenario 5: Detección de Ciclo (preventCycles)', () => {
        const incomingEdges = [{ id_nodo_padre: 'DOM-3', id_nodo_hijo: 'DOM-1' }];
        const currentActiveEdges = [
            { id_nodo_padre: 'DOM-1', id_nodo_hijo: 'DOM-2' },
            { id_nodo_padre: 'DOM-2', id_nodo_hijo: 'DOM-3' }
        ];
        const rules = { preventCycles: true };

        expect(() => {
            Engine_Graph.analyzeTopology(incomingEdges, currentActiveEdges, rules);
        }).toThrow(/Detección de Ciclo \(DAG\)/);
    });

    test('Escenario 6: Limite de Profundidad Máxima (maxDepth)', () => {
        const incomingEdges = [{ id_nodo_padre: 'DOM-2', id_nodo_hijo: 'DOM-X' }];
        const currentActiveEdges = [
            { id_nodo_padre: 'DOM-1', id_nodo_hijo: 'DOM-2' },
            { id_nodo_padre: 'DOM-X', id_nodo_hijo: 'DOM-Y' }
        ];
        // En total, la rama DOM-1 -> DOM-2 -> DOM-X -> DOM-Y = 4 niveles (depth: 3)
        // If max depth is 1, inserting DOM-2 -> DOM-X should fail.
        const rules = { preventCycles: true, maxDepth: 1 };

        expect(() => {
            Engine_Graph.analyzeTopology(incomingEdges, currentActiveEdges, rules);
        }).toThrow(/Profundidad Máxima Excedida/);
    });

    test('Escenario 7: Colisión de Hermanos Idempotente (NO-OP)', () => {
        const incomingEdges = [{ id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-Z' }];
        const currentActiveEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-Z' } // Z already child of A
        ];
        const rules = { siblingCollisionCheck: true };

        // Una re-declaración exacta debe ser percibida como idempotente.
        expect(() => {
            Engine_Graph.analyzeTopology(incomingEdges, currentActiveEdges, rules);
        }).not.toThrow();
    });

    test('Escenario 7b: Colisión de Hermanos Verdadera (Payload Duplicado)', () => {
        const incomingEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-Z' },
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-Z' }
        ];
        const currentActiveEdges = [];
        const rules = { siblingCollisionCheck: true };

        expect(() => {
            Engine_Graph.analyzeTopology(incomingEdges, currentActiveEdges, rules);
        }).toThrow(/Colisión de Hermanos: Payload contiene relaciones duplicadas/);
    });

    test('Escenario 8: Exclusividad Rígida - Zero Trust (allowOrphanStealing: false)', () => {
        const incomingEdges = [{ id_nodo_padre: 'DOM-B', id_nodo_hijo: 'DOM-Z' }];
        const currentActiveEdges = [
            { id_nodo_padre: 'DOM-A', id_nodo_hijo: 'DOM-Z' }
        ];
        const rules = { enforceSingleParent: true, allowOrphanStealing: false };

        expect(() => {
            Engine_Graph.analyzeTopology(incomingEdges, currentActiveEdges, rules);
        }).toThrow(/Exclusividad de Orfandad/);
    });
});

