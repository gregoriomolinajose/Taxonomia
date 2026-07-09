/**
 * ValidationEngine handles schema-driven validation for data ingestion and UI inputs.
 */
const ValidationEngine = {
    /**
     * Validates a data row against the given schema rules from APP_SCHEMAS.
     * @param {Object} row - The data object to validate.
     * @param {string} schemaName - The key in APP_SCHEMAS to use for validation.
     * @returns {Object} { isValid: boolean, errors: Array, validatedData: Object }
     */
    validate: function(row, schemaName) {
        let isAppSchemasDefined = (typeof APP_SCHEMAS !== 'undefined');
        let schemas = isAppSchemasDefined ? APP_SCHEMAS : (typeof global !== 'undefined' && global.APP_SCHEMAS ? global.APP_SCHEMAS : null);
        
        if (!schemas || !schemas[schemaName]) {
            throw new Error(`Schema no encontrado para la validación: ${schemaName}`);
        }

        const schema = schemas[schemaName];
        const errors = [];
        const validatedData = { ...row };

        // T1: Basic required fields check
        if (schema.fields && Array.isArray(schema.fields)) {
            schema.fields.forEach(field => {
                if (field.required) {
                    const value = row[field.name];
                    if (value === undefined || value === null || String(value).trim() === '') {
                        errors.push({
                            field: field.name,
                            message: `Campo requerido faltante: ${field.name}`,
                            value: value
                        });
                    }
                }
            });
        }

        return {
            isValid: errors.length === 0,
            errors: errors,
            validatedData: validatedData
        };
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ValidationEngine };
}
