const { APP_SCHEMAS } = require('../src/Schema_Engine.gs');

describe('TDD: Jerarquía Recursiva Dinámica (Zero-Touch Trigger)', () => {
    test('El esquema Dominio debe incluir triggers_refresh_of en nivel_tipo y el componente receptor en id_dominio_padre', () => {
        const schema = APP_SCHEMAS['Dominio'];
        expect(schema).toBeDefined();
        
        const sourceField = schema.fields.find(f => f.name === 'nivel_tipo');
        expect(sourceField).toBeDefined();
        expect(sourceField.triggers_refresh_of).toContain('id_dominio_padre');

        const parentField = schema.fields.find(f => f.name === 'id_dominio_padre');
        expect(parentField).toBeDefined();
        expect(parentField.type).toBe('select');
        expect(parentField.lookupSource).toBe('getDominiosPadreOptions');
    });
});
