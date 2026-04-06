// __tests__/Persona_CRUD.test.js

/**
 * Test for Persona CRUD logic (Fase 1: Red).
 * Enforces Blueprint V2 compliance strictly parsing the system files.
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
const fs = require('fs');
const path = require('path');

describe('Persona CRUD - Blueprint V2 Verification', () => {

    beforeAll(() => {
        global._generateShortUUID = jest.fn(() => 'SHORT-1234');
        global._handleCreate = jest.fn((entityName, payload) => {
            return global.Engine_DB.create(entityName, payload);
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Step 1: Document Schema - Should verify schema existence in Schema_Engine.gs', () => {
        const schemaPath = path.resolve(__dirname, '../src/Schema_Engine.gs');
        const content = fs.readFileSync(schemaPath, 'utf8');
        
        expect(content).toContain('Persona:');
        expect(content).toContain('primaryKey: "numero_empleado"');
    });

    test.skip('Step 2 & 5: UI Routing & Zero-Touch - Should verify ENTITY_META registration in Index.html (OBSOLETE in V4)', () => {
        const indexPath = path.resolve(__dirname, '../src/Index.html');
        const content = fs.readFileSync(indexPath, 'utf8');
        
        expect(content).toMatch(/Persona:\s+\{/);
        expect(content).toMatch(/iconName:\s*'person-outline'/);
        expect(content).toMatch(/idField:\s*'numero_empleado'/);
    });

    test('Step 4: Output Sanitization - API should return JSON sanitized data', () => {
        const mockPayload = {
            numero_empleado: 'PERS-TEST',
            nombre_completo: 'Test User',
            email: 'test@example.com',
            rol: 'Scrum Master'
        };

        // Real router call mimicking the frontend save
        const rawResponse = API_Universal.API_Universal_Router('create', 'Persona', mockPayload);
        const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;

        expect(response.status).toBe('success');
        expect(Engine_DB_Mock.create).toHaveBeenCalled();
    });

    test('Step 6: Build Tracking - APP_VERSION should be bumped', () => {
        const configPath = path.resolve(__dirname, '../src/Global_Config.js');
        const content = fs.readFileSync(configPath, 'utf8');
        
        expect(content).toMatch(/APP_VERSION: 'v1\.\d+\.\d+/);
    });
});
