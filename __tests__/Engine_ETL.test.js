// __tests__/Engine_ETL.test.js

/**
 * Backend Unit Tests for Engine_ETL (S38.6)
 * Validates Deduplication logic O(1) matching and Workspace Auto-Hydration fail-open policies.
 */

// Global mock dependencies that pretend to be Google Apps Script environment
const mockAPP_SCHEMAS = {
    Persona: {
        primaryKey: 'id_persona',
        fields: [
            { name: 'email', unique: true },
            { name: 'numero_empleado', unique: true }
        ]
    },
    CajaFuerte: {
        primaryKey: 'id_caja',
        fields: [
            { name: 'serial', unique: true }
        ]
    }
};

// Injection into Global Scope for Node
global.APP_SCHEMAS = {
    ...global.APP_SCHEMAS,
    ...mockAPP_SCHEMAS
};

// Mock DB Storage to emulate list()
const dbPersonaRows = [
    { id_persona: 'USR-01', email: 'test@human.sys', numero_empleado: '1001', nombre: 'Test Uno' },
    { id_persona: 'USR-02', email: 'peter@human.sys', numero_empleado: '1002', nombre: 'Peter Dos' }
];

global.Engine_DB = {
    list: vi.fn((entityName) => {
        if (entityName === 'Persona') return { rows: dbPersonaRows };
        return { rows: [] };
    })
};

// Workspace API Mock
global.resolverDirectorioWorkspace = vi.fn();

// Require file AFTER setting globals
const { Engine_ETL } = require('../src/Engine_ETL.gs');

describe('Engine_ETL: hydrateAndDeduplicate (S38.6)', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Deduplicación O(1): Inserciones parasitarias preservan PrimaryKey pre-existente', () => {
        const payload = [
            { email: 'TEST@human.sys', nombre: 'Test Modificado' }, // Match by email (case-insensitive)
            { numero_empleado: ' 1002 ', nombre: 'Peter' },         // Match by employeenumber (trim)
            { email: 'nuevo@human.sys', nombre: 'Nuevo Empleado' } // No match
        ];

        Engine_ETL.hydrateAndDeduplicate('Persona', payload);

        // Validation
        expect(payload[0].id_persona).toBe('USR-01'); // Retrieved existing ID
        expect(payload[1].id_persona).toBe('USR-02'); // Retrieved existing ID
        expect(payload[2].id_persona).toBeUndefined(); // Passes unaltered
        
        // Ensure Engine_DB was polled for cache map
        expect(global.Engine_DB.list).toHaveBeenCalledWith('Persona', 'objects');
    });

    it('2. Hidratación Workspace: Auto-poblado si no hay nombre pero sí correo válido', () => {
        global.resolverDirectorioWorkspace.mockReturnValueOnce({
            nombre: 'Juan Workspace',
            puesto: 'Dev'
        });

        const payload = [
            { email: 'juan@demo.com', nombre: '' },
            { email: 'maria@demo.com', nombre: 'Maria Override' }
        ];

        Engine_ETL.hydrateAndDeduplicate('Persona', payload);

        // Juan should be hydrated
        expect(global.resolverDirectorioWorkspace).toHaveBeenCalledWith('juan@demo.com');
        expect(payload[0].nombre).toBe('Juan Workspace');
        expect(payload[0].puesto).toBe('Dev');

        // Maria is NOT hydrated because name already exists (Skip)
        expect(global.resolverDirectorioWorkspace).not.toHaveBeenCalledWith('maria@demo.com');
        expect(payload[1].nombre).toBe('Maria Override');
    });

    it('3. Resiliencia Fail-Open: Excepciones de Workspace Rate Limit no truncan el lote', () => {
        // Mock a failure throw inside Directory API
        global.resolverDirectorioWorkspace.mockImplementationOnce(() => {
            throw new Error("Quota Exceeded Workspace API");
        });

        const payload = [
            { email: 'fail@demo.com', nombre: '' }
        ];

        // Ensure it doesn't throw and crash the bulk insert
        expect(() => {
             Engine_ETL.hydrateAndDeduplicate('Persona', payload);
        }).not.toThrow();

        // The user should pass unharmed (Fail Open)
        expect(payload[0].email).toBe('fail@demo.com');
        expect(payload[0].nombre).toBe('');
        // Logger should record the incident
        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringContaining('Ignorando error WS para fail@demo.com'));
    });
});
