// __tests__/Engine_DB_Delete.test.js

const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets');

// ─────────────────────────────────────────────────────────────────────────────
// In-memory sheet builder (Reutilizado del test suite de Engine_DB)
// ─────────────────────────────────────────────────────────────────────────────
function buildInMemorySheet(headers, rows = []) {
    const store = [headers, ...rows];

    const makeRange = (rowStart, colStart, numRows, numCols) => ({
        getValues: () =>
            store.slice(rowStart - 1, rowStart - 1 + numRows).map(r =>
                r.slice(colStart - 1, colStart - 1 + numCols)
            ),
        setValue: (v) => { store[rowStart - 1][colStart - 1] = v; },
        setValues: (newVals) => {
            for (let i = 0; i < newVals.length; i++) {
                store[rowStart - 1 + i] = newVals[i];
            }
        }
    });

    return {
        _store: store,
        getLastRow: () => store.length,
        getLastColumn: () => store[0].length,
        getDataRange: () => ({
            getValues: () => JSON.parse(JSON.stringify(store)),
            getNumRows: () => store.length
        }),
        getRange: vi.fn((row, col, numRows, numCols) => makeRange(row, col, numRows, numCols)),
        appendRow: (row) => store.push(row)
    };
}

function buildInMemorySpreadsheet(sheetMap) {
    return {
        getSheetByName: vi.fn(name => sheetMap[name] || null),
        insertSheet: vi.fn(name => {
            const newSheet = buildInMemorySheet(['__placeholder__']);
            sheetMap[name] = newSheet;
            return newSheet;
        })
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite: Engine_DB Delete (remove & bulkDelete)
// ─────────────────────────────────────────────────────────────────────────────
const AUDIT_HEADERS = ['id_producto', 'nombre_producto', '_version', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by'];

describe('Engine_DB Delete & BulkDelete Orchestration', () => {
    let sheetStore;
    const config = { useSheets: true, useCloudDB: false, SPREADSHEET_ID_DB: 'mem-id' };

    beforeEach(() => {
        global.getAppSchema = vi.fn((ent) => ({ primaryKey: (ent === 'Portafolio' ? 'id_portafolio' : 'id_' + ent.toLowerCase()), fields: [] }));
        global.APP_SCHEMAS = new Proxy({}, { 
            get: (target, prop) => {
                if (prop === 'EntidadConfig') return { primaryKey: 'id_entidadconfig', metadata: { adapter: 'config' } };
                if (prop === 'EntidadGrafo') return { primaryKey: 'id_entidadgrafo', metadata: { deletionStrategy: 'CASCADE' } };
                if (prop === 'Sys_Graph_Edges') return { primaryKey: 'id_relacion' };
                return { primaryKey: (prop === 'Portafolio' ? 'id_portafolio' : 'id_' + String(prop).toLowerCase()) };
            } 
        });
        
        // Mock de Cache para las invalidaciones
        global.CacheService = {
            getScriptCache: vi.fn().mockReturnValue({
                remove: vi.fn(),
                removeAll: vi.fn(),
                put: vi.fn(),
                get: vi.fn()
            })
        };
        global.Sys_Cache_Signals = {
            remove: vi.fn(),
            bumpEntity: vi.fn()
        };
        global.Engine_Graph = {
            buildDeletionPatch: vi.fn((id, strategy, activeGraph) => {
                return {
                    edgesToClose: activeGraph.filter(e => e.contexto_id === id),
                    edgesToSpawn: [],
                    nodesToDelete: [id]
                };
            })
        };

        // Entorno nativo simulado
        global.Logger = { log: vi.fn() };
        global.Session = {
            getActiveUser: vi.fn().mockReturnValue({ getEmail: vi.fn().mockReturnValue('test@local') })
        };
        global.Utilities = {
            getUuid: vi.fn(() => 'test-uuid-1234')
        };
        
        // Setup in-memory sheet
        const row1 = ['PROD-1', 'Producto 1', 'v1', 'Activo', '2026-01-01', 'admin@local', '', '', '', ''];
        const row2 = ['PROD-2', 'Producto 2', 'v1', 'Activo', '2026-01-01', 'admin@local', '', '', '', ''];
        const row3 = ['PROD-3', 'Producto 3', 'v2', 'Activo', '2026-01-01', 'admin@local', '', '', '', ''];
        
        const GRAPH_HEADERS = ['id_entidadgrafo', 'nombre', '_version', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by'];
        const gRow1 = ['GRAPH-1', 'Grafo 1', 'v1', 'Activo', '2026-01-01', 'admin@local', '', '', '', ''];
        const gRow2 = ['GRAPH-2', 'Grafo 2', 'v1', 'Activo', '2026-01-01', 'admin@local', '', '', '', ''];

        const EDGE_HEADERS = ['id_relacion', 'contexto_id', 'from_id', 'to_id', 'es_version_actual', 'estado', 'valido_hasta', 'updated_at', 'updated_by'];
        const edge1 = ['R1', 'GRAPH-1', 'GRAPH-1', 'CHILD-1', true, 'Activo', '', '', ''];
        const edge2 = ['R2', 'GRAPH-1', 'GRAPH-1', 'CHILD-2', true, 'Activo', '', '', ''];
        const edge3 = ['R3', 'GRAPH-2', 'GRAPH-2', 'CHILD-3', true, 'Activo', '', '', ''];
        
        sheetStore = { 
            'DB_Producto': buildInMemorySheet(AUDIT_HEADERS, [row1, row2, row3]),
            'DB_EntidadGrafo': buildInMemorySheet(GRAPH_HEADERS, [gRow1, gRow2]),
            'DB_Sys_Graph_Edges': buildInMemorySheet(EDGE_HEADERS, [edge1, edge2, edge3])
        };
        global.SpreadsheetApp = {
            openById: vi.fn(() => buildInMemorySpreadsheet(sheetStore)),
            flush: vi.fn()
        };

        Adapter_Sheets._cachedSS = null;
        Adapter_Sheets._cachedSS_id = null;
        Adapter_Sheets._spreadsheets = {};
        Adapter_Sheets._lexicalMaxState = {};
    });
    
    afterEach(() => {
        vi.useRealTimers();
    });

    describe('Individual Delete (remove)', () => {
        it('Historia 1: Debe realizar Soft Delete Genuino', () => {
            const sysDate = '2026-08-14T10:00:00.000Z';
            vi.useFakeTimers().setSystemTime(new Date(sysDate));

            const result = Engine_DB.delete('Producto', 'PROD-1', config);

            expect(result.success).toBe(true);
            
            const rows = sheetStore['DB_Producto']._store;
            const deletedRow = rows[1]; // PROD-1 is at index 1

            // Indices dinamicos
            const idxEstado = AUDIT_HEADERS.indexOf('estado');
            const idxNombre = AUDIT_HEADERS.indexOf('nombre_producto');
            const idxDelAt = AUDIT_HEADERS.indexOf('deleted_at');
            const idxDelBy = AUDIT_HEADERS.indexOf('deleted_by');
            const idxUpdAt = AUDIT_HEADERS.indexOf('updated_at');
            const idxUpdBy = AUDIT_HEADERS.indexOf('updated_by');

            // Soft Delete verifications
            expect(deletedRow[idxEstado]).toBe('Eliminado'); // estado
            expect(deletedRow[idxNombre]).toBe('Producto 1'); // Data is preserved
            expect(deletedRow[idxDelAt]).toBe(sysDate); // deleted_at
            expect(deletedRow[idxDelBy]).toBe('test@local'); // deleted_by
            expect(deletedRow[idxUpdAt]).toBe(sysDate); // updated_at
            expect(deletedRow[idxUpdBy]).toBe('test@local'); // updated_by
        });

        it('Historia 2: Ignorar Registros Inexistentes sin lanzar error críptico', () => {
            expect(() => {
                Engine_DB.delete('Producto', 'PROD-999', config);
            }).toThrow(/Registro con ID PROD-999 no encontrado para borrado lógico/);
            
            const rows = sheetStore['DB_Producto']._store;
            const idxEstado = AUDIT_HEADERS.indexOf('estado');
            expect(rows[1][idxEstado]).toBe('Activo'); // PROD-1 still active
            expect(rows[2][idxEstado]).toBe('Activo'); // PROD-2 still active
            expect(rows[3][idxEstado]).toBe('Activo'); // PROD-3 still active
        });

        it('Historia 3: Evasión de OCC en Borrado Directo', () => {
            const result = Engine_DB.delete('Producto', 'PROD-3', config);
            expect(result.success).toBe(true);
            
            const rows = sheetStore['DB_Producto']._store;
            const idxEstado = AUDIT_HEADERS.indexOf('estado');
            expect(rows[3][idxEstado]).toBe('Eliminado');
        });

        it('Historia 4: Invalidación de Caché Tras Borrado', () => {
            Engine_DB.delete('Producto', 'PROD-1', config);
            expect(global.CacheService.getScriptCache).toHaveBeenCalled();
        });

        it('Historia 12: Bloqueo Adapter_Config en borrado individual', () => {
            expect(() => {
                Engine_DB.delete('EntidadConfig', 'CFG-1', config);
            }).toThrow(/es gestionada por Adapter_Config y no soporta operación delete/);
        });

        it('Historia 13: Borrado Individual en Grafos (Orquestación y Aristas)', () => {
            const sysDate = '2026-08-14T12:00:00.000Z';
            vi.useFakeTimers().setSystemTime(new Date(sysDate));
            
            const result = Engine_DB.delete('EntidadGrafo', 'GRAPH-1', config);
            expect(result.success).toBe(true);
            
            // Verificamos el nodo
            const gRows = sheetStore['DB_EntidadGrafo']._store;
            const idxEstadoG = gRows[0].indexOf('estado');
            expect(gRows[1][idxEstadoG]).toBe('Eliminado');
            
            // Verificamos las aristas cerradas
            const eRows = sheetStore['DB_Sys_Graph_Edges']._store;
            const idxEstadoE = eRows[0].indexOf('estado');
            const idxValido = eRows[0].indexOf('valido_hasta');
            
            // R1 (índice 1) y R2 (índice 2) deben estar cerradas porque contexto_id === 'GRAPH-1'
            expect(eRows[1][idxEstadoE]).toBe('Eliminado');
            expect(eRows[1][idxValido]).toBe(sysDate);
            expect(eRows[2][idxEstadoE]).toBe('Eliminado');
            expect(eRows[2][idxValido]).toBe(sysDate);
            
            // R3 (índice 3) pertenece a GRAPH-2, debe seguir activa
            expect(eRows[3][idxEstadoE]).toBe('Activo');
        });
    });

    describe('Bulk Delete (bulkDelete)', () => {
        it('Historia 5: Borrado Masivo Exitoso de múltiples IDs', () => {
            const sysDate = '2026-08-14T11:00:00.000Z';
            vi.useFakeTimers().setSystemTime(new Date(sysDate));

            // Llamar a bulkDelete con PROD-1 y PROD-3
            const result = Engine_DB.bulkDelete('Producto', ['PROD-1', 'PROD-3'], config);

            expect(result.success).toBe(true);

            const rows = sheetStore['DB_Producto']._store;
            const idxEstado = AUDIT_HEADERS.indexOf('estado');
            const idxDelAt = AUDIT_HEADERS.indexOf('deleted_at');
            
            expect(rows[1][idxEstado]).toBe('Eliminado'); // PROD-1
            expect(rows[1][idxDelAt]).toBe(sysDate);     // PROD-1 deleted_at
            
            expect(rows[2][idxEstado]).toBe('Activo');    // PROD-2 remains active
            
            expect(rows[3][idxEstado]).toBe('Eliminado'); // PROD-3
            expect(rows[3][idxDelAt]).toBe(sysDate);     // PROD-3 deleted_at
        });

        it('Historia 6: Borrado Masivo Mixto procesa solo los existentes', () => {
            const result = Engine_DB.bulkDelete('Producto', ['PROD-2', 'PROD-INVALIDO'], config);

            expect(result.success).toBe(true);

            const rows = sheetStore['DB_Producto']._store;
            const idxEstado = AUDIT_HEADERS.indexOf('estado');
            expect(rows[2][idxEstado]).toBe('Eliminado'); // PROD-2
        });

        it('Historia 7: Resolución de OCC en Batch (Fallo mitigado)', () => {
            const result = Engine_DB.bulkDelete('Producto', ['PROD-3', 'PROD-1'], config);
            expect(result.success).toBe(true);
            
            const rows = sheetStore['DB_Producto']._store;
            const idxEstado = AUDIT_HEADERS.indexOf('estado');
            expect(rows[3][idxEstado]).toBe('Eliminado'); // PROD-3
            expect(rows[1][idxEstado]).toBe('Eliminado'); // PROD-1
        });

        it('Historia 8: Invalidación Completa tras Bulk Delete', () => {
            Engine_DB.bulkDelete('Producto', ['PROD-1', 'PROD-2'], config);
            expect(global.CacheService.getScriptCache).toHaveBeenCalled();
        });

        it('Historia 14: Bloqueo Adapter_Config en borrado masivo', () => {
            expect(() => {
                Engine_DB.bulkDelete('EntidadConfig', ['CFG-1', 'CFG-2'], config);
            }).toThrow(/es gestionada por Adapter_Config y no soporta operación delete/);
        });

        it('Historia 15: Borrado Masivo en Grafos (Concurrencia de Aristas)', () => {
            const sysDate = '2026-08-14T13:00:00.000Z';
            vi.useFakeTimers().setSystemTime(new Date(sysDate));
            
            const result = Engine_DB.bulkDelete('EntidadGrafo', ['GRAPH-1', 'GRAPH-2'], config);
            expect(result.success).toBe(true);
            
            // Nodos
            const gRows = sheetStore['DB_EntidadGrafo']._store;
            const idxEstadoG = gRows[0].indexOf('estado');
            expect(gRows[1][idxEstadoG]).toBe('Eliminado');
            expect(gRows[2][idxEstadoG]).toBe('Eliminado');
            
            // Aristas
            const eRows = sheetStore['DB_Sys_Graph_Edges']._store;
            const idxEstadoE = eRows[0].indexOf('estado');
            
            expect(eRows[1][idxEstadoE]).toBe('Eliminado'); // R1
            expect(eRows[2][idxEstadoE]).toBe('Eliminado'); // R2
            expect(eRows[3][idxEstadoE]).toBe('Eliminado'); // R3
        });
    });
});
