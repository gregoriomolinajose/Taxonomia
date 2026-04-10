/**
     * UI_Component_RelationBuilder.html
     * 
     * Constructor Atómico para Relaciones N-Dimensionales (Aristas M:N, Jerarquías Padre-Hijo).
     * Aisla la lógica de advertencias al modificar Grafos Temporales.
     * Plugin Architecture: Auto-Registra su constructor.
     */
    (function (global) {
        
        global.UI_Factory = global.UI_Factory || {};

        // --- Utils para Dropdowns Relacionales ---
        function populateSelectOptions(selectEl, dataArr, field) {
            if (!Array.isArray(dataArr)) return;
            
            dataArr.forEach(d => {
                const opt = document.createElement('ion-select-option');
                opt.value = typeof d[field.valueField] !== 'undefined' ? d[field.valueField] : d.id_registro;
                opt.textContent = `${opt.value} - ${typeof d[field.labelField] !== 'undefined' ? d[field.labelField] : d.nombre}`;
                selectEl.appendChild(opt);
            });
        }

        function bindLevelChangeRepaint(selectEl, activeData, field, emptyOptNode, localBus) {
            if (!Array.isArray(activeData)) return;

            if (localBus) {
                localBus.subscribe('TAXONOMY_LEVEL_CHANGED', (ev) => {
                    const newLevel = ev.detail.newLevel;
                    const rulesContext = ev.detail.rules;
                    
                    const uiState = window.SubgridState ? 
                        window.SubgridState.evaluateFieldState(rulesContext, newLevel, field.relationType) : 
                        { isDisabled: false, opacity: '1', placeholder: '— Sin asignar —' };
                    
                    selectEl.disabled = uiState.isDisabled;
                    selectEl.style.opacity = uiState.opacity;
                    emptyOptNode.textContent = uiState.placeholder;
                    
                    let freshFiltered = activeData;
                    
                    if (rulesContext) {
                        if (rulesContext.levelFiltering === true && rulesContext.strictLevelJumps === true && field.relationType === 'padre') {
                            freshFiltered = activeData.filter(d => Number(d.nivel_tipo) === newLevel - 1);
                        }
                        
                        if (rulesContext.rootRequiresNoParent === true && newLevel === 1 && field.relationType === 'padre') {
                            freshFiltered = []; 
                        }
                    }
                    
                    // REPAINT preservando el valor seleccionado
                    const oldVal = selectEl.value;
                    selectEl.innerHTML = '';
                    selectEl.appendChild(emptyOptNode);
                    
                    populateSelectOptions(selectEl, freshFiltered, field);
                    
                    // Restaurar el valor si sigue existiendo en el nuevo dataset
                    if (oldVal) {
                        const stillExists = freshFiltered.some(d => String(typeof d[field.valueField] !== 'undefined' ? d[field.valueField] : d.id_registro) === String(oldVal));
                        if (stillExists) selectEl.value = oldVal;
                    }
                });
            }
        }

        // --- Constructor Builder ---
        function buildRelation(field, entityName, data, localEventBus, currentEditId) {
            const inputEl = document.createElement('div');
            inputEl.setAttribute('data-relation-type', field.relationType || 'relacionado');
            inputEl.style.width = '100%';
            inputEl.style.marginBottom = 'var(--spacing-2)';
            
            const liveData = window.DataStore ? (window.DataStore.get(field.targetEntity) || []) : [];
            const activeData = liveData.filter(d => d.estado !== 'Eliminado' && typeof d === 'object');
            
            let initialValues = [];
            
            if (field.isTemporalGraph && field.graphEntity && window.DataStore && window.DataStore.get(field.graphEntity)) {
                const schema = window.APP_SCHEMAS ? window.APP_SCHEMAS[entityName] : null;
                // Leemos con precisión milimétrica la Llave Primaria desde la Arquitectura
                const pkKey = schema && schema.primaryKey ? schema.primaryKey : (data ? Object.keys(data).find(k => k.startsWith('id_') && k !== 'id_registro') : null);
                const currentPK = data ? (data[pkKey] || data.id_registro) : null;
                if (currentPK) {
                    const aristas = window.DataStore.get(field.graphEntity).filter(e => e.es_version_actual !== false);
                    const edgeName = (field.graphEdgeType || field.name).toUpperCase();
                    if (field.relationType === 'padre') {
                        initialValues = aristas.filter(e => window.UI_FormUtils.normalizeId(e.id_nodo_hijo) === window.UI_FormUtils.normalizeId(currentPK) && String(e.tipo_relacion).toUpperCase() === edgeName).map(e => window.UI_FormUtils.normalizeId(e.id_nodo_padre));
                    } else if (field.relationType === 'hijo') {
                        initialValues = aristas.filter(e => window.UI_FormUtils.normalizeId(e.id_nodo_padre) === window.UI_FormUtils.normalizeId(currentPK) && String(e.tipo_relacion).toUpperCase() === edgeName).map(e => window.UI_FormUtils.normalizeId(e.id_nodo_hijo));
                    }
                }
            } else if (data && data[field.name]) {
                try {
                    initialValues = Array.isArray(data[field.name]) ? data[field.name] : JSON.parse(data[field.name]);
                } catch(e) { initialValues = (typeof data[field.name] === 'string') ? [data[field.name]] : []; } // fallback
            }

            // [S29.8] Hard Override Topológico: Asegurar pre-hidratación si viene inyectado el Payload Mock
            if (data && data[field.name] === '_NEW_PARENT_') {
                initialValues = ['_NEW_PARENT_'];
            }

            if (field.uiComponent === 'searchable_multi') {
                if (global.UI_Factory.buildSearchableMulti) {
                    const multiNodes = global.UI_Factory.buildSearchableMulti(field, activeData, initialValues, localEventBus);
                    inputEl.appendChild(multiNodes);
                } else {
                    console.warn('[UI_Component_RelationBuilder] Falta UI_Component_SearchableMulti.html en el Index.');
                }
            } else if (field.uiComponent === 'select_single') {
                const basicSel = document.createElement('ion-select');
                basicSel.setAttribute('interface', window.innerWidth < 768 ? 'action-sheet' : 'popover');
                basicSel.setAttribute('name', field.name);
                basicSel.setAttribute('label', field.label);
                basicSel.setAttribute('label-placement', 'stacked');
                basicSel.setAttribute('fill', 'outline');
                if (field.isTemporalGraph) {
                    basicSel.setAttribute('data-skip-hydration', 'true');
                }
                basicSel.style.marginBottom = 'var(--spacing-3)';

                const emptyOpt = document.createElement('ion-select-option');
                emptyOpt.value = "";
                emptyOpt.textContent = "— Sin asignar —";
                basicSel.appendChild(emptyOpt);

                let filteredActiveData = activeData;
                const rules = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName] ? window.APP_SCHEMAS[entityName].topologyRules : null;
                const cLevel = Number(data ? (data.nivel_tipo || 1) : 1);

                if (rules) {
                    const uiStateInit = window.SubgridState ? 
                        window.SubgridState.evaluateFieldState(rules, cLevel, field.relationType) : 
                        { isDisabled: false, opacity: '1', placeholder: '— Sin asignar —' };
                    
                    if (uiStateInit.isDisabled) basicSel.setAttribute('disabled', 'true');
                    basicSel.style.opacity = uiStateInit.opacity;
                    emptyOpt.textContent = uiStateInit.placeholder;

                    if (rules.levelFiltering === true && rules.strictLevelJumps === true && field.relationType === 'padre') {
                        filteredActiveData = activeData.filter(d => Number(d.nivel_tipo) === cLevel - 1);
                    }
                    if (rules.rootRequiresNoParent === true && cLevel === 1 && field.relationType === 'padre') {
                        filteredActiveData = []; 
                    }
                }
                
                populateSelectOptions(basicSel, filteredActiveData, field);
                
                // [S29.8] Mock Option Injection para UX de Creación Anidada
                const isVirtualParent = initialValues.length > 0 && initialValues[0] === '_NEW_PARENT_';
                if (isVirtualParent) {
                    const virtualOpt = document.createElement('ion-select-option');
                    virtualOpt.value = '_NEW_PARENT_';
                    virtualOpt.textContent = 'Padre en Curso (Auto-Vinculado)';
                    basicSel.appendChild(virtualOpt);
                }
                
                // [Bugfix S-Tier] Asignar el valor DESPUÉS de poblar las opciones para que Ionic lo reconozca
                if (initialValues.length > 0) {
                    basicSel.value = initialValues[0];
                }
                
                bindLevelChangeRepaint(basicSel, activeData, field, emptyOpt, localEventBus);

                if (field.isTemporalGraph && field.relationType === 'padre') {
                    let originalVal = initialValues.length > 0 ? initialValues[0] : "";
                    basicSel.addEventListener('ionChange', async (ev) => {
                        const newVal = ev.detail.value;
                        const isNewContext = { currentEditId: currentEditId, data: data };
                        const isNewRecord = window.SubgridState ? window.SubgridState.isNewRecord(isNewContext) : (!currentEditId && (!data || !data.id_registro));
                        if (!isNewRecord && originalVal && originalVal !== "" && newVal !== originalVal) {
                            const alert = document.createElement('ion-alert');
                            alert.header = 'Cambio de Jerarquía Detectado';
                            alert.message = 'Estás reasignando el nodo padre. Si guardas este cambio, toda la rama se trasladará a la nueva ubicación. ¿Estás seguro de continuar?';
                            alert.buttons = [
                                { text: 'Cancelar', role: 'cancel', handler: () => basicSel.value = originalVal },
                                { text: 'Sí, reubicar rama', handler: () => { originalVal = newVal; basicSel.dataset.optimisticLock = 'true'; setTimeout(()=> basicSel.dataset.optimisticLock = 'false', 6000); } }
                            ];
                            document.body.appendChild(alert);
                            await window.PresentSafe(alert);
                        } else if (!originalVal || originalVal === "") {
                            originalVal = newVal;
                            basicSel.dataset.optimisticLock = 'true';
                            setTimeout(()=> basicSel.dataset.optimisticLock = 'false', 6000);
                        } else {
                            basicSel.dataset.optimisticLock = 'true';
                            setTimeout(()=> basicSel.dataset.optimisticLock = 'false', 6000);
                        }
                    });
                }

                // S27.1 Fix de Dependencia: Hidratación global retrasada de DataAPI.
                // Si __APP_CACHE__ llega tarde, las opciones vacías causan desaparición visual.
                if (window.AppEventBus) {
                    window.AppEventBus.subscribe('FormEngine::RecordHydrated', () => {
                        if (!document.body.contains(basicSel)) return;
                        if (basicSel.dataset.optimisticLock === 'true') return;

                        const freshLiveData = window.DataStore ? (window.DataStore.get(field.targetEntity) || []) : [];
                        const freshActiveData = freshLiveData.filter(d => d.estado !== 'Eliminado' && typeof d === 'object');
                        
                        let freshFiltered = freshActiveData;
                        const cLvl = Number(data ? (data.nivel_tipo || 1) : 1);
                        if (rules) {
                            if (rules.levelFiltering === true && rules.strictLevelJumps === true && field.relationType === 'padre') {
                                freshFiltered = freshActiveData.filter(d => Number(d.nivel_tipo) === cLvl - 1);
                            }
                            if (rules.rootRequiresNoParent === true && cLvl === 1 && field.relationType === 'padre') {
                                freshFiltered = []; 
                            }
                        }

                        const oldVal = basicSel.value || (initialValues.length > 0 ? initialValues[0] : null);
                        basicSel.innerHTML = '';
                        basicSel.appendChild(emptyOpt);
                        populateSelectOptions(basicSel, freshFiltered, field);
                        
                        if (oldVal) {
                            basicSel.value = oldVal;
                        }
                    });
                }
                inputEl.appendChild(basicSel);
            }
            return inputEl;
        }

        // AUTO-REGISTRATION
        if (typeof global.UI_Factory.registerBuilder === 'function') {
            global.UI_Factory.registerBuilder('relation', buildRelation);
        } else {
            console.warn('[UI_Component_RelationBuilder] Esperando a UI_Factory.registerBuilder para inicializarse, este script debió cargar luego de FormBuilder_Inputs.');
        }

    })(typeof window !== 'undefined' ? window : this);