const fs = require('fs');
const path = require('path');

// Primero cargamos Adapter_Sheets y mutamos sus métodos para asegurar el Mock a nivel Singleton de Node
const Adapter_Sheets = require('../src/Adapter_Sheets');
Adapter_Sheets.list = vi.fn();
Adapter_Sheets.remove = vi.fn();
Adapter_Sheets.upsert = vi.fn();

// Cargamos Engine_DB DESPUÉS para que obtenga el Adapter_Sheets con Mocks inyectados (aunque el objeto de Require_cache ya esté referenciado)
const Engine_DB = require('../src/Engine_DB');

global.Utilities = {
    getUuid: vi.fn(() => '11223344-5566-7788-9900')
};
global.Logger = { log: vi.fn() };
global._invalidateCache = vi.fn();

global.Engine_Graph = {
    buildDeletionPatch: vi.fn()
};
global.getEntityTopologyRules = vi.fn();

describe('Engine_DB Orchestration & DAG SCD-2', () => {

    beforeEach(() => {
        global.getAppSchema = vi.fn((ent) => ({ primaryKey: (ent === 'Portafolio' ? 'id_portafolio' : 'id_' + ent.toLowerCase()), fields: [] }));
        global.APP_SCHEMAS = new Proxy({}, { get: (target, prop) => ({ primaryKey: (prop === 'Portafolio' ? 'id_portafolio' : 'id_' + String(prop).toLowerCase()) }) });
        vi.clearAllMocks();
        Engine_DB.upsertBatch = vi.fn((entity, payload) => ({ status: 'success', handled: payload.length }));
    });

    describe('Engine_DB.delete (Unit of Work Orchestrations)', () => {
        it('should execute ORPHAN cascading logic using Graph.buildDeletionPatch', () => {
            global.getEntityTopologyRules.mockReturnValue({
                topologyType: 'POLY_TREE',
                deletionStrategy: 'ORPHAN'
            });

            const config = { useSheets: true };
            const activeGraphMock = [
                { id_relacion: 'R1', id_nodo_padre: 'X', id_nodo_hijo: 'TARGET', es_version_actual: true }
            ];

            Adapter_Sheets.list.mockReturnValue({ rows: activeGraphMock });

            global.Engine_Graph.buildDeletionPatch.mockReturnValue({
                edgesToClose: [{ id_relacion: 'R1' }],
                edgesToSpawn: [{ id_nodo_padre: 'GLOBAL_NULL', id_nodo_hijo: 'ORPHANED_NODE' }],
                nodesToDelete: ['TARGET']
            });

            const result = Engine_DB.delete('PadreLevel', 'TARGET');

            expect(global.getEntityTopologyRules).toHaveBeenCalledWith('PadreLevel');
            
            expect(global.Engine_Graph.buildDeletionPatch).toHaveBeenCalledWith('TARGET', 'ORPHAN', activeGraphMock);

            expect(Engine_DB.upsertBatch).toHaveBeenCalledWith('Sys_Graph_Edges', expect.any(Array), expect.objectContaining({ useSheets: true }));
            const edgeBatch = Engine_DB.upsertBatch.mock.calls[0][1];
            expect(edgeBatch.length).toBe(2);
            expect(edgeBatch[0].id_relacion).toBe('R1');
            expect(edgeBatch[0].es_version_actual).toBe(false);

            expect(edgeBatch[1].id_nodo_padre).toBe('GLOBAL_NULL');
            expect(edgeBatch[1].id_nodo_hijo).toBe('ORPHANED_NODE');
            expect(edgeBatch[1].es_version_actual).toBe(true);

            expect(Engine_DB.upsertBatch).toHaveBeenCalledWith('PadreLevel', expect.any(Array), expect.objectContaining({ useSheets: true }));
            const nodeBatch = Engine_DB.upsertBatch.mock.calls[1][1];
            expect(nodeBatch.length).toBe(1);
            expect(nodeBatch[0].estado).toBe('Eliminado');
            expect(nodeBatch[0].id_padrelevel).toBe('TARGET');
            
            expect(result.success).toBe(true);
        });
        
        it('should execute standard deletion if strictly FLAT topology', () => {
             global.getEntityTopologyRules.mockReturnValue({
                topologyType: 'FLAT'
            });
            Adapter_Sheets.remove.mockReturnValue({ status: 'removed' });

            const config = { useSheets: true };
            const result = Engine_DB.delete('CatalogoPlano', 'ID-123');

            expect(Adapter_Sheets.remove).toHaveBeenCalledWith('CatalogoPlano', 'ID-123', expect.objectContaining({ useSheets: true }));
            expect(Engine_DB.upsertBatch).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
        });
    });
});
