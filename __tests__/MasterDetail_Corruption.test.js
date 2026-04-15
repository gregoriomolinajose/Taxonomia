const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets.js');
Adapter_Sheets.upsert = vi.fn();
Adapter_Sheets.upsertBatch = vi.fn();
Adapter_Sheets.list = vi.fn();


vi.mock('../src/Adapter_CloudDB');

describe('Master-Detail Data Integrity & Hydration', () => {
    beforeEach(() => {
        global.getAppSchema = vi.fn((ent) => ({ primaryKey: (ent === 'Portafolio' ? 'id_portafolio' : 'id_' + ent.toLowerCase()), fields: [] }));
        vi.clearAllMocks();
        // Setup global mock for APP_SCHEMAS
        global.APP_SCHEMAS = {
            Portafolio: {
                primaryKey: 'id_portafolio',
                fields: [
                    { name: 'id_portafolio', type: 'hidden', primaryKey: true },
                    { name: 'nombre', type: 'text' },
                    { 
                        name: 'grupos_hijos', 
                        type: 'relation', 
                        targetEntity: 'Grupo_Productos', 
                        foreignKey: 'id_portafolio' 
                    }
                ]
            },
            Grupo_Productos: {
                primaryKey: 'id_grupo_producto',
                fields: [
                    { name: 'id_grupo_producto', type: 'text', primaryKey: true },
                    { name: 'nombre', type: 'text' },
                    { name: 'id_portafolio', type: 'text' }
                ]
            }
        };
        global.CONFIG = { useSheets: true, useCloudDB: false };
    });

    test('Bug 1: Children should receive unique IDs if missing', () => {
        const payload = {
            id_portafolio: 'PORT-123',
            nombre: 'Controlador Central',
            grupos_hijos: [
                { nombre: 'Hijo 1' },
                { nombre: 'Hijo 2' }
            ]
        };

        Engine_DB.orchestrateNestedSave('Portafolio', payload, global.CONFIG);

        // Verify Adapter_Sheets.upsertBatch was called with children having IDs
        const lastCall = Adapter_Sheets.upsertBatch.mock.calls[0];
        const children = lastCall[1];

        expect(children[0].id_grupo_producto).toBeDefined();
        expect(children[1].id_grupo_producto).toBeDefined();
        expect(children[0].id_grupo_producto).not.toBe(children[1].id_grupo_producto);
        expect(children[0].id_grupo_producto).toMatch(/^GRUP-/);
    });

    test('Bug 2: Batch saving should not overwrite (verified via call count)', () => {
        const children = [
            { id_grupo_producto: 'GRUP-1', nombre: 'N1', id_portafolio: 'PORT-1' },
            { id_grupo_producto: 'GRUP-2', nombre: 'N2', id_portafolio: 'PORT-1' }
        ];

        // Real Adapter_Sheets.upsertBatch calls upsert per item
        Adapter_Sheets.upsertBatch.mockImplementation((entity, items, config) => {
            items.forEach(item => Adapter_Sheets.upsert(entity, item, config));
        });

        Adapter_Sheets.upsertBatch('Grupo_Productos', children, global.CONFIG);

        expect(Adapter_Sheets.upsert).toHaveBeenCalledTimes(2);
    });

    test('Bug 3: Read single should hydrate relations', () => {
        // Mock list to return children for the hydration query
        Adapter_Sheets.list.mockImplementation((entity) => {
            if (entity === 'Grupo_Productos') {
                return {
                    headers: ['id_grupo_producto', 'nombre', 'id_portafolio'],
                    rows: [
                        { id_grupo_producto: 'GRUP-1', nombre: 'Hijo A', id_portafolio: 'PORT-100' },
                        { id_grupo_producto: 'GRUP-2', nombre: 'Hijo B', id_portafolio: 'PORT-100' },
                        { id_grupo_producto: 'GRUP-3', nombre: 'Hijo C', id_portafolio: 'PORT-200' }
                    ]
                };
            }
            if (entity === 'Portafolio') {
                return {
                    headers: ['id_portafolio', 'nombre'],
                    rows: [
                        { id_portafolio: 'PORT-100', nombre: 'Padre 100' }
                    ]
                };
            }
            return { headers: [], rows: [] };
        });

        const result = Engine_DB.readFull('Portafolio', 'PORT-100');

        expect(result.grupos_hijos).toBeDefined();
        expect(result.grupos_hijos.length).toBe(2);
        expect(result.grupos_hijos[0].nombre).toBe('Hijo A');
    });
});
