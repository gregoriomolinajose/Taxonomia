const { Business_Interceptors } = require('../src/Business_Interceptors.js');

describe('Business_Interceptors - EnforceAllowedDomains', () => {
    beforeEach(() => {
        global.CONFIG = { ALLOWED_DOMAINS: ['@bancoppel.com', '@coppel.com'] };
        global.Logger = { log: vi.fn() };
    });

    afterEach(() => {
        delete global.CONFIG;
        delete global.Logger;
    });

    test('Should allow mutation when domain is valid', () => {
        const items = [
            { email: 'user@bancoppel.com', name: 'Alice' },
            { email: 'user@coppel.com', name: 'Bob' },
            { email: 'user@BANCOPPEL.com', name: 'Charlie' } // Test case insensitivity
        ];

        global.getAppSchema = vi.fn(() => ({
            mutationInterceptors: ['EnforceAllowedDomains']
        }));

        Business_Interceptors.apply('Persona', items);
        
        expect(items[0]._metadata?.error).toBeUndefined();
        expect(items[1]._metadata?.error).toBeUndefined();
        expect(items[2]._metadata?.error).toBeUndefined();
    });

    test('Should reject mutation when domain is invalid', () => {
        const items = [
            { email: 'user@gmail.com', name: 'Bob' }
        ];

        global.getAppSchema = vi.fn(() => ({
            mutationInterceptors: ['EnforceAllowedDomains']
        }));

        Business_Interceptors.apply('Persona', items);
        expect(items[0]._metadata.error).toMatch(/Domain @gmail\.com is not allowed/);
    });

    test('Should reject when email is missing or empty', () => {
        const items = [
            { name: 'No Email' }
        ];

        global.getAppSchema = vi.fn(() => ({
            mutationInterceptors: ['EnforceAllowedDomains']
        }));

        Business_Interceptors.apply('Persona', items);
        expect(items[0]._metadata.error).toMatch(/Email is required/);
    });

    test('Should reject when email lacks an @ symbol', () => {
        const items = [
            { email: 'invalid-email', name: 'No At' }
        ];

        global.getAppSchema = vi.fn(() => ({
            mutationInterceptors: ['EnforceAllowedDomains']
        }));

        Business_Interceptors.apply('Persona', items);
        expect(items[0]._metadata.error).toMatch(/Invalid email format/);
    });
});
