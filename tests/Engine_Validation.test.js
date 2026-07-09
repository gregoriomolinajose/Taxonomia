const { ValidationEngine } = require('../src/Engine_Validation');

describe('ValidationEngine - Basic Structure (T1)', () => {
    // Mock APP_SCHEMAS for testing
    beforeAll(() => {
        global.APP_SCHEMAS = {
            TestEntity: {
                fields: [
                    { name: 'id', type: 'hidden', required: true },
                    { name: 'name', type: 'text', required: true },
                    { name: 'optionalField', type: 'text', required: false }
                ]
            }
        };
    });

    afterAll(() => {
        delete global.APP_SCHEMAS;
    });

    test('should validate a correct row with no errors', () => {
        const row = { id: '123', name: 'John Doe', optionalField: 'test' };
        const result = ValidationEngine.validate(row, 'TestEntity');

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.validatedData).toEqual({ id: '123', name: 'John Doe', optionalField: 'test' });
    });

    test('should return validation error for missing required field', () => {
        const row = { id: '123' }; // missing 'name'
        const result = ValidationEngine.validate(row, 'TestEntity');

        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBe(1);
        expect(result.errors[0]).toEqual({
            field: 'name',
            message: 'Campo requerido faltante: name',
            value: undefined
        });
        expect(result.validatedData).toEqual({ id: '123' });
    });
});
