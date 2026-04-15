// __tests__/Adapter_Sheets.upsert.test.js
// T3: Behavioral tests for upsert() — audit trail injection (AC2)

const Adapter_Sheets = require('../src/Adapter_Sheets');

const HEADERS = ['id_dominio', 'n0_es', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by'];
const IDX = { id: 0, name: 1, estado: 2, createdAt: 3, createdBy: 4, updatedAt: 5, updatedBy: 6 };
const FIXED_TIME = '2026-03-27T20:00:00.000Z';

function buildEmptySheet() {
    const store = [HEADERS];
    return {
        _store: store,
        getLastRow: () => store.length,
        getLastColumn: () => HEADERS.length,
        getDataRange: () => ({
            getValues: () => JSON.parse(JSON.stringify(store)),
            getNumRows: () => store.length
        }),
        getRange: vi.fn((row, col, numRows, numCols) => {
            return {
                getValues: () =>
                    store.slice(row - 1, row - 1 + numRows).map(r =>
                        r.slice(col - 1, col - 1 + numCols)
                    ),
                setValue: (val) => {}, setValues: (newVals) => {
                    for (let i = 0; i < newVals.length; i++) {
                        store[row - 1 + i] = newVals[i];
                    }
                }
            };
        }),
        appendRow: vi.fn(row => store.push(row))
    };
}

describe('Adapter_Sheets.upsert() — AC2: Audit Trail', () => {
    let sheet;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime(new Date(FIXED_TIME));
        sheet = buildEmptySheet();

        global.SpreadsheetApp.openById = vi.fn(() => ({
            getSheetByName: vi.fn(() => sheet),
            insertSheet: vi.fn(() => sheet)
        }));
        global.Session = {
            getActiveUser: vi.fn(() => ({ getEmail: vi.fn(() => 'agent@local') }))
        };
        global.Logger = { log: vi.fn() };
        global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('Create path: injects all 4 audit fields automatically', () => {
        Adapter_Sheets.upsert('Dominio', { id_dominio: 'DOMI-NEW', n0_es: 'Test Domain', estado: 'Activo' });

        const rows = sheet._store;
        expect(rows.length).toBe(2); // header + 1 data row
        const row = rows[1];

        expect(row[IDX.createdAt]).toBe(FIXED_TIME);
        expect(row[IDX.createdBy]).toBe('agent@local');
        expect(row[IDX.updatedAt]).toBe(FIXED_TIME);
        expect(row[IDX.updatedBy]).toBe('agent@local');
    });

    test('Update path: created_at and created_by are IMMUTABLE', () => {
        const ORIGINAL_CREATED_AT = '2026-01-01T00:00:00.000Z';
        const ORIGINAL_CREATED_BY = 'founder@local';

        // Pre-seed the sheet with an existing row
        sheet._store.push([
            'DOMI-EXIST', 'Original Name', 'Activo',
            ORIGINAL_CREATED_AT, ORIGINAL_CREATED_BY,
            '2026-02-01T00:00:00.000Z', 'editor@local'
        ]);

        // Update the same record
        Adapter_Sheets.upsert('Dominio', { id_dominio: 'DOMI-EXIST', n0_es: 'Updated Name', estado: 'Activo' });

        const updatedRow = sheet._store[1];

        // created_at and created_by must NOT change (immutability rule)
        expect(updatedRow[IDX.createdAt]).toBe(ORIGINAL_CREATED_AT);
        expect(updatedRow[IDX.createdBy]).toBe(ORIGINAL_CREATED_BY);

        // updated_at and updated_by must be refreshed
        expect(updatedRow[IDX.updatedAt]).toBe(FIXED_TIME);
        expect(updatedRow[IDX.updatedBy]).toBe('agent@local');

        // Business data updated
        expect(updatedRow[IDX.name]).toBe('Updated Name');
    });

    test('Missing PK throws with descriptive error', () => {
        expect(() => {
            Adapter_Sheets.upsert('Dominio', { n0_es: 'Sin ID', estado: 'Activo' });
        }).toThrow(/Primary Key/i);
    });

    test('Return value: create action returns status success and action created', () => {
        const result = Adapter_Sheets.upsert('Dominio', { id_dominio: 'DOMI-RET', n0_es: 'Return Test', estado: 'Activo' });
        expect(result.status).toBe('success');
        expect(result.action).toBe('created');
    });

    test('Return value: update action returns status success and action updated', () => {
        sheet._store.push(['DOMI-UPD', 'Old Name', 'Activo', '2026-01-01T00:00:00Z', 'a@b.com', '2026-01-01T00:00:00Z', 'a@b.com']);
        const result = Adapter_Sheets.upsert('Dominio', { id_dominio: 'DOMI-UPD', n0_es: 'New Name', estado: 'Activo' });
        expect(result.status).toBe('success');
        expect(result.action).toBe('updated');
    });
});
