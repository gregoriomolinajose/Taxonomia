/**
     * FormValidators.html
     * 
     * [S12.1] Architectural Splitting: Business Rules & Validation
     * Responsable único de aislar la lógica de validación de campos y 
     * reglas de negocio (sumatorias autocalculadas) fuera del renderizador principal.
     */
    (function (global) {

        global.UI_Validators = global.UI_Validators || {};

        /**
         * @function validateRequiredFields
         * Valida de manera superficial y rápida (JIT) todos los inputs requeridos 
         * dentro del contenedor especificado. Ideal para Steppers.
         * @param {HTMLElement} currentContainer Contenedor de la sección actual
         * @returns {boolean}
         */
        global.UI_Validators.validateRequiredFields = function(currentContainer) {
            const inputs = currentContainer.querySelectorAll('ion-input, ion-select');
            let isValid = true;

            inputs.forEach(input => {
                let fieldIsValid = true;
                const reqAttr = input.getAttribute('required');
                const valAttr = input.getAttribute('data-validators');
                
                // 1. Check Required
                if (reqAttr === 'true' && (input.value === undefined || input.value === null || input.value === '')) {
                    fieldIsValid = false;
                }
                
                // 2. Check Regex Validators if Present and field is not empty
                if (fieldIsValid && valAttr && input.value) {
                    try {
                        const validators = JSON.parse(valAttr);
                        validators.forEach(rule => {
                            if (rule.startsWith('regex:')) {
                                const pattern = rule.split('regex:')[1];
                                const re = new RegExp(pattern);
                                if (!re.test(input.value)) {
                                    fieldIsValid = false;
                                }
                            }
                        });
                    } catch (e) {
                        console.warn('[Validators] Error parseando data-validators: ', e);
                    }
                }
                
                if (!fieldIsValid) {
                    isValid = false;
                    input.classList.add('ion-touched', 'ion-invalid');
                } else {
                    input.classList.remove('ion-invalid');
                }
            });

            return isValid;
        };

        /**
         * @function attachBusinessRulesListeners
         * Aplica listeners locales para calcular dinámicamente campos computados en frontend
         * Basado en meta-declaraciones en APP_SCHEMAS (Config-Driven), sin hardcoding OCP.
         * @param {HTMLElement} container Formulario global
         * @param {String} entityName Entidad activa
         */
        global.UI_Validators.attachBusinessRulesListeners = function(container, entityName) {
            if (!entityName || !global.APP_SCHEMAS || !global.APP_SCHEMAS[entityName]) return;
            
            const rules = global.APP_SCHEMAS[entityName].businessRules || [];
            if (rules.length === 0) return;

            // --- REGLA: Procesador Dinámico de Reglas de Negocio en UI ---
            container.addEventListener('ionInput', (e) => {
                const target = e.target;
                if (!target.tagName || target.tagName.toLowerCase() !== 'ion-input' || !target.name) return;

                rules.forEach(rule => {
                    // Logic for Declarative Rule: "sumPrefix"
                    if (rule.trigger === 'onInput' && rule.action === 'sumPrefix') {
                        if (target.name.startsWith(rule.prefix)) {
                            const allInputs = container.querySelectorAll(`ion-input[name^="${rule.prefix}"]`);
                            let total = 0;
                            allInputs.forEach(input => {
                                const val = parseInt(input.value, 10);
                                if (!isNaN(val)) total += val;
                            });
                            
                            const targetInput = container.querySelector(`ion-input[name="${rule.target}"]`);
                            if (targetInput) {
                                targetInput.value = total;
                                // Disparar alerta visual de update (UX)
                                targetInput.style.transition = 'color 0.3s ease';
                                targetInput.style.color = 'var(--ion-color-secondary)';
                                setTimeout(() => targetInput.style.color = '', 300);
                            }
                        }
                    }
                });
            });
        };

    })(window);