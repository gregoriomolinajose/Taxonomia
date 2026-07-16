const { Business_Interceptors } = require('../src/Business_Interceptors.js');

describe('Business_Interceptors - CalculateDominioTopology', () => {
    beforeEach(() => {
        global.Engine_DB = {
            list: jest.fn()
        };
        global.Logger = { log: jest.fn() };
    });

    afterEach(() => {
        delete global.Engine_DB;
        delete global.Logger;
        delete global.getAppSchema;
    });

    test('Should assign relaciones_padre based on orden_path and DB lookup', () => {
        // Arrange
        const existingDominios = [
            { id_dominio: 'DOM-1', orden_path: '1', nombre: 'Root' },
            { id_dominio: 'DOM-2', orden_path: '1.1', nombre: 'Child A' }
        ];

        global.Engine_DB.list.mockReturnValue({ rows: existingDominios });

        const items = [
            { id_dominio: 'DOM-3', orden_path: '1.2', nombre: 'Child B' },
            { id_dominio: 'DOM-4', orden_path: '1.1.1', nombre: 'Grandchild' }
        ];

        global.getAppSchema = jest.fn(() => ({
            mutationInterceptors: ['CalculateDominioTopology']
        }));

        // Act
        Business_Interceptors.apply('Dominio', items);
        
        // Assert
        // DOM-3 (1.2) -> parent is '1', which is DOM-1
        expect(items[0].relaciones_padre).toBe('DOM-1');
        // DOM-4 (1.1.1) -> parent is '1.1', which is DOM-2
        expect(items[1].relaciones_padre).toBe('DOM-2');
    });

    test('Should handle missing parent without error and leave relaciones_padre untouched', () => {
        // Arrange
        const existingDominios = [];

        global.Engine_DB.list.mockReturnValue({ rows: existingDominios });

        const items = [
            { id_dominio: 'DOM-5', orden_path: '1.3', nombre: 'Child C' } // Parent '1' is missing
        ];

        global.getAppSchema = jest.fn(() => ({
            mutationInterceptors: ['CalculateDominioTopology']
        }));

        // Act
        Business_Interceptors.apply('Dominio', items);
        
        // Assert
        expect(items[0].relaciones_padre).toBeUndefined();
    });
});
