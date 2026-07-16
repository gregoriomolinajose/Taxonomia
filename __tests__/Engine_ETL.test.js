// __tests__/Engine_ETL.test.js

/**
 * Backend Unit Tests for Engine_ETL (S38.6)
 * Validates Deduplication logic O(1) matching and Workspace Auto-Hydration fail-open policies.
 */

// Global mock dependencies that pretend to be Google Apps Script environment
const mockAPP_SCHEMAS = {
    Persona: {
        primaryKey: 'id_persona',
        mutationInterceptors: ['AutoProvisionLiderDirecto'],
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

global.getAppSchema = (entityName) => global.APP_SCHEMAS[entityName];
global.getFieldNameFromLabel = vi.fn((entityName, label) => String(label).toLowerCase());

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
const { Business_Interceptors } = require('../src/Business_Interceptors.js');
global.Business_Interceptors = Business_Interceptors;
const { Engine_ETL } = require('../src/Engine_ETL.js');

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

    it('2. Interceptores de Negocio: Llama a Business_Interceptors.apply() si está definido', () => {
        global.Business_Interceptors = { apply: vi.fn() };
        const payload = [{ email: 'intercept@demo.com', nombre: 'Test' }];

        Engine_ETL.hydrateAndDeduplicate('Persona', payload);

        expect(global.Business_Interceptors.apply).toHaveBeenCalledWith('Persona', payload);
    });

    it('3. Title Case Normalization: Aplica toTitleCase a roles_asignados, equipo y cargo', () => {
        const payload = [
            { email: 'title@demo.com', equipo: 'DATA ENGINEER', cargo: 'FRONT-END DEVELOPER', roles_asignados: 'ADMIN, SUPERUSER' }
        ];

        Engine_ETL.hydrateAndDeduplicate('Persona', payload);

        expect(payload[0].equipo).toBe('Data Engineer');
        expect(payload[0].cargo).toBe('Front-End Developer');
        expect(payload[0].roles_asignados).toBe('Admin, Superuser');
    });
});

describe('Engine_ETL: extractDataFromDrive (S61.10)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should bound the extraction range to ignore empty trailing rows', () => {
        const mockGetDisplayValues = vi.fn(() => [['email', 'nombre'], ['test@test.com', 'Test']]);
        const mockGetValues = vi.fn(() => {
            const raw = [['email', 'nombre', 'numero_empleado'], ['test@test.com', 'Test', '123']];
            for (let i = 2; i < 1000; i++) {
                raw.push(['', '', '']);
            }
            return raw;
        });
        const mockGetRange = vi.fn(() => ({
            getDisplayValues: mockGetDisplayValues,
            getValues: vi.fn(() => [['email', 'nombre', 'numero_empleado']]) // Just for line 297 getValues()[0]
        }));
        const mockGetDataRange = vi.fn(() => ({
            getValues: mockGetValues,
            getNumColumns: vi.fn(() => 3),
            getDisplayValues: vi.fn(() => {
                const raw = [['email', 'nombre', 'numero_empleado'], ['test@test.com', 'Test', '123']];
                for (let i = 2; i < 1000; i++) {
                    raw.push(['', '', '']);
                }
                return raw;
            })
        }));

        const mockSheet = {
            getLastColumn: vi.fn(() => 3),
            getLastRow: vi.fn(() => 1000),
            getName: vi.fn(() => 'TestSheet'),
            getDataRange: mockGetDataRange,
            getRange: mockGetRange
        };

        global.SpreadsheetApp = {
            openById: vi.fn(() => ({
                getSheets: vi.fn(() => [mockSheet]),
                getName: vi.fn(() => 'Test Spreadsheet')
            }))
        };

        const records = Engine_ETL.extractDataFromDrive('Persona', 'https://docs.google.com/spreadsheets/d/12345/edit');

        expect(records.length).toBe(1);
        expect(records[0].email).toBe('test@test.com');
        
        // Assert that getRange was called with bounded rows
        expect(mockGetRange).toHaveBeenCalledWith(1, 1, 2, 3);
        expect(mockGetDisplayValues).toHaveBeenCalled();
    });

    it('should throw explicit Error when headers are completely incompatible (maxOverlap <= 0) (S61.16)', () => {
        const mockGetValues = vi.fn(() => [['col_invalida_1', 'col_invalida_2'], ['foo', 'bar']]);
        const mockGetRange = vi.fn(() => ({
            getValues: mockGetValues,
            getDisplayValues: mockGetValues
        }));
        
        const mockSheet = {
            getLastColumn: vi.fn(() => 2),
            getLastRow: vi.fn(() => 2),
            getName: vi.fn(() => 'TestSheet'),
            getRange: mockGetRange,
            getDataRange: vi.fn(() => ({
                getValues: mockGetValues,
                getNumColumns: vi.fn(() => 2),
                getDisplayValues: mockGetValues
            }))
        };

        global.SpreadsheetApp = {
            openById: vi.fn(() => ({
                getSheets: vi.fn(() => [mockSheet]),
                getName: vi.fn(() => 'Test Spreadsheet')
            }))
        };

        expect(() => {
            Engine_ETL.extractDataFromDrive('Persona', 'https://docs.google.com/spreadsheets/d/12345/edit');
        }).toThrow(/Formato Estricto Incompatible/);
    });

    it('should throw explicit Error when sheet is completely empty (S61.16)', () => {
        const mockSheet = {
            getLastColumn: vi.fn(() => 0),
            getLastRow: vi.fn(() => 0),
            getName: vi.fn(() => 'EmptySheet'),
            getRange: vi.fn(),
            getDataRange: vi.fn()
        };

        global.SpreadsheetApp = {
            openById: vi.fn(() => ({
                getSheets: vi.fn(() => [mockSheet]),
                getName: vi.fn(() => 'Test Spreadsheet')
            }))
        };

        expect(() => {
            Engine_ETL.extractDataFromDrive('Persona', 'https://docs.google.com/spreadsheets/d/empty/edit');
        }).toThrow();
    });
});
