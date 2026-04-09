const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets');

// [Mocks]
jest.mock('../src/Adapter_Sheets', () => ({
    list: jest.fn(),
    upsertBatch: jest.fn(),
    upsert: jest.fn()
}));

const { Engine_Graph } = require('../src/Engine_Graph');

// Inject Global
global.APP_SCHEMAS = {
    HijoLevel: {
        primaryKey: 'id_hijo',
        fields: [
            { name: 'nombre', type: 'string' }
        ]
    },
    PadreLevel: {
        primaryKey: 'id_padre',
        fields: [
            { name: 'nombre', type: 'string' },
            {
                name: 'Subgrid_Hijos',
                type: 'relation',
                relationType: 'hijo',
                isTemporalGraph: true,
                graphEntity: 'Relacion_Dominios',
                targetEntity: 'HijoLevel',
                topologyCardinality: '1:N'
            }
        ]
    }
};

global.getEntityTopologyRules = jest.fn((entity) => {
    return {
        topologyType: "JERARQUICA_ESTRICTA",
        allowOrphanStealing: false,
        preventCycles: true
    };
});
global.Engine_Graph = Engine_Graph;
global.Utilities = { getUuid: () => 'MOCK-UUID' };

describe('S29.2: Políticas de Paternidad Estricta y Adopción (Engine_DB)', () => {
    
    beforeEach(() => {
        jest.clearAllMocks();
        Adapter_Sheets.upsert.mockReturnValue({ status: 'success' });
    });

    test('Debe BLOQUEAR la re-paternidad (Orphan Stealing = false) si el hijo ya tiene padre asignado', () => {
        const activeGraph = [
            { id_relacion: 'R1', id_nodo_padre: 'MOCK-PADRE-VIEJO', id_nodo_hijo: 'HIJO-TARGET', es_version_actual: true, tipo_relacion: 'SUBGRID_HIJOS' }
        ];

        // Se simula la DB devolviendo el Grafo Activo
        Adapter_Sheets.list.mockReturnValue({ rows: activeGraph });

        const incomingPayload = {
            id_padre: 'MOCK-PADRE-NUEVO',
            nombre: 'Padre Invasor',
            Subgrid_Hijos: ['HIJO-TARGET'] // Intento de robar el hijo
        };

        expect(() => {
            Engine_DB.create('PadreLevel', incomingPayload);
        }).toThrow(/Exclusividad de Orfandad: El nodo HIJO-TARGET ya pertenece a MOCK-PADRE-VIEJO/);

        // Asegurar de que la DB NO escribió NADA tras explotar la transacción
        expect(Adapter_Sheets.upsertBatch).not.toHaveBeenCalled();
        expect(Adapter_Sheets.upsert).not.toHaveBeenCalled();
    });

    test('Debe PERMITIR la inserción si el hijo NO tiene padre', () => {
        const activeGraph = []; // Grafo Vacío, nadie es dueño de HIJO-TARGET
        Adapter_Sheets.list.mockReturnValue({ rows: activeGraph });

        const incomingPayload = {
            id_padre: 'MOCK-PADRE-NUEVO',
            nombre: 'Padre Legitimo',
            Subgrid_Hijos: ['HIJO-TARGET']
        };

        expect(() => {
            Engine_DB.create('PadreLevel', incomingPayload);
        }).not.toThrow();

        // Tras validar, debió insertar al padre en su tabla, y a los hijos en Relacion_Dominios
        expect(Adapter_Sheets.upsert).toHaveBeenCalledWith('PadreLevel', expect.anything(), expect.anything());
        expect(Adapter_Sheets.upsertBatch).toHaveBeenCalledWith('Relacion_Dominios', expect.any(Array), expect.anything());
    });
});
