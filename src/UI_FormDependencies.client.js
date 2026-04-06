/**
     * UI_FormDependencies.html
     *
     * Maneja las dependencias visuales e lógicas impulsadas por metadatos
     * (Zero-Touch UI). Enruta los eventos 'ionChange' e 'ionInput' de campos
     * que detonan actualizaciones calculadas ('calculatedValue') o 
     * fuentes foráneas en cascada ('lookupSource').
     */
    (function(global) {
        
        const DependencyEngine = {
            /**
             * Conecta auditores a un contenedor de formulario y ejecuta una acción ante alteraciones.
             * Utiliza debouncing a nivel micro para proteger el EventLoop de Ionic.
             */
            attachListeners: function(modal, fields) {
                let debounceTimer; // S4.3: Debounce logic
                
                ['ionChange', 'ionInput', 'ionBlur'].forEach(eventType => {
                    modal.addEventListener(eventType, (e) => {
                        const triggerInput = e.target;
                        const fieldName = triggerInput.name;
                        if (!fieldName || !fields) return;

                        const schemaField = fields.find(f => f.name === fieldName);
                        
                        clearTimeout(debounceTimer);
                        
                        debounceTimer = setTimeout(async () => {
                            // 1. Recopilar formStateObj JIT Puro
                            const currentInputs = modal.querySelectorAll('ion-input, ion-select, ion-textarea, input[type="hidden"]');
                            const formStateObj = Array.from(currentInputs).reduce((acc, inp) => {
                                acc[inp.name] = inp.value;
                                return acc;
                            }, {});
                            const formCurrentStateArr = Object.keys(formStateObj).map(k => ({name: k, value: formStateObj[k]}));

                            // --- NUEVO: Evaluación Global de Visibilidad Condicional (showIf) ---
                            // Evaluamos todos los campos del form que tengan dependencies.showIf
                            fields.forEach(f => {
                                if (f.dependencies && f.dependencies.showIf) {
                                    const conditionInfo = f.dependencies.showIf;
                                    const colWrapper = modal.querySelector(`[name="${f.name}"]`)?.closest('ion-col');
                                    if (colWrapper) {
                                        if (formStateObj[conditionInfo.field] === conditionInfo.value) {
                                            colWrapper.style.display = ''; // Show
                                        } else {
                                            colWrapper.style.display = 'none'; // Hide
                                        }
                                    }
                                }
                            });

                            if (!schemaField) return;

                            // --- NUEVO: C) Smart API Lookup (Workspace Resolve) ---
                            if (schemaField.triggers_workspace_resolve && formStateObj[fieldName] && (eventType === 'ionChange' || eventType === 'ionBlur')) {
                                if (window.google && window.google.script && window.google.script.run) {
                                    // Bloquear modal temporalmente con retraso p/evitar flash (UX)
                                    const loadingUI = document.createElement('ion-loading');
                                    loadingUI.message = 'Buscando en Directorio Corporativo...';
                                    loadingUI.duration = 5000;
                                    document.body.appendChild(loadingUI);
                                    
                                    let loadingPresented = false;
                                    const loadingTimeout = setTimeout(async () => {
                                        loadingPresented = true;
                                        await loadingUI.present();
                                    }, 250);

                                    window.google.script.run
                                        .withSuccessHandler((dto) => {
                                            clearTimeout(loadingTimeout);
                                            if (loadingPresented) loadingUI.dismiss();
                                            else document.body.removeChild(loadingUI);
                                            
                                            if (dto && dto.__status === "DISABLED") {
                                                console.log("[FormEngine] Workspace Lookup is disabled via ENV_CONFIG");
                                                return; // Permitir al usuario avanzar manualmente
                                            }
                                            if (dto && dto.__status === "ERROR") {
                                                console.warn("[FormEngine] Workspace API Error:", dto.message);
                                                window.PresentSafe && window.PresentSafe(Object.assign(document.createElement('ion-toast'), { message: 'Workspace Error: ' + dto.message, duration: 4000, color: 'warning' }));
                                                return;
                                            }
                                            
                                            if (dto) {
                                                // Hidratar Formulario (Read-Only)
                                                Object.keys(dto).forEach(key => {
                                                    const autoInput = modal.querySelector(`ion-input[name="${key}"]`);
                                                    if (autoInput) {
                                                        autoInput.value = dto[key];
                                                        autoInput.setAttribute('readonly', 'true'); // Block imported inputs
                                                        autoInput.readonly = true;
                                                        // Visual cue
                                                        autoInput.style.color = 'var(--ion-color-primary)';
                                                    }
                                                });
                                            }
                                        })
                                        .withFailureHandler((err) => {
                                            clearTimeout(loadingTimeout);
                                            if (loadingPresented) loadingUI.dismiss();
                                            else document.body.removeChild(loadingUI);
                                            console.warn("Error en Workspace Resolve:", err);
                                        })
                                        .resolverDirectorioWorkspace(formStateObj[fieldName]);
                                } else {
                                    console.log("[Dev Mode] Simulating Workspace Resolve for:", formStateObj[fieldName]);
                                }
                            }

                            // 2. Procesar cada nodo objetivo (dependiente)
                            if (Array.isArray(schemaField.triggers_refresh_of)) {
                                for (const targetName of schemaField.triggers_refresh_of) {
                                    const targetSchema = fields.find(f => f.name === targetName);
                                    if (!targetSchema) continue;

                                    // A) Dropdown anidado (LookupSource Cascading)
                                    if (targetSchema.lookupSource) {
                                        const targetComponent = modal.querySelector(`ion-select[name="${targetName}"]`);
                                        if (!targetComponent || eventType === 'ionInput') continue; // Lookup reacts only to ionChange

                                        targetComponent.disabled = true;
                                        targetComponent.innerHTML = '';
                                        targetComponent.value = null;

                                        const resolver = window[targetSchema.lookupSource] || global[targetSchema.lookupSource];
                                        if (typeof resolver === 'function') {
                                            const newOptions = await resolver(formCurrentStateArr);
                                            
                                            // Render Options
                                            if (newOptions && Array.isArray(newOptions)) {
                                                newOptions.forEach(opt => {
                                                    const ionOpt = document.createElement('ion-select-option');
                                                    ionOpt.value = opt.value;
                                                    ionOpt.textContent = opt.label;
                                                    targetComponent.appendChild(ionOpt);
                                                });
                                                if (newOptions.length > 0) targetComponent.disabled = false;
                                            }
                                        }
                                    }

                                    // B) Formulismo Reactivo Matemática (calculatedValue)
                                    if (targetSchema.calculatedValue) {
                                        const calculator = window[targetSchema.calculatedValue] || global[targetSchema.calculatedValue];
                                        if (typeof calculator === 'function') {
                                            const newVal = calculator(formStateObj, targetSchema.calcParams || {});
                                            const targetInput = modal.querySelector(`ion-input[name="${targetName}"], ion-textarea[name="${targetName}"]`);
                                            if (targetInput) targetInput.value = newVal;
                                        }
                                    }
                                }
                            }
                        }, 300); // 300ms de espera asíncrona
                    });
                });
            }
        };

        global.UI_FormDependencies = DependencyEngine;

    })(typeof window !== 'undefined' ? window : this);