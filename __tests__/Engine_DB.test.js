// __tests__/Engine_DB.test.js
// T1: QA-7 Compliance — Real Adapter_Sheets used (no vi.mock)
// vi.mock(Adapter_Sheets) is PROHIBITED per rules_qa.md §7 (Anti-Mockery Rule)

/**
 * Engine_DB Facade Integration Tests
 *
 * Uses REAL Adapter_Sheets against a fully in-memory SpreadsheetApp mock.
 * This is the only valid approach per QA-7: Adapter behaviour must not be mocked
 * in Engine_DB tests — only the GAS infrastructure layer is mocked.
 */

const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets');

// ─────────────────────────────────────────────────────────────────────────────
// In-memory sheet builder — simulates SpreadsheetApp without vi.mock
// ─────────────────────────────────────────────────────────────────────────────
function buildInMemorySheet(headers, rows = []) {
    // Internal storage: [headers, ...dataRows]
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
        getLastColumn: () => headers.length,
        getDataRange: () => ({
            getValues: () => JSON.parse(JSON.stringify(store)),
            getNumRows: () => store.length
        }),
        getRange: vi.fn((row, col, numRows, numCols) => makeRange(row, col, numRows, numCols)),
        appendRow: vi.fn(row => store.push(row))
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
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────
const AUDIT_HEADERS = ['id_producto', 'nombre_producto', 'estado',
    'created_at', 'created_by', 'updated_at', 'updated_by'];

describe('Engine_DB Facade — Integration with real Adapter_Sheets (QA-7)', () => {
    let sheetStore;
    const config = { useSheets: true, useCloudDB: false, SPREADSHEET_ID_DB: 'mem-id' };

    beforeEach(() => {
        global.getAppSchema = vi.fn((ent) => ({ primaryKey: (ent === 'Portafolio' ? 'id_portafolio' : 'id_' + ent.toLowerCase()), fields: [] }));
        // Fresh in-memory sheet for each test; DB_Producto starts empty (headers only)
        sheetStore = { 'DB_Producto': buildInMemorySheet(AUDIT_HEADERS) };
        global.SpreadsheetApp.openById = vi.fn(() => buildInMemorySpreadsheet(sheetStore));
        global.Logger = { log: vi.fn() };
        global.Session = {
            getActiveUser: vi.fn().mockReturnValue({ getEmail: vi.fn().mockReturnValue('agent@local') })
        };
    });

    it('1. Save → creates record with audit trail in real sheet', () => {
        const payload = { id_producto: 'PROD-AAA', nombre_producto: 'Portal MVP', estado: 'Activo' };
        const result = Engine_DB.save('Producto', payload, config);

        expect(result.sheets.status).toBe('success');
        expect(result.sheets.action).toBe('created');

        // Verify the row was actually written to the in-memory store
        const rows = sheetStore['DB_Producto']._store;
        expect(rows.length).toBe(2); // 1 header + 1 data row
        const dataRow = rows[1];
        expect(dataRow[0]).toBe('PROD-AAA');
        // Audit fields injected
        expect(dataRow[3]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // created_at ISO
        expect(dataRow[4]).toBe('agent@local');            // created_by
    });

    it('2. Idempotency: Second save with same PK updates, does not duplicate', () => {
        const payload = { id_producto: 'PROD-BBB', nombre_producto: 'Sistema Pagos', estado: 'Activo' };

        Engine_DB.save('Producto', payload, config);
        Engine_DB.save('Producto', { ...payload, nombre_producto: 'Sistema Pagos v2' }, config);

        const rows = sheetStore['DB_Producto']._store;
        // Still only 1 data row (no duplicate)
        expect(rows.length).toBe(2);
        // Name was updated
        expect(rows[1][1]).toBe('Sistema Pagos v2');
    });

    it('3. Resiliencia: CloudDB failure does not block Sheets write', () => {
        const configDual = { useSheets: true, useCloudDB: true, SPREADSHEET_ID_DB: 'mem-id' };
        const payload = { id_producto: 'PROD-CCC', nombre_producto: 'Backend API', estado: 'Activo' };

        const result = Engine_DB.save('Producto', payload, configDual);

        // Sheets should succeed (cloud mock throws by default since CloudDB is a stub)
        expect(result.sheets.status).toBe('success');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Adapter_Sheets normalization — pure function tests (no side effects)
// ─────────────────────────────────────────────────────────────────────────────
describe('Adapter_Sheets._normalizeHeader (Regla 4.7 — pure function)', () => {
    const normalizer = Adapter_Sheets._normalizeHeader;

    it('converts spaces and special chars to snake_case', () => {
        expect(normalizer('ID Equipo')).toBe('id_equipo');
        expect(normalizer(' ¿ID del Equipo (Squad)? ')).toBe('id_del_equipo_squad');
    });

    it('strips accents and tildes', () => {
        expect(normalizer('Tildes: á é í ó ú ñ')).toBe('tildes_a_e_i_o_u_n');
        expect(normalizer('Costo / Beneficio (AÑO)')).toBe('costo_beneficio_ano');
    });

    it('trims trailing symbols that collapse to underscores', () => {
        expect(normalizer('Dedicación %')).toBe('dedicacion');
    });
});
