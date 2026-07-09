/**
 * ValidationEngine handles schema-driven validation for data ingestion and UI inputs.
 */
(function(global) {
    const ValidationEngine = {
        /**
         * Validates a data row against the given schema rules from APP_SCHEMAS.
         * @param {Object} row - The data object to validate.
         * @param {string} schemaName - The key in APP_SCHEMAS to use for validation.
         * @param {Object} options - Additional options (e.g., { partial: true }).
         * @returns {Object} { isValid: boolean, errors: Array, validatedData: Object }
         */
        validate: function(row, schemaName, options = {}) {
            let isAppSchemasDefined = (typeof APP_SCHEMAS !== 'undefined');
            let schemas = isAppSchemasDefined ? APP_SCHEMAS : (typeof global !== 'undefined' && global.APP_SCHEMAS ? global.APP_SCHEMAS : null);
            
            if (!schemas || !schemas[schemaName]) {
                throw new Error(`Schema no encontrado para la validación: ${schemaName}`);
            }

            const schema = schemas[schemaName];
            const errors = [];
            const validatedData = { ...row };
            const isPartial = !!options.partial;

            // T1 & T2 & T3: Required fields, type check, and partial validation
            if (schema.fields && Array.isArray(schema.fields)) {
                schema.fields.forEach(field => {
                    const value = row[field.name];
                    const isEmpty = (value === undefined || value === null || String(value).trim() === '');

                    if (field.required && isEmpty && !isPartial) {
                        errors.push({
                            field: field.name,
                            message: `Campo requerido faltante: ${field.name}`,
                            value: value
                        });
                    } else if (!isEmpty) {
                        // T2: Format validation
                        if (field.type === 'email') {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(String(value))) {
                                errors.push({
                                    field: field.name,
                                    message: `Formato inválido. Se esperaba: email`,
                                    value: value
                                });
                            }
                        } else if (field.type === 'number') {
                            if (isNaN(Number(value))) {
                                errors.push({
                                    field: field.name,
                                    message: `Formato inválido. Se esperaba: number`,
                                    value: value
                                });
                            }
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

    global.ValidationEngine = ValidationEngine;
})(typeof window !== 'undefined' ? window : this);
