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
                let _typeaheadNode = null;
                
                const _closeWorkspaceTypeahead = () => {
                    if (_typeaheadNode && _typeaheadNode.parentNode) {
                        _typeaheadNode.parentNode.removeChild(_typeaheadNode);
                    }
                    _typeaheadNode = null;
                };

                const _renderWorkspaceTypeahead = (triggerInput, dtos, formModal) => {
                    _closeWorkspaceTypeahead();
                    const rect = triggerInput.getBoundingClientRect();
                    
                    _typeaheadNode = document.createElement('ion-list');
                    _typeaheadNode.style.position = 'absolute';
                    _typeaheadNode.style.top = (rect.bottom + window.scrollY) + 'px';
                    _typeaheadNode.style.left = (rect.left + window.scrollX) + 'px';
                    _typeaheadNode.style.width = rect.width + 'px';
                    _typeaheadNode.style.maxHeight = '250px';
                    _typeaheadNode.style.overflowY = 'auto';
                    _typeaheadNode.style.zIndex = '99999';
                    _typeaheadNode.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                    _typeaheadNode.style.borderRadius = 'var(--rounded-md)';
                    
                    dtos.forEach(dto => {
                        const item = document.createElement('ion-item');
                        item.button = true;
                        
                        const avatar = document.createElement('ion-avatar');
                        avatar.slot = 'start';
                        if (dto.avatar) {
                            const img = document.createElement('img');
                            img.src = dto.avatar;
                            avatar.appendChild(img);
                        } else {
                            const fallback = document.createElement('div');
                            fallback.style.background = 'var(--ion-color-primary)';
                            fallback.style.color = 'white';
                            fallback.style.width = '100%';
                            fallback.style.height = '100%';
                            fallback.style.display = 'flex';
                            fallback.style.alignItems = 'center';
                            fallback.style.justifyContent = 'center';
                            fallback.style.fontSize = '1.2rem';
                            const inits = (dto.nombre.charAt(0) + dto.apellidos.charAt(0)).toUpperCase();
                            fallback.textContent = inits;
                            avatar.appendChild(fallback);
                        }
                        item.appendChild(avatar);
                        
                        const lbl = document.createElement('ion-label');
                        const h3 = document.createElement('h3');
                        h3.textContent = dto.nombre + " " + dto.apellidos;
                        const p = document.createElement('p');
                        p.textContent = dto.email + (dto.cargo ? ` • ${dto.cargo}` : '');
                        lbl.appendChild(h3);
                        lbl.appendChild(p);
                        item.appendChild(lbl);
                        
                        item.onmousedown = (e) => {
                            e.preventDefault();
                            // Hidratar todo el formulario con el DTO (idéntico a ionBlur)
                            const formStateObj = {};
                            const currentInputs = formModal.querySelectorAll('ion-input, ion-select, ion-textarea, input[type="hidden"]');
                            currentInputs.forEach(inp => formStateObj[inp.name] = inp.value);
                            
                            Object.keys(dto).forEach(key => {
                                const autoInput = formModal.querySelector(`ion-input[name="${key}"]`);
                                if (autoInput) {
                                    autoInput.value = dto[key];
                                    if (dto[key]) {
                                        autoInput.readonly = true;
                                        autoInput.setAttribute('readonly', 'true');
                                        autoInput.style.color = 'var(--ion-color-primary)';
                                    }
                                    autoInput.dispatchEvent(new CustomEvent('FormHydrated', { detail: dto[key] }));
                                }
                            });
                            triggerInput.dispatchEvent(new Event('ionChange'));
                            _closeWorkspaceTypeahead();
                        };
                        _typeaheadNode.appendChild(item);
                    });
                    document.body.appendChild(_typeaheadNode);
                };

                
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

                            // --- NUEVO: C.2) Workspace Typeahead (S37.4) ---
                            if (schemaField.triggers_workspace_resolve && eventType === 'ionInput') {
                                const term = formStateObj[fieldName] || "";
                                if (term.length >= 3) {
                                    if (window.DataAPI) {
                                        window.DataAPI.call('searchDirectoryByName', term)
                                            .then(dtos => {
                                                if (Array.isArray(dtos) && dtos.length > 0) {
                                                    _renderWorkspaceTypeahead(triggerInput, dtos, modal, fields);
                                                } else {
                                                    _closeWorkspaceTypeahead();
                                                }
                                            })
                                            .catch(err => {
                                                console.warn("[FormEngine] Workspace Typeahead API Error:", err);
                                                _closeWorkspaceTypeahead();
                                            });
                                    }
                                } else {
                                    _closeWorkspaceTypeahead();
                                }
                            }

                            // --- NUEVO: C) Smart API Lookup Full Profile (Workspace Resolve Blur) ---
                            if (schemaField.triggers_workspace_resolve && formStateObj[fieldName] && (eventType === 'ionChange' || eventType === 'ionBlur')) {
                                if (window.DataAPI) {
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

                                    window.DataAPI.call('resolverDirectorioWorkspace', formStateObj[fieldName])
                                        .then(dto => {
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
                                                // Hidratar Formulario (Reactive Defense)
                                                Object.keys(dto).forEach(key => {
                                                    const stdInput = modal.querySelector(`ion-input[name="${key}"], ion-textarea[name="${key}"], input[type="hidden"][name="${key}"]`);
                                                    const cmpInput = modal.querySelector(`[data-form-component="${key}"]`);
                                                    
                                                    const fetchedValue = dto[key];
                                                    
                                                    // H10 Mitigación: Primero intentar Inyección Reactiva p/WebComponents Complejos
                                                    if (cmpInput) {
                                                        if (typeof cmpInput.setValidatedValue === 'function') {
                                                            cmpInput.setValidatedValue(fetchedValue);
                                                        } else if (cmpInput.tagName.includes('-SEARCHABLE') || cmpInput.tagName.includes('-RELATION')) {
                                                            cmpInput.dataset.prefill = JSON.stringify([{ id_registro: fetchedValue }]);
                                                            window.Schema_Utils && window.Schema_Utils.triggerNativeInject(cmpInput);
                                                        }
                                                    } else if (stdInput) {
                                                        // Fallback a Primitivos Estándar
                                                        stdInput.value = fetchedValue;
                                                        
                                                        // Bloqueo Inteligente si el Backend resolvió el valor
                                                        if (fetchedValue !== undefined && fetchedValue !== null && String(fetchedValue).trim() !== '') {
                                                            stdInput.setAttribute('readonly', 'true');
                                                            stdInput.readonly = true;
                                                            stdInput.style.color = 'var(--ion-color-primary)';
                                                        } else {
                                                            stdInput.removeAttribute('readonly');
                                                            stdInput.readonly = false;
                                                            stdInput.style.color = '';
                                                        }
                                                        
                                                        // Despachar Burbujeo Nodal
                                                        stdInput.dispatchEvent(new CustomEvent('ionChange', { detail: { value: fetchedValue }, bubbles: true }));
                                                    }
                                                });
                                                
                                                // Trigger Collision Warning explícito después del barrido
                                                if (window.DataStore && window.DataStore.get) {
                                                    const entityKey = 'Persona';
                                                    const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityKey) : 'id_registro';
                                                    const localEditId = formStateObj[pkField];
                                                    const liveData = window.DataStore.get(entityKey) || [];
                                                    const testUniques = ['email', 'numero_empleado'];
                                                    let hitMsg = "";
                                                    
                                                    for (const uq of testUniques) {
                                                        if (dto[uq] !== undefined && dto[uq] !== null && String(dto[uq]).trim() !== '') {
                                                           const exist = liveData.find(r => r.estado !== 'Eliminado' && String(r[uq]).toLowerCase() === String(dto[uq]).toLowerCase());
                                                           if (exist && (!localEditId || String(exist[pkField]) !== String(localEditId))) {
                                                               hitMsg = `⚠️ Atención: Ya existe un registro vigente con ${uq} = ${dto[uq]}.`;
                                                               break;
                                                           }
                                                        }
                                                    }
                                                    if (hitMsg) window.PresentSafe && window.PresentSafe(Object.assign(document.createElement('ion-toast'), { message: hitMsg, duration: 5000, color: 'warning' }));
                                                }
                                            }
                                        })
                                        .catch(err => {
                                            clearTimeout(loadingTimeout);
                                            if (loadingPresented) loadingUI.dismiss();
                                            else document.body.removeChild(loadingUI);
                                            console.warn("Error en Workspace Resolve (DataAPI):", err);
                                        });
                                } else {
                                    console.log("[Dev Mode] FormEngine Mock Call - Missing DataAPI abstraction for:", formStateObj[fieldName]);
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