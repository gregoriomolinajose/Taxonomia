const Adapter_Sheets = require('../src/Adapter_Sheets.js');

describe('Audit Trail: Adapter_Sheets Inmutabilidad en Update', () => {
    let mockSheet;
    let mockSpreadsheetApp;
    let mockSession;
    let setValuesMock;

    beforeEach(() => {
        setValuesMock = jest.fn();

        mockSheet = {
            getLastColumn: jest.fn().mockReturnValue(6),
            getRange: jest.fn((row, col, numRows, numCols) => {
                // 1. Lectura de Encabezados (Fila 1)
                if (row === 1) {
                    return {
                        getValues: () => [['id_user', 'name', 'created_at', 'created_by', 'updated_at', 'updated_by']]
                    };
                }
                // 2. Búsqueda de la Primary Key (Columna id_user)
                if (row === 2 && col === 1 && numCols === 1) {
                    return {
                        getValues: () => [['USER-123'], ['USER-456']]
                    };
                }
                // 3. Lectura de fila existente para el merge protector (Fila 2)
                if (row === 2 && numCols === 6) {
                    return {
                        getValues: () => [[
                            'USER-123',
                            'John Doe Original',
                            '2026-03-19T00:00:00.000Z',
                            'admin@local',
                            '2026-03-19T00:00:00.000Z',
                            'admin@local'
                        ]],
                        setValues: setValuesMock
                    };
                }
                // 4. Inyección final (setValues)
                return {
                    getValues: () => [[]],
                    setValues: setValuesMock
                };
            }),
            getDataRange: jest.fn(() => ({
                getNumRows: () => 3 // headers + 2 data rows
            })),
            appendRow: jest.fn(),
            insertSheet: jest.fn()
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

        // Spy sobre el mock global
        const globalSheet = global.SpreadsheetApp.openById().getSheetByName();
        
        globalSheet.getRange = mockSheet.getRange;
        globalSheet.getLastColumn = mockSheet.getLastColumn;
        
        // No sobreescribir global.SpreadsheetApp
        global.Session = mockSession;
        global.Logger = { log: jest.fn() };
        global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
    });

    afterEach(() => {
        delete global.Session;
        delete global.Logger;
        delete global.CONFIG;
        jest.useRealTimers();
    });

    test('Debe preservar created_at de ayer y actualizar updated_at ignorando llaves sucias del Frontend', () => {
        // Fijar el tiempo actual para simular el server-time al momento del update
        const todayISO = '2026-03-20T22:54:34.000Z';
        jest.useFakeTimers().setSystemTime(new Date(todayISO));

        // Payload sucio enviado desde el frontend (Simulando Frontend desobediente o Hackeo)
        const dirtyPayload = {
            id_user: 'USER-123',
            name: 'John Doe Editado',
            // Estas llaves JAMÁS deben llegar, o si llegan, deben ser ignoradas:
            created_at: '1999-01-01T00:00:00.000Z', // Intento de hackear created_at
            created_by: 'hacker@malicioso',         // Intento de hackear created_by
            updated_at: '1999-01-01T00:00:00.000Z', // Intento de retrasar updated_at
            updated_by: 'hacker@malicioso'          // Intento de falsificar identidad
        };

        // Ejecutar upsert (Update Flow)
        const result = Adapter_Sheets.upsert('Users', dirtyPayload);

        // Validar respuesta del adaptador
        expect(result.action).toBe('updated');
        expect(setValuesMock).toHaveBeenCalledTimes(1);

        // Inspeccionar el array final que se inyecta en la Base de Datos
        const injectedArray = setValuesMock.mock.calls[0][0][0];

        // Índices: 
        // 0: id_user, 1: name, 2: created_at, 3: created_by, 4: updated_at, 5: updated_by

        // 1. Mutación legítima del Update fue aceptada
        expect(injectedArray[1]).toBe('John Doe Editado');

        // 2. INMUTABILIDAD MATEMÁTICA: El 'created_at/by' se restauró exacto desde la fila existente
        expect(injectedArray[2]).toBe('2026-03-19T00:00:00.000Z');
        expect(injectedArray[3]).toBe('admin@local');

        // 3. SEGURIDAD DE AUTORIDAD: El 'updated_at/by' ignoró la carga sucia y aplicó variables del Servidor
        expect(injectedArray[4]).toBe(todayISO);
        expect(injectedArray[5]).toBe('editor@local');
    });
});
