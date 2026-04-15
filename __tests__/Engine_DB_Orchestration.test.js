const fs = require('fs');
const path = require('path');

// Primero cargamos Adapter_Sheets y mutamos sus métodos para asegurar el Mock a nivel Singleton de Node
const Adapter_Sheets = require('../src/Adapter_Sheets');
Adapter_Sheets.list = vi.fn();
Adapter_Sheets.remove = vi.fn();
Adapter_Sheets.upsert = vi.fn();

// Cargamos Engine_DB DESPUÉS para que obtenga el Adapter_Sheets con Mocks inyectados (aunque el objeto de Require_cache ya esté referenciado)
const Engine_DB = require('../src/Engine_DB');

// Extraer _updateGraphEdges usando eval
const filePath = path.resolve(__dirname, '../src/Engine_DB.js');
const sourceCode = fs.readFileSync(filePath, 'utf8');
const updateGraphEdgesMatch = sourceCode.match(/function _updateGraphEdges\([^)]*\)\s*\{[\s\S]*?\n\}/);
if (!updateGraphEdgesMatch) throw new Error("Could not extract _updateGraphEdges");

global.Utilities = {
    getUuid: vi.fn(() => '11223344-5566-7788-9900')
};
global.Logger = { log: vi.fn() };
global._invalidateCache = vi.fn();

const scriptContext = {
    _updateGraphEdges: null,
    SheetMatrixIO: {
        readRelacionDominios: vi.fn(),
        writeRow: vi.fn(),
        appendRow: vi.fn()
    },
    Utilities: global.Utilities,
    Logger: global.Logger,
    _invalidateCache: global._invalidateCache
};

eval(`
    const SheetMatrixIO = scriptContext.SheetMatrixIO;
    const Utilities = scriptContext.Utilities;
    const Logger = scriptContext.Logger;
    const _invalidateCache = scriptContext._invalidateCache;
    ${updateGraphEdgesMatch[0]}
    scriptContext._updateGraphEdges = _updateGraphEdges;
`);

const { _updateGraphEdges, SheetMatrixIO } = scriptContext;

global.Engine_Graph = {
    buildDeletionPatch: vi.fn()
};
global.getEntityTopologyRules = vi.fn();

describe('Engine_DB Orchestration & DAG SCD-2', () => {

    beforeEach(() => {
        global.getAppSchema = vi.fn((ent) => ({ primaryKey: (ent === 'Portafolio' ? 'id_portafolio' : 'id_' + ent.toLowerCase()), fields: [] }));
        vi.clearAllMocks();
        Engine_DB.upsertBatch = vi.fn((entity, payload) => ({ status: 'success', handled: payload.length }));
    });

    describe('SCD-2 _updateGraphEdges', () => {
        it('should expire active edge and spawn new edge when parent changes', () => {
            const config = { useSheets: true };
            const sysDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
            
            const mockData = [
                ['id_relacion', 'id_nodo_padre', 'id_nodo_hijo', 'tipo_relacion', 'peso_influencia', 'valido_desde', 'valido_hasta', 'es_version_actual', 'updated_at', 'created_at', 'created_by'],
                ['RELA-OLD', 'PADRE_A', 'HIJO_1', 'Militar_Directa', 1, '2023-01-01', '', true, '', '2023-01-01', 'SYSTEM']
            ];
            
            SheetMatrixIO.readRelacionDominios.mockReturnValue({
                sheet: {},
                data: mockData
            });

            _updateGraphEdges('HIJO_1', 'PADRE_B', config);

            expect(SheetMatrixIO.writeRow).toHaveBeenCalledTimes(1);
            const expiredRowData = SheetMatrixIO.writeRow.mock.calls[0][2];
            expect(expiredRowData[6]).toMatch(sysDateRegex); 
            expect(expiredRowData[7]).toBe(false); 
            expect(expiredRowData[8]).toMatch(sysDateRegex); 

            expect(SheetMatrixIO.appendRow).toHaveBeenCalledTimes(1);
            const spawnedRowData = SheetMatrixIO.appendRow.mock.calls[0][1];
            expect(spawnedRowData[0]).toBe('RELA-11223344'); 
            expect(spawnedRowData[1]).toBe('PADRE_B'); 
            expect(spawnedRowData[2]).toBe('HIJO_1'); 
            expect(spawnedRowData[7]).toBe(true); 
        });

        it('should do nothing if parent has not changed', () => {
            const config = { useSheets: true };
            const mockData = [
                ['id_relacion', 'id_nodo_padre', 'id_nodo_hijo', 'tipo_relacion', 'peso_influencia', 'valido_desde', 'valido_hasta', 'es_version_actual', 'updated_at', 'created_at', 'created_by'],
                ['RELA-OLD', 'PADRE_A', 'HIJO_1', 'Militar_Directa', 1, '2023-01-01', '', true, '', '2023-01-01', 'SYSTEM']
            ];
            
            SheetMatrixIO.readRelacionDominios.mockReturnValue({ sheet: {}, data: mockData });

            _updateGraphEdges('HIJO_1', 'PADRE_A', config);

            expect(SheetMatrixIO.writeRow).not.toHaveBeenCalled();
            expect(SheetMatrixIO.appendRow).not.toHaveBeenCalled();
        });
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

            expect(global.getEntityTopologyRules).toHaveBeenCalledWith('EntidadMagica');
            
            expect(global.Engine_Graph.buildDeletionPatch).toHaveBeenCalledWith('TARGET', 'ORPHAN', activeGraphMock);

            expect(Engine_DB.upsertBatch).toHaveBeenCalledWith('Relacion_Dominios', expect.any(Array), expect.objectContaining({ useSheets: true }));
            const edgeBatch = Engine_DB.upsertBatch.mock.calls[0][1];
            expect(edgeBatch.length).toBe(2);
            expect(edgeBatch[0].id_relacion).toBe('R1');
            expect(edgeBatch[0].es_version_actual).toBe(false);

            expect(edgeBatch[1].id_nodo_padre).toBe('GLOBAL_NULL');
            expect(edgeBatch[1].id_nodo_hijo).toBe('ORPHANED_NODE');
            expect(edgeBatch[1].es_version_actual).toBe(true);

            expect(Engine_DB.upsertBatch).toHaveBeenCalledWith('EntidadMagica', expect.any(Array), expect.objectContaining({ useSheets: true }));
            const nodeBatch = Engine_DB.upsertBatch.mock.calls[1][1];
            expect(nodeBatch.length).toBe(1);
            expect(nodeBatch[0].estado).toBe('Eliminado');
            expect(nodeBatch[0].id_entidadmagica).toBe('TARGET'); 
            
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
