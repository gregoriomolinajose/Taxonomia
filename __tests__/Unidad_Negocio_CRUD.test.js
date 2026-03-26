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
            id_unidad_negocio: 'UNE-TEST-123',
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

    test('Should verify schema existence in Schema_Engine.gs', () => {
        const fs = require('fs');
        const path = require('path');
        const schemaPath = path.resolve(__dirname, '../src/Schema_Engine.gs');
        const content = fs.readFileSync(schemaPath, 'utf8');
        
        expect(content).toContain('Unidad_Negocio:');
        expect(content).toContain('name: "id_unidad_negocio"');
    });

    test('Should generate a short UUID (UNID-XXXXX) if id_unidad_negocio is missing in Router', () => {
        const payloadWithoutId = {
            nombre: 'Unidad sin ID predefinido',
            codigo_interno: 'ID-NULL',
            director: 'Automated Gen'
        };

        const rawResponse = API_Universal.API_Universal_Router('create', 'Unidad_Negocio', payloadWithoutId);
        const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;

        expect(response.status).toBe('success');
        expect(Engine_DB_Mock.create).toHaveBeenCalled();
        
        const [entityName, data] = Engine_DB_Mock.create.mock.calls[0];
        // Prefijo UNID- (4 letras de Unidad_Negocio) + 5 alfanuméricos
        expect(data.id_unidad_negocio).toMatch(/^UNID-[A-Z0-9]{5}$/);
    });
});
