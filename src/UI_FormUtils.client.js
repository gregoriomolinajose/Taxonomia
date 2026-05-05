/**
 * UI_FormUtils.html (S14.1)
 *
 * Colección de Helper puros sin side-effects en el DOM general,
 * desprendida del histórico FormEngine para cumplir Single Responsibility.
 */

/* ── Formatters Universales ────────────────────────────── */
window.formatLabelString = function(str) {
  return (str || '').replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); });
};
window.formatEntityName = window.formatLabelString;
window.formatUserName = function(emailStr) {
  if (!emailStr) return 'Usuario';
  var local = emailStr.split('@')[0];
  var first = local.split(/[\._-]/)[0];
  if (!first) return 'Usuario';
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
};

window.UI_FormUtils = (function () {

    /**
     * Resolutor de opciones genérico para Dominios completos
     * (Requerido por M:N Subgrid en N-Dimensional Graph)
     */
    function getDominioOptions(formCurrentState) {
        const cache = (window.DataStore && window.DataStore.get('Dominio')) ? window.DataStore.get('Dominio') : [];
        const active = cache.filter(r => r.estado !== 'Eliminado');
        return active.map(p => ({
            value: p.id_dominio || p.id_registro,
            label: `[Nivel ${p.nivel_tipo}] ${p.nombre_ingles || p.n0_es || p.nombre || p.id_registro}`
        }));
    }

    /**
     * Resolutor de opciones (Limitado) para "Dominio Padre"
     */
    function getDominiosPadreOptions(formCurrentState) {
        if (!formCurrentState) {
            const activeForm = document.querySelector('ion-modal');
            if (activeForm) {
                const inputs = activeForm.querySelectorAll('ion-input, ion-select');
                formCurrentState = Array.from(inputs).map(inp => ({ name: inp.name, value: inp.value }));
            } else {
                formCurrentState = [];
            }
        }

        const nivelObj = formCurrentState.find(c => c.name === 'nivel_tipo');
        if (!nivelObj || !nivelObj.value) return [];
        
        const currentNivel = parseInt(nivelObj.value, 10);
        if (isNaN(currentNivel) || currentNivel <= 0) return []; // Strict N>0
        
        const cache = (window.DataStore && window.DataStore.get('Dominio')) ? window.DataStore.get('Dominio') : [];
        const validParents = cache.filter(r => parseInt(r.nivel_tipo, 10) === currentNivel - 1 && r.estado !== 'Eliminado');
        
        return validParents.map(p => ({
            value: p.id_dominio || p.id_registro,
            label: `[Nivel ${p.nivel_tipo}] ${p.nombre_ingles || p.n0_es || p.nombre || p.id_registro}`
        }));
    }

    /**
     * Normaliza un ID de registro: trim + uppercase.
     */
    function normalizeId(id) {
        return String(id || '').trim().toUpperCase();
    }

    /**
     * Función pura: devuelve true si recordId ya está en la lista vinculada.
     */
    function isRecordLinked(recordId, linkedRecords, pkField) {
        const normalizedCandidate = normalizeId(recordId);
        return (linkedRecords || []).some(r => normalizeId(r[pkField]) === normalizedCandidate);
    }

    /**
     * Bloqueo visual para ABAC = false. Inyecta el Banner y desactiva inputs interactivos.
     */
    function applyReadOnlyLock(container, inputsSelector, customInputsSelector, overrideBtns) {
        const cardNode = container.querySelector('ion-card');
        if (cardNode) {
            const banner = document.createElement('div');
            banner.style.backgroundColor = 'var(--ion-color-light, #f4f5f8)';
            banner.style.color = 'var(--ion-color-medium, #5a5a5a)';
            banner.style.padding = '12px 16px';
            banner.style.borderBottom = '1px solid #dcdcdc';
            banner.style.borderTopLeftRadius = 'var(--rounded-md)';
            banner.style.borderTopRightRadius = 'var(--rounded-md)';
            banner.style.fontSize = '0.9rem';
            
            const icon = document.createElement('ion-icon');
            icon.setAttribute('name', 'lock-closed');
            icon.style.fontSize = '1.2em';
            icon.style.verticalAlign = 'middle';
            
            const span = document.createElement('span');
            span.style.verticalAlign = 'middle';
            span.style.marginLeft = '8px';
            
            const strong = document.createElement('strong');
            strong.appendChild(document.createTextNode('Modo de Solo Lectura. '));
            
            span.appendChild(strong);
            span.appendChild(document.createTextNode('Contacta al Administrador para solicitar accesos de edición sobre este nodo.'));
            
            banner.appendChild(icon);
            banner.appendChild(span);
            
            cardNode.insertBefore(banner, cardNode.firstChild);
        }
        
        // Inutilizar inputs de manera segura
        const inputs = container.querySelectorAll(inputsSelector || 'ion-input, ion-textarea, ion-select');
        inputs.forEach(input => {
            const tag = input.tagName.toLowerCase();
            if (tag === 'ion-input' || tag === 'ion-textarea' || tag === 'ion-select') {
                input.setAttribute('readonly', 'true');
                input.setAttribute('disabled', 'true');
                input.style.pointerEvents = 'none';
                input.style.opacity = '0.8'; 
            }
        });
        
        // Mute de elementos custom (Evitando bloquear el botón de cerrar drawer explícitamente)
        const customInputs = container.querySelectorAll(customInputsSelector || '.dv-chip, ion-button[fill="clear"]:not(.btn-close-drawer)');
        customInputs.forEach(i => {
            i.style.pointerEvents = 'none';
            i.style.opacity = '0.6';
        });
        
        // Apagar rigurosamente los botones de Guardado principal
        if (overrideBtns) {
            const btns = container.querySelectorAll('ion-button');
            btns.forEach(btn => {
                if (btn.textContent.includes('Guardar') || btn.querySelector('ion-icon[name="save-outline"]')) {
                    btn.setAttribute('disabled', 'true');
                    btn.style.display = 'none'; // S49.13: Ocultamiento estricto Zero-Trust visual
                    btn.title = "No tienes permisos de edición en este nodo";
                }
            });
        }
    }

    /**
     * [S35.4] filterByTopology — Función pura de filtrado jerárquico.
     *
     * Centraliza la lógica de filtrado de datasets relacionales según las reglas
     * topológicas del schema (strictLevelJumps, levelFiltering, rootRequiresNoParent).
     * Elimina la duplicación H9 entre RelationBuilder.buildRelation y el listener reloadDataset.
     *
     * @param {Array}  dataset      Dataset activo de la entidad objetivo.
     * @param {Object} rules        topologyRules del schema de la entidad padre.
     * @param {number} currentLevel nivel_tipo del registro en edición.
     * @param {string} relationType 'padre' | 'hijo' | 'relacionado'.
     * @returns {Array} Dataset filtrado listo para renderizar.
     */
    function filterByTopology(dataset, rules, currentLevel, relationType) {
        if (!rules || !Array.isArray(dataset)) return dataset || [];

        let filtered = dataset;
        // QR-2: parseInt() explícito para evitar truthiness traps (Number(true)===1, Number(null)===0).
        // QR-1: El guard de rootRequiresNoParent va PRIMERO intencionalmente — su early-return evita
        //        ejecutar levelFiltering innecesariamente en nivel 1. Si se añaden reglas nuevas para
        //        nivel 1, deben ir ANTES de este bloque o se quedarán sombradas.
        const level = parseInt(currentLevel, 10);

        // Regla: Nodo raíz (nivel 1) no puede tener padre.
        if (rules.rootRequiresNoParent === true && level === 1 && relationType === 'padre') {
            return [];
        }

        // Regla: Filtrado estricto por nivel (solo padres del nivel inmediatamente superior).
        if (rules.levelFiltering === true && rules.strictLevelJumps === true && relationType === 'padre') {
            filtered = dataset.filter(d => parseInt(d.nivel_tipo, 10) === level - 1);
        }

        return filtered;
    }

    /**
     * @function validateRequiredFields
     * Valida de manera superficial y rápida (JIT) todos los inputs requeridos 
     * dentro del contenedor especificado. Ideal para Steppers.
     */
    function validateRequiredFields(currentContainer) {
        const inputs = currentContainer.querySelectorAll('ion-input, ion-select');
        let isValid = true;

        inputs.forEach(input => {
            let fieldIsValid = true;
            const reqAttr = input.getAttribute('required');
            const valAttr = input.getAttribute('data-validators');
            
            if (reqAttr === 'true' && (input.value === undefined || input.value === null || input.value === '')) {
                fieldIsValid = false;
            }
            
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
    }

    /**
     * @function attachBusinessRulesListeners
     * Aplica listeners locales para calcular dinámicamente campos computados en frontend
     * Basado en meta-declaraciones en APP_SCHEMAS (Config-Driven), sin hardcoding OCP.
     */
    function attachBusinessRulesListeners(container, entityName) {
        if (!entityName || !window.APP_SCHEMAS || !window.APP_SCHEMAS[entityName]) return;
        
        const rules = window.APP_SCHEMAS[entityName].businessRules || [];
        if (rules.length === 0) return;

        container.addEventListener('ionInput', (e) => {
            const target = e.target;
            if (!target.tagName || target.tagName.toLowerCase() !== 'ion-input' || !target.name) return;

            rules.forEach(rule => {
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
                            targetInput.style.transition = 'color 0.3s ease';
                            targetInput.style.color = 'var(--ion-color-secondary)';
                            setTimeout(() => targetInput.style.color = '', 300);
                        }
                    }
                }
            });
        });
    }

    /**
     * [S44.12] executeAsyncValidations
     * Función pura para ejecutar pre-requisitos de validación en paralelo (KISS/YAGNI)
     * Reemplaza la necesidad de un árbol de dependencias dinámico.
     */
    async function executeAsyncValidations(schema, formData) {
        if (!schema || !schema.preRequisites || !Array.isArray(schema.preRequisites)) {
            return true;
        }

        const promises = schema.preRequisites.map(async (reqName) => {
            const validatorFn = window[reqName] || (window.UI_FormUtils && window.UI_FormUtils[reqName]);
            if (typeof validatorFn === 'function') {
                return await validatorFn(formData);
            }
            console.warn(`[Validators] Pre-requisito no encontrado: ${reqName}`);
            return true; 
        });

        await Promise.all(promises);
        return true;
    }

    return {
        getDominioOptions,
        getDominiosPadreOptions,
        normalizeId,
        isRecordLinked,
        applyReadOnlyLock,
        filterByTopology,
        validateRequiredFields,
        attachBusinessRulesListeners,
        executeAsyncValidations
    };
})();