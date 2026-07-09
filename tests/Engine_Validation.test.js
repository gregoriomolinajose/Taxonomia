const { ValidationEngine } = require('../src/Engine_Validation');

describe('ValidationEngine - Basic Structure (T1)', () => {
    // Mock APP_SCHEMAS for testing
    beforeAll(() => {
        global.APP_SCHEMAS = {
            TestEntity: {
                fields: [
                    { name: 'id', type: 'hidden', required: true },
                    { name: 'name', type: 'text', required: true },
                    { name: 'optionalField', type: 'text', required: false },
                    { name: 'emailField', type: 'email', required: false },
                    { name: 'ageField', type: 'number', required: false }
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

    describe('Type & Format Validation (T2)', () => {
        test('should return validation error for invalid email', () => {
            const row = { id: '123', name: 'John Doe', emailField: 'invalid-email' };
            const result = ValidationEngine.validate(row, 'TestEntity');

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toEqual({
                field: 'emailField',
                message: 'Formato inválido. Se esperaba: email',
                value: 'invalid-email'
            });
        });

        test('should validate correct email', () => {
            const row = { id: '123', name: 'John Doe', emailField: 'john@example.com' };
            const result = ValidationEngine.validate(row, 'TestEntity');

            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        test('should return validation error for invalid number', () => {
            const row = { id: '123', name: 'John Doe', ageField: 'not-a-number' };
            const result = ValidationEngine.validate(row, 'TestEntity');

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0]).toEqual({
                field: 'ageField',
                message: 'Formato inválido. Se esperaba: number',
                value: 'not-a-number'
            });
        });

        test('should validate correct number', () => {
            const row = { id: '123', name: 'John Doe', ageField: 25 };
            const result = ValidationEngine.validate(row, 'TestEntity');

            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });
    });

    describe('Response Standardization & Partial Validation (T3)', () => {
        test('should return standardized response object', () => {
            const row = { id: '123', name: 'John Doe' };
            const result = ValidationEngine.validate(row, 'TestEntity');
            
            expect(result).toHaveProperty('isValid');
            expect(result).toHaveProperty('errors');
            expect(result).toHaveProperty('validatedData');
            expect(Array.isArray(result.errors)).toBe(true);
        });

        test('should allow partial validation (skipping required checks)', () => {
            const row = { id: '123' }; // missing required 'name'
            // pass { partial: true } to skip required validation
            const result = ValidationEngine.validate(row, 'TestEntity', { partial: true });

            expect(result.isValid).toBe(true);
            expect(result.errors.length).toBe(0);
        });

        test('partial validation should still validate types if present', () => {
            const row = { id: '123', emailField: 'invalid-email' }; 
            const result = ValidationEngine.validate(row, 'TestEntity', { partial: true });

            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBe(1);
            expect(result.errors[0].field).toBe('emailField');
        });
    });
});
