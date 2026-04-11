/**
 * Jest Suite for S30.8 - Lexical Identity & Pure UUID Integration
 */

// Sin mocks de require recursivos

// Global polyfills for GAS environment
global.Logger = { log: jest.fn() };
global.Utilities = { getUuid: () => 'uuid-pure-v4-mock-1234' };
global.Session = { getActiveUser: () => ({ getEmail: () => 'test@admin.com' }) };
global.LockService = { getScriptLock: () => ({ waitLock: jest.fn(), releaseLock: jest.fn() }) };
global.SpreadsheetApp = { flush: jest.fn(), openById: jest.fn() };

const AdapterSheets = require('../src/Adapter_Sheets.js');

describe('S30.8: Identidad Lexical y Pure UUID', () => {

    beforeEach(() => {
        global.APP_SCHEMAS = {
            Mock_Normal: {
                primaryKey: "id_mock",
                metadata: { prefix: "MOCK" },
                fields: [
                    { name: 'id_mock', primaryKey: true },
                    { name: 'lexical_id' },
                    { name: 'nombre' }
                ]
            },
            Mock_Fallback_ID: {
                // Sin metadata ni primaryKey
                fields: [
                    { name: 'lexical_id' },
                    { name: 'nombre' }
                ]
            }
        };
    });

    test('1. Validar que la omisión de metadata.prefix hace fallback a 4 letras nativas', () => {
        const schema = global.APP_SCHEMAS.Mock_Fallback_ID;
        const normalizedHeaders = ['id', 'lexical_id', 'nombre'];
        const mockRows = [
            normalizedHeaders
        ];
        
        // Simular cálculo atómico
        const result = AdapterSheets._calculateNextLexicalId(mockRows, normalizedHeaders, 'Mock_Fallback_ID', schema);
        
        // Debe extraer los primeros 4 caracteres "MOCK" a pesar de no declarar prefix
        expect(result).toBe('MOCK-1');
    });

    test('2. Validar Secuencia Lexical (Autoincrementador Virtual)', () => {
        const schema = global.APP_SCHEMAS.Mock_Normal;
        const normalizedHeaders = ['id_mock', 'lexical_id', 'nombre'];
        
        const mockRows = [
            normalizedHeaders,
            ['uuid-001', 'MOCK-14', 'Viejo1'],
            ['uuid-002', 'MOCK-15', 'Viejo2']
        ];
        
        const result = AdapterSheets._calculateNextLexicalId(mockRows, normalizedHeaders, 'Mock_Normal', schema);
        
        expect(result).toBe('MOCK-16');
    });

});
