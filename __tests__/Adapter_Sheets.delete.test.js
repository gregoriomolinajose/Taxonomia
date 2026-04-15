// __tests__/Adapter_Sheets.delete.test.js

const Adapter_Sheets = require('../src/Adapter_Sheets.js');

describe('Soft Delete: Adapter_Sheets Inmutabilidad en Delete', () => {
    let mockSheet;
    let mockSpreadsheetApp;
    let mockSession;
    let setValuesMock;

    beforeEach(() => {
        setValuesMock = vi.fn();

        mockSheet = {
            getLastColumn: vi.fn().mockReturnValue(7),
            getRange: vi.fn((r, c, rows, cols) => {
                let data = [];
                if (r === 1) data = [['id_user', 'name', 'estado', 'created_at', 'created_by', 'updated_at', 'updated_by']];
                else if (r === 2 && c === 1 && cols === 1) data = [['USER-123']]; // Búsqueda de PK
                else data = [['USER-123', 'John Doe', 'Activo', '2026-03-19T00:00:00.000Z', 'admin@local', '', '']]; // Datos Originales
                return { getValues: () => data, setValues: setValuesMock, setValue: vi.fn() };
            }),
            getDataRange: vi.fn(() => ({
                getNumRows: () => 3
            })),
            appendRow: vi.fn()
        };

        mockSpreadsheetApp = {
            openById: vi.fn().mockReturnValue({
                getSheetByName: vi.fn().mockReturnValue(mockSheet)
            })
        };

        mockSession = {
            getActiveUser: vi.fn().mockReturnValue({
                getEmail: vi.fn().mockReturnValue('editor@local')
            })
        };

        // Consumir el mock central
        const globalSheet = global.SpreadsheetApp.openById().getSheetByName();
        globalSheet.getRange = mockSheet.getRange;
        globalSheet.getLastColumn = mockSheet.getLastColumn;
        global.Session = mockSession;
        global.Logger = { log: vi.fn() };
        global.CONFIG = { SPREADSHEET_ID_DB: 'test-id' };
        
        global.APP_SCHEMAS = {
            Users: { primaryKey: 'id_user', fields: [] } // Evita Fallo por Auto-Healing Inferencia Bloqueada
        };
        
        global.getAppSchema = vi.fn((ent) => {
            if (ent === 'Users') return { primaryKey: 'id_user', fields: [] };
            return null;
        });
    });

    afterEach(() => {
        delete global.Session;
        delete global.Logger;
        delete global.CONFIG;
        vi.useRealTimers();
    });

    test('Debe realizar Soft Delete cambiando el estado a Eliminado y actualizando la Auditoría', () => {
        const todayISO = '2026-03-22T10:00:00.000Z';
        vi.useFakeTimers().setSystemTime(new Date(todayISO));

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
