// __tests__/Unidad_Negocio_CRUD.test.js

/**
 * Test for Unidad_Negocio CRUD logic.
 * Ensures the metadata-driven architecture handles the new entity correctly.
 */

global.Session = {
    getActiveUser: jest.fn(() => ({
        getEmail: jest.fn(() => 'test.user@taxonomia.com')
    }))
};

const Engine_DB_Mock = {
    create: jest.fn((entityName, data) => {
        return { success: true, Entity: entityName, data: data };
    })
};

global.Engine_DB = Engine_DB_Mock;

const API_Universal = require('../src/API_Universal.gs');

describe('Unidad_Negocio CRUD - Verification', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Should handle "Unidad_Negocio" creation via API_Universal', () => {
        const mockPayload = {
            id_unidad: 'UNE-TEST-123',
            nombre: 'Unidad de Prueba',
            codigo_interno: 'CC-999',
            director: 'Test Director',
            descripcion: 'Unidad creada para verificación'
        };

        // Simular llamada desde el frontend
        API_Universal._handleCreate('Unidad_Negocio', mockPayload);

        expect(Engine_DB_Mock.create).toHaveBeenCalledTimes(1);
        const [entityName, data] = Engine_DB_Mock.create.mock.calls[0];

        expect(entityName).toBe('Unidad_Negocio');
        expect(data.nombre).toBe('Unidad de Prueba');
        expect(data.codigo_interno).toBe('CC-999');
    });

    test('Should verify schema existence in JS_Schemas_Config', () => {
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.resolve(__dirname, '../src/JS_Schemas_Config.html');
        const content = fs.readFileSync(schemaPath, 'utf8');
        
        expect(content).toContain('Unidad_Negocio:');
        expect(content).toContain('"id_unidad": { "type": "hidden", "primaryKey": true }');
    });
});
