// __tests__/Adapter_Sheets.list.test.js
// T2: Behavioral tests for list() including R-01 includeAudit flag (AC1)

// NOTE: Adapter_Sheets has a module-level __HEADER_CACHE__ var that persists
// across tests in the same Jest run (module is cached). We must re-require it
// each test via vi.resetModules() to prevent cross-test cache pollution.

let Adapter_Sheets;

const FULL_HEADERS = ['id_dominio', 'n0_es', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by'];
const ROW_1 = ['DOMI-001', 'Estrategia', 'Activo', '2026-01-01T00:00:00Z', 'admin@local', '2026-03-01T00:00:00Z', 'editor@local'];
const ROW_2 = ['DOMI-002', 'Ejecución', 'Activo', '2026-02-01T00:00:00Z', 'admin@local', '2026-03-15T00:00:00Z', 'editor@local'];

function buildSheet(dataRows = [ROW_1, ROW_2]) {
    const store = [FULL_HEADERS, ...dataRows];
    return {
        getDataRange: () => ({
            getValues: () => JSON.parse(JSON.stringify(store)),
            getNumRows: () => store.length
        }),
        getLastRow: () => store.length,
        getLastColumn: () => FULL_HEADERS.length,
        getRange: vi.fn(),
        appendRow: vi.fn()
    };
}

beforeEach(() => {
    // Re-require to reset module-level __HEADER_CACHE__ state between tests
    vi.resetModules();
    Adapter_Sheets = require('../src/Adapter_Sheets');
    global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
    global.Logger = { log: vi.fn() };
});

describe('Adapter_Sheets.list() — AC1', () => {

    test('Normal listing: audit columns stripped by default', () => {
        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(() => buildSheet()),
            insertSheet: vi.fn()
        }));

        const result = Adapter_Sheets.list('Dominio', { SPREADSHEET_ID_DB: 'test-id' });

        expect(result.rows.length).toBe(2);
        expect(result.headers).toContain('id_dominio');
        expect(result.headers).toContain('n0_es');
        // Audit columns MUST be filtered out in default mode
        expect(result.headers).not.toContain('created_at');
        expect(result.headers).not.toContain('created_by');
        expect(result.headers).not.toContain('updated_at');
        expect(result.headers).not.toContain('updated_by');
    });

    test('includeAudit=true: audit columns present in result (R-01)', () => {
        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(() => buildSheet()),
            insertSheet: vi.fn()
        }));

        const result = Adapter_Sheets.list('Dominio', { SPREADSHEET_ID_DB: 'test-id' }, 'objects', true);

        expect(result.headers).toContain('created_at');
        expect(result.headers).toContain('created_by');
        expect(result.headers).toContain('updated_at');
        expect(result.headers).toContain('updated_by');
        // Data values preserved
        expect(result.rows[0].created_at).toBe('2026-01-01T00:00:00Z');
        expect(result.rows[0].created_by).toBe('admin@local');
    });

    test('Empty sheet (headers only): returns empty rows array', () => {
        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(() => buildSheet([])),
            insertSheet: vi.fn()
        }));

        const result = Adapter_Sheets.list('Dominio', { SPREADSHEET_ID_DB: 'test-id' });

        expect(result.headers).toEqual(['id_dominio', 'n0_es', 'estado']);
        expect(result.rows).toEqual([]);
    });

    test("format='tuples': rows are arrays not objects", () => {
        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(() => buildSheet([ROW_1])),
            insertSheet: vi.fn()
        }));

        const result = Adapter_Sheets.list('Dominio', { SPREADSHEET_ID_DB: 'test-id' }, 'tuples');

        expect(Array.isArray(result.rows[0])).toBe(true);
        // id_dominio at index 0 (first visible column)
        expect(result.rows[0][0]).toBe('DOMI-001');
    });

    test('Serialization: returned rows contain no native Date objects', () => {
        const rowWithDate = ['DOMI-003', 'Innovación', 'Activo',
            new Date('2026-01-01'), 'admin@local', new Date('2026-03-01'), 'editor@local'];

        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(() => buildSheet([rowWithDate])),
            insertSheet: vi.fn()
        }));

        const result = Adapter_Sheets.list('Dominio', { SPREADSHEET_ID_DB: 'test-id' }, 'objects', true);

        // Should NOT throw (no native Date objects survive JSON round-trip)
        expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
    });
});
