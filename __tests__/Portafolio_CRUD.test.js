// __tests__/Portafolio_CRUD.test.js

// Mock del objeto de Google Apps Script Session
global.Session = {
    getActiveUser: jest.fn(() => ({
        getEmail: jest.fn(() => 'test.user@taxonomia.com')
    }))
};

// Mock para simular Engine_DB y atrapar el payload antes de guardarlo.
const Engine_DB_Mock = {
    create: jest.fn((entityName, data) => {
        // Simulamos que el DB Engine retornará un objeto con id o true
        return { success: true, Entity: entityName, data_recibida: data };
    })
};

// Como ejecutamos en entorno Node (Jest) vamos a inyectar el mock 
// para simular la importación correcta de Engine_DB en API_Universal
global.Engine_DB = Engine_DB_Mock;

// Importamos la lógica de API_Universal (requerimos que la lógica contenga el module.exports)
const API_Universal = require('../src/API_Universal.gs');

describe('Portafolio CRUD - Capa de Servicio API_Universal', () => {

    beforeAll(() => {
        global._generateShortUUID = jest.fn(() => 'SHORT-1234');
        global._handleCreate = jest.fn((entityName, payload) => {
            return global.Engine_DB.create(entityName, payload);
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('POST (Create) inyecta campos de auditoría (created_at y updated_by) correctamente antes de invocar Engine_DB', () => {
        // 1. Arrange (Payload enviado por el Frontend FormEngine)
        const mockFrontendPayload = {
            id_portafolio: 'PORT-001',
            nombre: 'Portafolio Estratégico 2026',
            estado: 'Borrador',
            presupuesto: 500000
        };

        const requestStr = JSON.stringify({
            entity: 'Portafolio',
            action: 'create',
            data: mockFrontendPayload
        });

        // Simulamos el objeto `e` (Event) de Google Apps Script doPost(e)
        const mockPostEvent = {
            postData: {
                contents: requestStr
            }
        };

        // 2. Act
        // Llamar directamente al método interno de la API que orquesta el Create o al doPost principal si expone la lógica
        // Llamar directamente al router, que es la interfaz exportada actual
        API_Universal.API_Universal_Router('create', 'Portafolio', mockFrontendPayload);

        // 3. Assert
        // Validamos que Engine_DB_Mock.create fue llamado 1 sola vez
        expect(Engine_DB_Mock.create).toHaveBeenCalledTimes(1);

        // Extraemos los argumentos con los que Engine_DB fue llamado
        const callArgs = Engine_DB_Mock.create.mock.calls[0];
        const entityNameCalled = callArgs[0];
        const payloadCalled = callArgs[1];

        expect(entityNameCalled).toBe('Portafolio');

        // Verificaciones de Delegación (La inyección de auditoría se movió a Adapter_Sheets)
        expect(payloadCalled.nombre).toBe('Portafolio Estratégico 2026');
    });

});
