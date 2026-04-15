// __tests__/MasterDetail_Orchestration.test.js

/**
 * BDD Tests for Master-Detail Orchestration (Regla 15)
 * Verifies that Engine_DB handles nested payloads by injecting Parent PK into Children.
 */

const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets.js');
Adapter_Sheets.upsert = vi.fn();
Adapter_Sheets.upsertBatch = vi.fn();
Adapter_Sheets.list = vi.fn();
const { APP_SCHEMAS } = require('../src/Schema_Engine.gs');

// Inyectar APP_SCHEMAS en el entorno global para que Engine_DB lo encuentre (Regla 15)
global.APP_SCHEMAS = APP_SCHEMAS;

// Mock components

    
    // Regla QA 7: Validar físicamente que el método existe en el código real antes de testear
    if (typeof actual.upsertBatch !== 'function') {
        throw new Error("CRITICAL: upsertBatch NO existe en Adapter_Sheets.js. El test fallará por integridad.");
    }

    return {
        ...actual,
        upsert: vi.fn(),
        upsertBatch: vi.fn(actual.upsertBatch), // Mantenemos la referencia pero la envolvemos en un espía
        list: vi.fn()
    };
});

vi.mock('../src/Adapter_CloudDB', () => ({
    upsert: vi.fn()
}));

// Mock Logger and Google Globals for the test environment
global.Logger = { log: vi.fn() };

describe('Engine_DB Orchestration: Master-Detail (nested payloads)', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        // Isolating Schema from Human-Led overrides:
        global.APP_SCHEMAS.Portafolio = {
            primaryKey: 'id_portafolio',
            titleField: 'nombre',
            fields: [
                { name: 'id_portafolio', type: 'hidden', primaryKey: true },
                { name: 'grupos_hijos', type: 'relation', relationType: '1:N', targetEntity: 'Grupo_Productos', foreignKey: 'id_portafolio', uiBehavior: 'subgrid' }
            ]
        };
    });

    const mockConfig = { useSheets: true, useCloudDB: false };

    it('Should orchestrate a nested save: Parent first, then inject PK into Children', async () => {
        const nestedPayload = {
            id_portafolio: 'PORT-12345',
            nombre: 'Portafolio de Innovación',
            proposito: 'Pruebas de Orquestación',
            grupos_hijos: [
                { nombre: 'Grupo Alpha', descripcion: 'Primer hijo' },
                { nombre: 'Grupo Beta', descripcion: 'Segundo hijo' }
            ]
        };

        // 1. Mock Parent save
        Adapter_Sheets.upsert.mockImplementation((tableName, data) => {
            if (tableName === 'Portafolio') {
                return { status: 'success', action: 'inserted', data: { ...data } };
            }
            if (tableName === 'Grupo_Productos') {
                return { status: 'success', action: 'inserted' };
            }
            return { status: 'error' };
        });

        // 2. Execute Orchestrated Save
        // We assume we call create() or a new upsert() method that handles this
        const result = Engine_DB.create('Portafolio', nestedPayload);

        // ASERCIONES CLAVE:
        
        // A. Se debió llamar al adapter para el Padre
        expect(Adapter_Sheets.upsert).toHaveBeenCalledWith('Portafolio', expect.objectContaining({
            nombre: 'Portafolio de Innovación'
        }), expect.anything());

        // B. Se debió llamar al adapter para los Hijos (batch upsert)
        expect(Adapter_Sheets.upsertBatch).toHaveBeenCalledWith('Grupo_Productos', expect.anything(), expect.anything());

        // C. INYECCIÓN DE LLAVE FORÁNEA (Crucial):
        // El llamado a upsertBatch DEBE contener la id_portafolio del padre en los hijos
        const batchCall = Adapter_Sheets.upsertBatch.mock.calls.find(call => call[0] === 'Grupo_Productos');
        expect(batchCall[1]).toEqual(expect.arrayContaining([
            expect.objectContaining({ id_portafolio: 'PORT-12345' })
        ]));
    });
});
