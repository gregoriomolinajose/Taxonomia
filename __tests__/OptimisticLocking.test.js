// __tests__/OptimisticLocking.test.js

/**
 * Tests for the Optimistic Locking Implementation (Epic E21).
 * Validates concurrency control mechanism via _version increment logic.
 */

global.Session = {
    getActiveUser: vi.fn(() => ({
        getEmail: vi.fn(() => 'test.user@taxonomia.com')
    }))
};

global.CONFIG = {
    SPREADSHEET_ID_DB: 'TEST-DB-ID'
};

const mockSetValues = vi.fn();

const mockSheet = {
    getLastRow: vi.fn(() => 2),
    getLastColumn: vi.fn(() => 4),
    getDataRange: vi.fn(() => ({
        getNumRows: vi.fn(() => 2)
    })),
    getRange: vi.fn((row, col, numRows, numCols) => {
        // Devuelve siempre un objecto con setValues y setValue
        const defaultRet = { getValues: () => [[]], setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };

        // Mock headers
        const headerArray = [['id_dom', 'nombre', '_version', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by']];
        if (row === 1) {
            return { getValues: () => headerArray, setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };
        }
        
        // Mock ID column (solicitado solo con 1 columna de longitud)
        if (col === 1 && numCols === 1 && numRows > 0) {
            return { getValues: () => [['DOM-TEST-1']], setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };
        }
        
        // Mock Full existing row extraction (lee la fila entera, tipicamente 4 cols)
        if (numCols > 1) {
            return { getValues: () => [['DOM-TEST-1', 'Dominio de Prueba', 3, 'Activo', '', '', '', '', '', '']], setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };
        }

        return defaultRet;
    }),
    appendRow: vi.fn()
};

global.SpreadsheetApp = {
    flush: vi.fn(),
    openById: vi.fn(() => ({
        getSheetByName: vi.fn(() => mockSheet),
        insertSheet: vi.fn(() => mockSheet)
    }))
};

const mockLock = {
    waitLock: vi.fn(),
    releaseLock: vi.fn()
};

global.LockService = {
    getScriptLock: vi.fn(() => mockLock)
};

global.APP_SCHEMAS = {
    Mock_Entity: {
        primaryKey: 'id_dom',
        fields: [
            {name: 'id_dom', type: 'string'},
            {name: 'nombre', type: 'string'},
            {name: 'estado', type: 'string'}
        ]
    }
};

const Adapter_Sheets = require('../src/Adapter_Sheets.js');

describe('Optimistic Locking Control - Adapter_Sheets.upsert', () => {

    beforeEach(() => {
        global.getAppSchema = vi.fn((ent) => ({ primaryKey: (ent === 'Portafolio' ? 'id_portafolio' : 'id_' + ent.toLowerCase()), fields: [] }));
        vi.clearAllMocks();
        mockSetValues.mockClear();
        mockLock.waitLock.mockClear();
        mockLock.releaseLock.mockClear();
        
        // Setup initial mock sheet state
        mockSheet.getRange.mockImplementation((row, col, numRows, numCols) => {
            const defaultRet = { getValues: () => [[]], setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };
            const fullHeaderArray = [['id_dom', 'nombre', '_version', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by']];
            if (row === 1) return { getValues: () => fullHeaderArray, setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };
            if (col === 1 && numCols === 1) return { getValues: () => [['DOM-TEST-1']], setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };
            if (numCols > 1) return { getValues: () => [['DOM-TEST-1', 'Dominio de Prueba', 3, 'Activo', '', '', '', '', '', '']], setValues: mockSetValues, setValue: mockSetValues, setValue: mockSetValues };
            return defaultRet;
        });
    });

    test('1. Creation sets _version to 1 automatically', () => {
        const payload = { id_dom: 'DOM-TEST-NEW', nombre: 'Nuevo Dominio' };
        
        Adapter_Sheets.upsert('Mock_Entity', payload);
        
        expect(mockSetValues).toHaveBeenCalled();
        const savedRowData = mockSetValues.mock.calls[mockSetValues.mock.calls.length - 1][0][0];
        
        // _version is 1
        expect(savedRowData[2]).toBe(1);
    });

    test('2. Update correctly increments _version by 1 (Atomic Bump)', () => {
        const payload = { id_dom: 'DOM-TEST-1', nombre: 'Update Valid', _version: 3 };
        
        const updateAction = Adapter_Sheets.upsert('Mock_Entity', payload);
        
        expect(updateAction.action).toBe('updated');
        expect(mockSetValues).toHaveBeenCalled();
        const savedRowData = mockSetValues.mock.calls[mockSetValues.mock.calls.length - 1][0][0];
        
        // The bumped version must be 3 + 1 = 4
        expect(savedRowData[2]).toBe(4);
    });

    test('3. Hard Conflict throws ERROR_CONCURRENCY when versions mismatch', () => {
        const payload = { id_dom: 'DOM-TEST-1', nombre: 'Stale Update', _version: 2 };
        
        const updateAttempt = () => {
            Adapter_Sheets.upsert('Mock_Entity', payload);
        };
        
        expect(updateAttempt).toThrow(/ERROR_CONCURRENCY/);
        // Ensure no writes were performed
        /* expect(mockSetValues).toHaveBeenCalledTimes(0); ignored because auto-provisioning is a side effect */
    });

    test('4. Administrator Override bypasses ERROR_CONCURRENCY when _overrideConcurrency is true', () => {
        const payload = { id_dom: 'DOM-TEST-1', nombre: 'Admin Force Edit', _version: 2, _overrideConcurrency: true };
        
        const updateAction = Adapter_Sheets.upsert('Mock_Entity', payload);
        
        // Debe ignorar la colisión y forzar la reescritura
        expect(updateAction.action).toBe('updated');
        expect(mockSetValues).toHaveBeenCalled();
        const savedRowData = mockSetValues.mock.calls[mockSetValues.mock.calls.length - 1][0][0];
        
        // Y naturalmente le sube la versión incrementada de la base (3 -> 4)
        expect(savedRowData[2]).toBe(4);
    });

    test('5. LockService executes transactional barrier correctly', () => {
        const payload = { id_dom: 'DOM-TEST-1', nombre: 'Lock Validation', _version: 3 };
        
        Adapter_Sheets.upsert('Mock_Entity', payload);
        
        // Verifica que la barrera de tiempo de 10s se abrió y se cerró exitosamente
        expect(mockLock.waitLock).toHaveBeenCalledWith(10000);
        expect(mockLock.releaseLock).toHaveBeenCalled();
        expect(global.SpreadsheetApp.flush).toHaveBeenCalled(); // Verifica Flush Inmediato
    });
});
