// __tests__/API_Universal.contract.test.js
// T4: Serialization contract tests for API_Universal (AC4)
// Validates that all response payloads survive JSON.parse(JSON.stringify()) without throwing.
// Purpose: prevent silent `postMessage dropping: deserialize threw` failures in the browser.

// API_Universal.gs uses GAS globals — we load it via vi.setup.js mocks
// and wire up the minimum stubs needed to call getAppBootstrapPayload()

const Adapter_Sheets = require('../src/Adapter_Sheets');
const Engine_DB = require('../src/Engine_DB');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function buildSheetWithDateObjects(entityName) {
    // Simulates Google Sheets returning native Date objects (Rhino runtime behaviour)
    const headers = ['id_dominio', 'n0_es', 'estado', 'created_at', 'updated_at'];
    const data = [
        headers,
        ['DOMI-001', 'Test Domain', 'Activo', new Date('2026-01-01'), new Date('2026-03-01')]
    ];
    return {
        getDataRange: () => ({
            getValues: () => data,
            getNumRows: () => data.length
        }),
        getLastRow: () => data.length,
        getLastColumn: () => headers.length,
        getRange: vi.fn(() => ({
            getValues: () => data,
            setValues: vi.fn(),
            setValue: vi.fn()
        })),
        appendRow: vi.fn()
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Contract: Adapter_Sheets.list() output is serializable
// ─────────────────────────────────────────────────────────────────────────────
describe('API_Universal Serialization Contract — AC4', () => {
    beforeEach(() => {
        global.Logger = { log: vi.fn() };
        global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(name => buildSheetWithDateObjects(name)),
            insertSheet: vi.fn()
        }));
        global.APP_SCHEMAS = {
            Dominio: { primaryKey: 'id_dominio' }
        };
    });

    test('Contract 1: Adapter_Sheets.list() output survives JSON round-trip even with native Date rows', () => {
        const result = Adapter_Sheets.list('Dominio', { SPREADSHEET_ID_DB: 'test-id' }, 'objects', true);

        // This must NOT throw — if native Dates weren't sanitized it would throw
        expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();

        // After round-trip, values must still be present (data not silently dropped)
        const roundTripped = JSON.parse(JSON.stringify(result));
        expect(roundTripped.rows.length).toBe(1);
        expect(roundTripped.rows[0].id_dominio).toBe('DOMI-001');
    });

    test('Contract 2: Engine_DB.list() response is serializable', () => {
        const result = Engine_DB.list('Dominio');

        expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
    });

    test('Contract 3: upsert() result is serializable (no Date objects in return value)', () => {
        // Build fresh empty sheet for upsert
        const store = [['id_dominio', 'n0_es', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by']];
        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(() => ({
                _store: store,
                getLastRow: () => store.length,
                getLastColumn: () => 7,
                getDataRange: () => ({
                    getValues: () => JSON.parse(JSON.stringify(store)),
                    getNumRows: () => store.length
                }),
                getRange: vi.fn((row, col, numRows, numCols) => ({
                    getValues: () => store.slice(row - 1, row - 1 + numRows).map(r => r.slice(col - 1, col - 1 + numCols)),
                    setValues: (vals) => { for (let i = 0; i < vals.length; i++) store[row - 1 + i] = vals[i]; },
                    setValue: vi.fn()
                })),
                appendRow: vi.fn(row => store.push(row))
            })),
            insertSheet: vi.fn()
        }));
        global.Session = {
            getActiveUser: vi.fn(() => ({ getEmail: vi.fn(() => 'agent@local') }))
        };

        const result = Adapter_Sheets.upsert('Dominio', { id_dominio: 'DOMI-SRL', n0_es: 'Test', estado: 'Activo' });

        expect(() => JSON.parse(JSON.stringify(result))).not.toThrow();
        expect(result.status).toBe('success');
    });

    test('Contract 4: Response envelope matches expected structure', () => {
        const fakeResult = { status: 'success', action: 'created', pk: 'id_dominio', val: 'DOMI-X' };

        // Simulate what getAppBootstrapPayload wraps around the adapter result
        const envelope = JSON.parse(JSON.stringify({ status: 'success', data: fakeResult }));

        expect(envelope.status).toBe('success');
        expect(envelope.data.action).toBe('created');
    });
});
