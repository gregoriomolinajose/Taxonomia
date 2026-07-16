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
            { email: 'user@coppel.com', name: 'Bob' }
        ];

        expect(() => {
            // we will invoke the interceptor directly for unit testing
            Business_Interceptors.apply('Persona', items); // this will do nothing if it's not wired in Schema_Engine
        }).not.toThrow();

        // But to test just the interceptor method directly, we can mock getAppSchema
        global.getAppSchema = vi.fn(() => ({
            mutationInterceptors: ['EnforceAllowedDomains']
        }));

        expect(() => {
            Business_Interceptors.apply('Persona', items);
        }).not.toThrow();
    });

    test('Should reject mutation when domain is invalid', () => {
        const items = [
            { email: 'user@gmail.com', name: 'Bob' }
        ];

        global.getAppSchema = vi.fn(() => ({
            mutationInterceptors: ['EnforceAllowedDomains']
        }));

        expect(() => {
            Business_Interceptors.apply('Persona', items);
        }).toThrow(/Domain @gmail\.com is not allowed/);
    });

    test('Should reject when email is missing or empty', () => {
        const items = [
            { name: 'No Email' }
        ];

        global.getAppSchema = vi.fn(() => ({
            mutationInterceptors: ['EnforceAllowedDomains']
        }));

        expect(() => {
            Business_Interceptors.apply('Persona', items);
        }).toThrow(/Email is required/);
    });
});
