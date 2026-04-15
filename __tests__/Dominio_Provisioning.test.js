const Adapter_Sheets = require('../src/Adapter_Sheets.js');

describe('Auto-Aprovisionamiento DB y Schema Dominio', () => {
    let mockSpreadsheetApp;
    let mockSpreadsheet;
    let insertSheetMock;
    let setValuesMock;
    let mockSession;

    beforeEach(() => {
        setValuesMock = vi.fn();
        
        const mockNewSheet = {
            getLastRow: vi.fn().mockReturnValue(0), // Simular hoja vacía recién creada
            getRange: vi.fn().mockReturnValue({
                setValues: setValuesMock
            }),
            appendRow: vi.fn(),
            getDataRange: vi.fn().mockReturnValue({
                getValues: vi.fn().mockReturnValue([[]]),
                getNumRows: () => 0
            })
        };

        insertSheetMock = vi.fn().mockReturnValue(mockNewSheet);

        mockSpreadsheet = {
            getSheetByName: vi.fn().mockReturnValue(null), // Simular que la hoja NO existe
            insertSheet: insertSheetMock
        };

        mockSpreadsheetApp = {
            openById: vi.fn().mockReturnValue(mockSpreadsheet)
        };

        mockSession = {
            getActiveUser: vi.fn().mockReturnValue({
                getEmail: vi.fn().mockReturnValue('admin@local')
            })
        };

        // Consumir el mock centralizado
        global.SpreadsheetApp.openById().getSheetByName.mockReturnValue(null);
        global.SpreadsheetApp.openById().insertSheet = insertSheetMock;
        global.Session = mockSession;
        global.Logger = { log: vi.fn() };
        global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
        
        // Mock del Schema Engine (Entidad Dominio según especificaciones del Sprint)
        global.APP_SCHEMAS = {
            'Dominio': {
                primaryKey: 'id_dominio',
                fields: [
                    { name: 'id_dominio', type: 'text' },
                    { name: 'id_registro', type: 'text' },
                    { name: 'nivel_tipo', type: 'number' },
                    { name: 'orden_path', type: 'text' },
                    { name: 'n0_es', type: 'text' },
                    { name: 'nombre_ingles', type: 'text' },
                    { name: 'definicion', type: 'textarea' },
                    { name: 'abreviacion', type: 'text' },
                    { name: 'path_completo_es', type: 'text' }
                ]
            }
        };
    });

    afterEach(() => {
        delete global.Session;
        delete global.Logger;
        delete global.CONFIG;
        delete global.APP_SCHEMAS;
    });

    test('Debe crear la hoja Dominio automáticamente e inyectarle los encabezados del esquema + auditoría', () => {
        // Intentar leer la lista de Dominios, lo que debería disparar el auto-aprovisionamiento
        const result = Adapter_Sheets.list('Dominio', global.CONFIG);
        
        // 1. Validamos que detectó que la hoja no existía y ordenó crearla
        expect(global.SpreadsheetApp.openById().getSheetByName).toHaveBeenCalledWith('DB_Dominio');
        expect(global.SpreadsheetApp.openById().insertSheet).toHaveBeenCalledWith('DB_Dominio');

        // 2. Validamos que inyectó correctamente los encabezados en la Fila 1
        expect(setValuesMock).toHaveBeenCalledTimes(1);
        
        const injectedHeaders = setValuesMock.mock.calls[0][0][0]; // Primer call, primer arg, primer row
        
        const expectedHeaders = [
            'id_dominio', 'id_registro', 'nivel_tipo', 'orden_path', 'n0_es', 
            'nombre_ingles', 'definicion', 'abreviacion', 'path_completo_es',
            'lexical_id', 'created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', '_version'
        ];
        
        expect(injectedHeaders).toEqual(expectedHeaders);
        
        // 3. Como comprobamos una base de datos vacía, list() devuelve un objeto sin elementos
        expect(result.rows).toEqual([]);
    });
});
