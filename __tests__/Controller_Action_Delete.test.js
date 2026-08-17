const Controller_Action = require('../src/Controller_Action');

// Mocks globales (GAS Context)
global.Engine_DB = {
    delete: vi.fn(),
    bulkDelete: vi.fn()
};
global.Engine_ABAC = {
    validatePermission: vi.fn(),
    stripProtectedFields: vi.fn((email, entity, payload) => payload)
};

describe('Controller_Action Delete & BulkDelete Orchestration', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        
        global.Session = {
            getActiveUser: vi.fn().mockReturnValue({ getEmail: vi.fn().mockReturnValue('test@local') })
        };
        global.Logger = { log: vi.fn() };
    });

    describe('Individual Delete (_handleDelete)', () => {
        it('Historia 9: Validar ruteo correcto al Engine_DB.delete tras ABAC exitoso', () => {
            // Simulamos ABAC permitiendo acceso
            Engine_ABAC.validatePermission.mockReturnValue(true);
            Engine_DB.delete.mockReturnValue({ success: true, Entity: 'Producto' });

            const result = Controller_Action._handleDelete('Producto', 'PROD-1');

            expect(Engine_ABAC.validatePermission).toHaveBeenCalledWith('test@local', 'delete', 'Producto', 'PROD-1');
            expect(Engine_DB.delete).toHaveBeenCalledWith('Producto', 'PROD-1');
            expect(result.success).toBe(true);
        });

        it('Historia 11: Bloquear borrado si ABAC rechaza', () => {
            // Simulamos ABAC denegando acceso
            Engine_ABAC.validatePermission.mockReturnValue(false);

            expect(() => {
                Controller_Action._handleDelete('Producto', 'PROD-1');
            }).toThrow(/ABAC_403_FORBIDDEN/);

            expect(Engine_DB.delete).not.toHaveBeenCalled();
        });
    });

    describe('Bulk Delete (_handleBulkDelete)', () => {
        it('Historia 9: Validar ruteo correcto al Engine_DB.bulkDelete', () => {
            Engine_ABAC.validatePermission.mockReturnValue(true);
            Engine_DB.bulkDelete.mockReturnValue({ success: true, processed: 2 });

            const ids = ['PROD-1', 'PROD-2'];
            const result = Controller_Action._handleBulkDelete('Producto', ids);

            // Debe validar permisos para CADA ID
            expect(Engine_ABAC.validatePermission).toHaveBeenCalledTimes(2);
            expect(Engine_ABAC.validatePermission).toHaveBeenNthCalledWith(1, 'test@local', 'delete', 'Producto', 'PROD-1');
            expect(Engine_ABAC.validatePermission).toHaveBeenNthCalledWith(2, 'test@local', 'delete', 'Producto', 'PROD-2');

            // Llama a bulkDelete con el arreglo
            expect(Engine_DB.bulkDelete).toHaveBeenCalledWith('Producto', ids);
            expect(result.success).toBe(true);
        });

        it('Historia 11: Bloquear borrado masivo entero si UN ID falla ABAC', () => {
            // Falla en el segundo ID
            Engine_ABAC.validatePermission.mockImplementation((email, action, entity, id) => {
                if (id === 'PROD-2') return false;
                return true;
            });

            const ids = ['PROD-1', 'PROD-2', 'PROD-3'];

            expect(() => {
                Controller_Action._handleBulkDelete('Producto', ids);
            }).toThrow(/ABAC_403_FORBIDDEN/);

            // Ningún borrado debe haber ocurrido
            expect(Engine_DB.bulkDelete).not.toHaveBeenCalled();
        });

        it('Historia 10: Validación de Parámetros Faltantes', () => {
            // Esta prueba en realidad comprueba que lance un error si falta entityName o ids,
            // pero como no tenemos validación explícita de `if(!ids) throw` en `_handleBulkDelete`,
            // al menos comprobamos que el ABAC fallará o foreach lanzará error.
            
            // Asumimos que fallará si pasamos ids undefined
            expect(() => {
                Controller_Action._handleBulkDelete('Producto', undefined);
            }).toThrow(/ERR_BAD_REQUEST_INVALID_IDS/);
        });
    });
});
