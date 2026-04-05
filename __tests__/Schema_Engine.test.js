const { getAppSchema, getEntityTopologyRules } = require('../src/Schema_Engine.gs');

describe('Schema_Engine Governance', () => {

    describe('getAppSchema', () => {
        it('should return specific entity schema if requested', () => {
            const schema = getAppSchema('Dominio');
            expect(schema).toBeDefined();
            expect(schema.titleField).toBe('n0_es');
        });

        it('should return all schemas if no entity requested', () => {
            const schemas = getAppSchema();
            expect(schemas).toBeDefined();
            expect(schemas.Dominio).toBeDefined();
            expect(schemas.Capacidad).toBeDefined();
        });
        
        it('should return undefined for unregistered entity', () => {
            const schema = getAppSchema('EntidadFalsa');
            expect(schema).toBeUndefined();
        });
    });

    describe('getEntityTopologyRules (Resilience Fallbacks)', () => {
        it('should return defined rules from schema if present', () => {
            const rules = getEntityTopologyRules('Dominio');
            expect(rules).toBeDefined();
            expect(rules.topologyType).toBe('JERARQUICA_ESTRICTA');
            expect(rules.preventCycles).toBe(true);
        });

        it('should return SAFE FLAT defaults if entity is unknown (Fallback)', () => {
            const rules = getEntityTopologyRules('ModuloSecreto');
            expect(rules).toBeDefined();
            expect(rules.topologyType).toBe('FLAT');
            expect(rules.deletionStrategy).toBe('ORPHAN'); // Safe setting
            expect(rules.preventCycles).toBe(false);
        });
        
        it('should return SAFE FLAT defaults if entity is known but has no topologyRules', () => {
            const rules = getEntityTopologyRules('Unidad_Negocio'); // This entity runs as purely flat currently
            expect(rules).toBeDefined();
            expect(rules.topologyType).toBe('FLAT');
        });
    });

});
