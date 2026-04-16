// __tests__/API_Universal_ETL.test.js

/**
 * Backend Integration Tests for API_Universal Router (S38.6)
 * Validates the pipeline: bulkInsert Router -> Engine_ETL -> Engine_DB
 */

// Mock Dependencies
global.Engine_DB = {
    upsertBatch: vi.fn().mockReturnValue({ affectedRows: 2, status: 'success' })
};

global.Engine_ETL = {
    hydrateAndDeduplicate: vi.fn()
};

global.APP_SCHEMAS = {
    Persona: { primaryKey: 'id_persona', fields: [] }
};

global.Session = {
    getActiveUser: vi.fn().mockReturnValue({
        getEmail: vi.fn().mockReturnValue('admin@sys.com')
    })
};

global.Engine_ABAC = {
    resolveTopologyFor: vi.fn().mockReturnValue({ permissions: { 'Persona': 'ALL' } }),
    validatePermission: vi.fn().mockReturnValue(true) // Permitimos todo para el router en este mock
};

global.getAppSchema = (entityName) => global.APP_SCHEMAS[entityName] || { primaryKey: 'id', fields: [] };
global.Logger = { log: vi.fn() };
global._generateShortUUID = vi.fn().mockReturnValue('UUID1234');

// Import the module under test
const { API_Universal_Router } = require('../src/API_Universal.gs');

describe('API_Universal: Integration ETL Hub (S38.6)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Router transfiere exitosamente la orden a Engine_ETL y luego a Engine_DB', () => {
        const payload = [
            { nombre: 'A', email: 'a@sys.com' },
            { nombre: 'B', email: 'b@sys.com' }
        ];

        const responseJson = API_Universal_Router('bulkInsert', 'Persona', payload);
        const result = JSON.parse(responseJson);

        if (result.status === 'error') console.error('Router Error:', result.message);
        
        expect(result.status).toBe('success');
        expect(result.insertedCount).toBe(2);

        // Verifica la integridad del Pipeline de Software
        expect(global.Engine_ETL.hydrateAndDeduplicate).toHaveBeenCalledTimes(1);
        expect(global.Engine_ETL.hydrateAndDeduplicate).toHaveBeenCalledWith('Persona', payload);

        // Verifica que la persistencia cruda sea llamada DESPUÉS
        expect(global.Engine_DB.upsertBatch).toHaveBeenCalledTimes(1);
        expect(global.Engine_DB.upsertBatch).toHaveBeenCalledWith('Persona', payload);
        
        // Verifica que se hayan autogenerado los UUIDs (ID_Persona transaccional temporal)
        const passedToDB = global.Engine_DB.upsertBatch.mock.calls[0][1];
        expect(passedToDB[0].id_persona).toBeDefined();
        expect(passedToDB[0].id_persona.toString().length).toBeGreaterThan(0);
    });

    it('2. Router rechaza payloads que no sean Array para bulkInsert (Fail Fast)', () => {
        const responseJson = API_Universal_Router('bulkInsert', 'Persona', { this: 'is object' });
        const result = JSON.parse(responseJson);
        
        expect(result.status).toBe('error');
        expect(result.message).toMatch(/must be an array/i);
        
        // Pipeline should be halted
        expect(global.Engine_ETL.hydrateAndDeduplicate).not.toHaveBeenCalled();
        expect(global.Engine_DB.upsertBatch).not.toHaveBeenCalled();
    });
});
