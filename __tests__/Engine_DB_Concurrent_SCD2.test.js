const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets');

jest.mock('../src/Adapter_Sheets', () => ({
    list: jest.fn(),
    upsertBatch: jest.fn(),
    upsert: jest.fn()
}));

const { Engine_Graph } = require('../src/Engine_Graph');

global.APP_SCHEMAS = {
    HijoEntity: { primaryKey: 'id_hijo', fields: [{ name: 'nombre', type: 'string' }] },
    PadreEntity: {
        primaryKey: 'id_padre',
        fields: [{ name: 'nombre', type: 'string' }, {
            name: 'Subgrid_Hijos', type: 'relation', relationType: 'hijo',
            isTemporalGraph: true, graphEntity: 'Relacion_Dominios', targetEntity: 'HijoEntity',
            topologyCardinality: '1:N'
        }]
    }
};

global.getEntityTopologyRules = jest.fn(() => ({
    topologyType: "JERARQUICA_ESTRICTA", allowOrphanStealing: true, preventCycles: true
}));
global.Engine_Graph = Engine_Graph;
global.Utilities = { getUuid: () => 'MOCK-RACE-UUID' };
global._invalidateCache = jest.fn();

describe('S29.3: Destrucción, Historial y Race Conditions (Engine_DB)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Adapter_Sheets.upsert.mockReturnValue({ status: 'success' });
    });

    test('Race Condition: Optimistic Locking debe preservar el SCD-2 contra mutaciones fantasma', () => {
        // Estado Cero: El padre inicial tiene al hijo.
        const activeGraph = [
            { id_relacion: 'R1', id_nodo_padre: 'PADRE_ORIGINAL', id_nodo_hijo: 'HIJO_CODE', es_version_actual: true, tipo_relacion: 'SUBGRID_HIJOS', _version: 1 }
        ];

        // Se simula la base de datos entregando la verdad absoluta actual.
        Adapter_Sheets.list.mockReturnValue({ rows: activeGraph });

        // Simulación: El "Usuario A" pide reparentar HIJO_CODE a "PADRE_NUEVO_A"
        const payloadUsuarioA = { id_padre: 'PADRE_NUEVO_A', Subgrid_Hijos: ['HIJO_CODE'] };
        Engine_DB.create('PadreEntity', payloadUsuarioA);

        // Se espera que Engine_DB mande un update para cerrar R1 y un update para crear la arista de A
        expect(Adapter_Sheets.upsertBatch.mock.calls.length).toBeGreaterThanOrEqual(1);
        
        let allPatchedEdgesA = Adapter_Sheets.upsertBatch.mock.calls.flatMap(call => call[1]);
        
        const closedEdge = allPatchedEdgesA.find(r => r.id_relacion === 'R1');
        expect(closedEdge.es_version_actual).toBe(false);

        const newEdgeA = allPatchedEdgesA.find(r => r.id_nodo_padre === 'PADRE_NUEVO_A');
        expect(newEdgeA.es_version_actual).toBe(true);

        // Simulamos que la BD guarda efectivamente ese lote (A muta el Grafo real)
        activeGraph[0] = closedEdge; 
        activeGraph.push(newEdgeA);

        // Simulación de Race Condition Genuino (El Payload B salió antes que el A terminara y contenía RAM vieja estancada, pero pegará en la BD después del A)
        Adapter_Sheets.upsertBatch.mockClear();

        // El payload del Usuario B llega a la cola del Engine_DB... y DB va a re-hidratarse
        const payloadUsuarioB = { id_padre: 'PADRE_NUEVO_B', Subgrid_Hijos: ['HIJO_CODE'] };
        Engine_DB.create('PadreEntity', payloadUsuarioB);

        // Validamos que el Orquestador cerró la Relación A que le acababan de insertar
        expect(Adapter_Sheets.upsertBatch.mock.calls.length).toBeGreaterThanOrEqual(1);
        let allPatchedEdgesB = Adapter_Sheets.upsertBatch.mock.calls.flatMap(call => call[1]);
        
        const closedEdgeA = allPatchedEdgesB.find(r => r.id_nodo_padre === 'PADRE_NUEVO_A');
        expect(closedEdgeA.es_version_actual).toBe(false);

        const newEdgeB = allPatchedEdgesB.find(r => r.id_nodo_padre === 'PADRE_NUEVO_B');
        expect(newEdgeB.es_version_actual).toBe(true);
    });
});
