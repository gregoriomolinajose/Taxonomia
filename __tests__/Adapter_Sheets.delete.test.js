// __tests__/Adapter_Sheets.delete.test.js

const Adapter_Sheets = require('../src/Adapter_Sheets.js');

describe('Soft Delete: Adapter_Sheets Inmutabilidad en Delete', () => {
    let mockSheet;
    let mockSpreadsheetApp;
    let mockSession;
    let setValuesMock;

    beforeEach(() => {
        setValuesMock = jest.fn();

        mockSheet = {
            getLastColumn: jest.fn().mockReturnValue(7),
            getRange: jest.fn((row, col, numRows, numCols) => {
                // 1. Lectura de Encabezados (Fila 1)
                if (row === 1) {
                    return {
                        getValues: () => [['id_user', 'name', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by']]
                    };
                }
                // 2. Búsqueda de la Primary Key (Columna id_user)
                if (row === 2 && col === 1 && numCols === 1) {
                    return {
                        getValues: () => [['USER-123'], ['USER-456']]
                    };
                }
                // 3. Lectura de fila existente para el Soft Delete (Fila 2)
                if (row === 2 && numCols === 7) {
                    return {
                        getValues: () => [[
                            'USER-123',
                            'John Doe',
                            'Activo',
                            '2026-03-19T00:00:00.000Z',
                            'admin@local',
                            '2026-03-19T00:00:00.000Z',
                            'admin@local'
                        ]],
                        setValues: setValuesMock
                    };
                }
                return {
                    getValues: () => [[]],
                    setValues: setValuesMock
                };
            }),
            getDataRange: jest.fn(() => ({
                getNumRows: () => 3
            })),
            appendRow: jest.fn()
        };

        mockSpreadsheetApp = {
            openById: jest.fn().mockReturnValue({
                getSheetByName: jest.fn().mockReturnValue(mockSheet)
            })
        };

        mockSession = {
            getActiveUser: jest.fn().mockReturnValue({
                getEmail: jest.fn().mockReturnValue('editor@local')
            })
        };

        global.SpreadsheetApp = mockSpreadsheetApp;
        global.Session = mockSession;
        global.Logger = { log: jest.fn() };
        global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
    });

    afterEach(() => {
        delete global.SpreadsheetApp;
        delete global.Session;
        delete global.Logger;
        delete global.CONFIG;
        jest.useRealTimers();
    });

    test('Debe realizar Soft Delete cambiando el estado a Eliminado y actualizando la Auditoría', () => {
        const todayISO = '2026-03-22T10:00:00.000Z';
        jest.useFakeTimers().setSystemTime(new Date(todayISO));

        // Metodo teórico a implementar para soft delete
        const result = Adapter_Sheets.remove('Users', 'USER-123');

        expect(result.action).toBe('deleted');
        expect(setValuesMock).toHaveBeenCalledTimes(1);

        const injectedArray = setValuesMock.mock.calls[0][0][0];

        // Índices: 
        // 0: id_user, 1: name, 2: estado, 3: created_at, 4: created_by, 5: updated_at, 6: updated_by

        // 1. SOFT DELETE: Estado debe cambiar a 'Eliminado' o no borrar fisicamente nada
        expect(injectedArray[2]).toBe('Eliminado');

        // 2. INMUTABILIDAD MATEMÁTICA: No borramos los rastros anteriores ni los modificamos
        expect(injectedArray[1]).toBe('John Doe'); // Nombre no se destruye
        expect(injectedArray[3]).toBe('2026-03-19T00:00:00.000Z'); // created_at intacto
        expect(injectedArray[4]).toBe('admin@local'); // created_by intacto

        // 3. SEGURIDAD DE AUTORIDAD: Audit de actualizacion (updated_at/by) se debe setear al usuario que elimina
        expect(injectedArray[5]).toBe(todayISO);
        expect(injectedArray[6]).toBe('editor@local');
    });
});
