const Adapter_Sheets = require('../src/Adapter_Sheets.js');

describe('Red Phase - Auto-Aprovisionamiento DB y Schema: Capacidad', () => {
    let mockSpreadsheetApp;
    let mockSpreadsheet;
    let insertSheetMock;
    let setValuesMock;
    let mockSession;

    beforeEach(() => {
        setValuesMock = jest.fn();
        
        const mockNewSheet = {
            getLastRow: jest.fn().mockReturnValue(0), // Simular hoja vacía recién creada
            getRange: jest.fn().mockReturnValue({
                setValues: setValuesMock
            }),
            appendRow: jest.fn(),
            getDataRange: jest.fn().mockReturnValue({
                getValues: jest.fn().mockReturnValue([[]]), // Para que no explote data[0]
                getNumRows: () => 0
            })
        };

        insertSheetMock = jest.fn().mockReturnValue(mockNewSheet);

        mockSpreadsheet = {
            getSheetByName: jest.fn().mockReturnValue(null), // Simular que la hoja NO existe
            insertSheet: insertSheetMock
        };

        mockSpreadsheetApp = {
            openById: jest.fn().mockReturnValue(mockSpreadsheet)
        };

        mockSession = {
            getActiveUser: jest.fn().mockReturnValue({
                getEmail: jest.fn().mockReturnValue('admin@local')
            })
        };

        global.SpreadsheetApp = mockSpreadsheetApp;
        global.Session = mockSession;
        global.Logger = { log: jest.fn() };
        global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
        
        // Mock del Schema Engine (Entidad Plana: Capacidad)
        global.APP_SCHEMAS = {
            'Capacidad': {
                id_capacidad: { type: 'hidden', primaryKey: true },
                estado: { type: 'hidden', defaultValue: 'Activo' },
                id_externo: { type: 'text' },
                nivel_tipo: { type: 'number' },
                orden_path: { type: 'text' },
                macrocapacidad: { type: 'text' },
                nombre_ingles: { type: 'text' },
                abreviacion: { type: 'text' },
                descripcion: { type: 'textarea' },
                contexto_completo_analisis: { type: 'textarea' },
                path_completo_es: { type: 'text' }
            }
        };
    });

    afterEach(() => {
        delete global.SpreadsheetApp;
        delete global.Session;
        delete global.Logger;
        delete global.CONFIG;
        delete global.APP_SCHEMAS;
    });

    test('Debe interceptar, crear la hoja Capacidad e inyectarle los encabezados planos + auditoría', () => {
        // Dispara la acción de list, que al no existir la Hoja DB_Capacidad, forzará el _ensureSheetExists()
        const result = Adapter_Sheets.list('Capacidad', global.CONFIG);
        
        // 1. Verificación de Inyección de Pestaña
        expect(mockSpreadsheet.getSheetByName).toHaveBeenCalledWith('DB_Capacidad');
        expect(insertSheetMock).toHaveBeenCalledWith('DB_Capacidad');

        // 2. Verificación Dinámica de Extracción (El motor debe saber lidiar con esquemas sin `.fields` pasándole keys)
        expect(setValuesMock).toHaveBeenCalledTimes(1);
        
        const injectedHeaders = setValuesMock.mock.calls[0][0][0]; 
        
        const expectedHeaders = [
            'id_capacidad', 'estado', 'id_externo', 'nivel_tipo', 'orden_path', 'macrocapacidad', 
            'nombre_ingles', 'abreviacion', 'descripcion', 'contexto_completo_analisis', 'path_completo_es',
            'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by'
        ];
        
        expect(injectedHeaders).toEqual(expectedHeaders);
        
        // 3. Validar finalización limpia del RPC list()
        expect(result.rows).toEqual([]);
    });
});
