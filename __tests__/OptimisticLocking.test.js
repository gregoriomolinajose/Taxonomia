// __tests__/OptimisticLocking.test.js

/**
 * Tests for the Optimistic Locking Implementation (Epic E21).
 * Validates concurrency control mechanism via _version increment logic.
 */

global.Session = {
    getActiveUser: jest.fn(() => ({
        getEmail: jest.fn(() => 'test.user@taxonomia.com')
    }))
};

global.CONFIG = {
    SPREADSHEET_ID_DB: 'TEST-DB-ID'
};

const mockSetValues = jest.fn();

const mockSheet = {
    getLastRow: jest.fn(() => 2),
    getLastColumn: jest.fn(() => 4),
    getDataRange: jest.fn(() => ({
        getNumRows: jest.fn(() => 2)
    })),
    getRange: jest.fn((row, col, numRows, numCols) => {
        // Devuelve siempre un objecto con setValues
        const defaultRet = { getValues: () => [[]], setValues: mockSetValues };

        // Mock headers
        if (row === 1) {
            return { getValues: () => [['id_dom', 'nombre', '_version', 'estado']], setValues: mockSetValues };
        }
        
        // Mock ID column (solicitado solo con 1 columna de longitud)
        if (col === 1 && numCols === 1 && numRows > 0) {
            return { getValues: () => [['DOM-TEST-1']], setValues: mockSetValues };
        }
        
        // Mock Full existing row extraction (lee la fila entera, tipicamente 4 cols)
        if (numCols > 1) {
            return { getValues: () => [['DOM-TEST-1', 'Dominio de Prueba', 3, 'Activo']], setValues: mockSetValues };
        }

        return defaultRet;
    }),
    appendRow: jest.fn()
};

global.SpreadsheetApp = {
    openById: jest.fn(() => ({
        getSheetByName: jest.fn(() => mockSheet),
        insertSheet: jest.fn(() => mockSheet)
    }))
};

const Adapter_Sheets = require('../src/Adapter_Sheets.js');

describe('Optimistic Locking Control - Adapter_Sheets.upsert', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        mockSetValues.mockClear();
        
        // Setup initial mock sheet state
        mockSheet.getRange.mockImplementation((row, col, numRows, numCols) => {
            const defaultRet = { getValues: () => [[]], setValues: mockSetValues };
            if (row === 1) return { getValues: () => [['id_dom', 'nombre', '_version', 'estado']], setValues: mockSetValues };
            if (col === 1 && numCols === 1) return { getValues: () => [['DOM-TEST-1']], setValues: mockSetValues };
            if (numCols > 1) return { getValues: () => [['DOM-TEST-1', 'Dominio de Prueba', 3, 'Activo']], setValues: mockSetValues };
            return defaultRet;
        });
    });

    test('1. Creation sets _version to 1 automatically', () => {
        const payload = { id_dom: 'DOM-TEST-NEW', nombre: 'Nuevo Dominio' };
        
        Adapter_Sheets.upsert('Mock_Entity', payload);
        
        expect(mockSetValues).toHaveBeenCalledTimes(1);
        const savedRowData = mockSetValues.mock.calls[0][0][0];
        
        // _version is 1
        expect(savedRowData[2]).toBe(1);
    });

    test('2. Update correctly increments _version by 1 (Atomic Bump)', () => {
        const payload = { id_dom: 'DOM-TEST-1', nombre: 'Update Valid', _version: 3 };
        
        const updateAction = Adapter_Sheets.upsert('Mock_Entity', payload);
        
        expect(updateAction.action).toBe('updated');
        expect(mockSetValues).toHaveBeenCalledTimes(1);
        const savedRowData = mockSetValues.mock.calls[0][0][0];
        
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
        expect(mockSetValues).toHaveBeenCalledTimes(0);
    });
});
