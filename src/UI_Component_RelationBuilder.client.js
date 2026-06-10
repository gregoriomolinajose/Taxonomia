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

        // State-Driven Controller (S57.4)
        class RelationStateController {
            constructor(selectEl, activeData, field, emptyOptNode, localBus, isActuallyReadonly = false) {
                this.selectEl = selectEl;
                this.activeData = activeData;
                this.field = field;
                this.emptyOptNode = emptyOptNode;
                this.isActuallyReadonly = isActuallyReadonly;
                this.localBus = localBus;
                
                if (this.localBus) {
                    // Soporta el evento genérico definido por metadata
                    this.localBus.subscribe('TAXONOMY_LEVEL_CHANGED', this.handleLevelChange.bind(this));
                }
            }

            handleLevelChange(ev) {
                const newLevel = ev.detail.newLevel;
                const rulesContext = ev.detail.rules;
                
                const uiState = window.SubgridState ? 
                    window.SubgridState.evaluateFieldState(rulesContext, newLevel, this.field.relationType) : 
                    { isDisabled: false, opacity: '1', placeholder: '— Sin asignar —' };
                
                let freshFiltered = this.activeData;
                if (rulesContext) {
                    freshFiltered = window.UI_FormUtils.filterByTopology(this.activeData, rulesContext, newLevel, this.field.relationType);
                }
                
                this.setState(uiState, freshFiltered);
            }
            
            setState(uiState, freshFiltered) {
                const finalDisabledState = uiState.isDisabled || this.isActuallyReadonly;
                this.selectEl.disabled = finalDisabledState;
                this.selectEl.style.opacity = uiState.opacity;
                this.emptyOptNode.textContent = uiState.placeholder;
                
                if (this.selectEl.tagName.toLowerCase() === 'tx-searchable') {
                    this.selectEl.dataSource = freshFiltered || [];
                    if (uiState.placeholder) this.selectEl.setAttribute('placeholder', uiState.placeholder);
                    if (finalDisabledState) this.selectEl.setAttribute('disabled', 'true');
                    else this.selectEl.removeAttribute('disabled');
                } else {
                    const oldVal = this.selectEl.value;
                    this.selectEl.innerHTML = '';
                    this.selectEl.appendChild(this.emptyOptNode);
                    populateSelectOptions(this.selectEl, freshFiltered, this.field);
                    if (oldVal) {
                        const stillExists = freshFiltered.some(d => String(typeof d[this.field.valueField] !== 'undefined' ? d[this.field.valueField] : d.id_registro) === String(oldVal));
                        if (stillExists) this.selectEl.value = oldVal;
                    }
                }
            }
        }

        // --- Constructor Builder ---
        function buildRelation(field, entityName, data, localEventBus, currentEditId) {
            const inputEl = document.createElement('div');
            inputEl.setAttribute('data-relation-type', field.relationType || 'relacionado');
            inputEl.style.width = '100%';
            inputEl.style.marginBottom = 'var(--spacing-2)';
            
            const schema = window.APP_SCHEMAS ? window.APP_SCHEMAS[entityName] : null;
            const pkKey = schema && schema.primaryKey ? schema.primaryKey : (data ? Object.keys(data).find(k => k.startsWith('id_') && k !== 'id_registro') : null);
            const currentPK = data ? (data[pkKey] || data.id_registro) : null;
            
            // [S50.3] Extraer contexto de borrador para inyectar en UI Components
            const explicitContext = (window.currentFormDrawer && window.currentFormDrawer.dataset && window.currentFormDrawer.dataset.taxonomiaContext) ? window.currentFormDrawer.dataset.taxonomiaContext : null;
            const fallbackContext = window.UI_FormUtils ? window.UI_FormUtils.extractDraftContext(entityName, currentPK) : null;
            const contextId = explicitContext || fallbackContext;
            const strictContext = !!explicitContext || entityName === 'Taxonomia';
            const isActuallyReadonly = !!((field.readonly && !strictContext) || (field.readonlyInContext && strictContext));
            
            // [S55.1] Contextual List Wrapper
            const activeData = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData 
                ? window.UI_FormUtils.fetchContextualData(field.targetEntity, contextId)
                : (window.DataStore ? window.DataStore.get(field.targetEntity) || [] : []).filter(d => d.estado !== 'Eliminado' && typeof d === 'object');
            
            let initialValues = [];

            if (field.isTemporalGraph && field.graphEntity && window.DataStore && window.DataStore.get(field.graphEntity)) {
                if (currentPK) {
                    const aristas = window.DataStore.get(field.graphEntity).filter(e => e.es_version_actual !== false);
                    const edgeName = (field.graphEdgeType || field.name).toUpperCase();
                    if (field.workspaceMode) {
                        initialValues = aristas.filter(e => 
                            window.UI_FormUtils.normalizeId(e.contexto_id) === window.UI_FormUtils.normalizeId(currentPK) && 
                            (!field.fixedParentId || window.UI_FormUtils.normalizeId(e.id_nodo_padre) === window.UI_FormUtils.normalizeId(field.fixedParentId)) &&
                            String(e.tipo_relacion).toUpperCase() === edgeName
                        ).map(e => window.UI_FormUtils.normalizeId(field.relationType === 'padre' ? e.id_nodo_padre : e.id_nodo_hijo));
                    } else if (window.Graph_Utils && window.Graph_Utils.resolveAllLinkedIds) {
                        // S54.5 Fix Contextual Graph Leak: Enforce state-aware graph index to respect 'Borrador' boundaries
                        initialValues = window.Graph_Utils.resolveAllLinkedIds(currentPK, edgeName, contextId, strictContext, field.relationType);
                    } else if (field.relationType === 'padre') {
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
            const mockToken = (window.UI_CONSTANTS && window.UI_CONSTANTS.MOCK_FK_TOKEN) ? window.UI_CONSTANTS.MOCK_FK_TOKEN : '_NEW_PARENT_';
            if (data && data[field.name] === mockToken) {
                initialValues = [mockToken];
            }

            if (field.disallowedContextEdges && window.UI_FormUtils && window.UI_FormUtils.getExcludedGraphNodes) {
                const excludedStr = field.disallowedContextEdges.join(',');
                // formContainer is not passed here, but contextId / currentPK provides DB-level exclusions
                const targetContextId = currentPK || contextId;
                const excludeIds = window.UI_FormUtils.getExcludedGraphNodes(excludedStr, entityName, null, targetContextId);
                if (excludeIds && excludeIds.length > 0) {
                    initialValues = initialValues.filter(v => !excludeIds.includes(String(window.UI_FormUtils.normalizeId(v))));
                }
            }

            if (field.uiComponent === 'searchable_multi') {
                if (global.UI_Factory.buildSearchableMulti) {
                    const metadataToken = (window.APP_SCHEMAS && window.APP_SCHEMAS[field.targetEntity] && window.APP_SCHEMAS[field.targetEntity].metadata) || {};
                    const componentConfig = { iconName: metadataToken.iconName, color: metadataToken.color, contextId: contextId, readonly: isActuallyReadonly };
                    const multiNodes = global.UI_Factory.buildSearchableMulti(field, activeData, initialValues, localEventBus, componentConfig);

                    // S41.14 Bind Create Action
                    multiNodes.addEventListener('txSearchableCreate', (e) => {
                        const targetE = e.detail.targetEntity;
                        if (typeof window.renderForm === 'function') {
                            window.renderForm(targetE);
                        }
                    });
                    
                    const rawLiveData = window.DataStore ? window.DataStore.get(field.targetEntity) : null;
                    if (rawLiveData === null || rawLiveData === undefined) {
                        multiNodes.setAttribute('is-loading', 'true');
                    }
                    if (isActuallyReadonly) {
                        multiNodes.setAttribute('disabled', 'true');
                    }

                    if (window.AppEventBus) {
                        const reloadDatasetMulti = (ev) => {
                            // Limpieza activa de ram interactiva
                            if (!document.body.contains(multiNodes)) {
                                window.AppEventBus.unsubscribe('FormEngine::RecordHydrated', reloadDatasetMulti);
                                window.AppEventBus.unsubscribe('DATASTORE::CHANGED', reloadDatasetMulti);
                                window.AppEventBus.unsubscribe('CACHE::GRAPH_HYDRATED', reloadDatasetMulti);
                                return;
                            }

                            // Optimización: Solo repinta si el cambio en DataStore afecta a la Entidad Objetivo
                            if (ev && ev.entityName && ev.entityName !== field.targetEntity) return;

                            const freshRaw = window.DataStore ? window.DataStore.get(field.targetEntity) : null;
                            const isSyncing = freshRaw === null || freshRaw === undefined;
                            
                            if (isSyncing) multiNodes.setAttribute('is-loading', 'true');
                            else multiNodes.removeAttribute('is-loading');

                            const freshLiveData = freshRaw || [];
                            const freshActiveData = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData 
                                ? window.UI_FormUtils.fetchContextualData(field.targetEntity, contextId)
                                : freshLiveData.filter(d => d.estado !== 'Eliminado' && typeof d === 'object');
                            
                            if (multiNodes && multiNodes.tagName.toLowerCase() === 'tx-searchable') {
                                multiNodes.dataSource = freshActiveData || [];
                                if (isActuallyReadonly) multiNodes.setAttribute('disabled', 'true');
                                else multiNodes.removeAttribute('disabled');
                            }
                        };
                        window.AppEventBus.subscribe('FormEngine::RecordHydrated', reloadDatasetMulti);
                        window.AppEventBus.subscribe('DATASTORE::CHANGED', reloadDatasetMulti);
                        window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', reloadDatasetMulti);
                    }

                    inputEl.appendChild(multiNodes);
                } else {
                    console.warn('[UI_Component_RelationBuilder] Falta UI_Component_SearchableMulti.html en el Index.');
                }
            } else if (field.uiComponent === 'select_single' || field.uiComponent === 'searchable_single') {
                let filteredActiveData = activeData;
                const rules = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName] ? window.APP_SCHEMAS[entityName].topologyRules : null;
                const cLevel = Number(data ? (data.nivel_tipo || 1) : 1);
                let uiStateInit = { isDisabled: false, opacity: '1', placeholder: '— Sin asignar —' };

                if (rules) {
                    uiStateInit = window.SubgridState ?
                        window.SubgridState.evaluateFieldState(rules, cLevel, field.relationType) : uiStateInit;
                    // [S35.4] Filtrado centralizado vía UI_FormUtils.filterByTopology (elimina H9)
                    filteredActiveData = window.UI_FormUtils.filterByTopology(activeData, rules, cLevel, field.relationType);
                }

                // [S29.8] Mock Option Injection para UX de Creación Anidada no se visualiza como 'Option' 
                // sino que el valor pasa como pre-seleccionado a SearchableSingle.
                const isVirtualParent = initialValues.length > 0 && initialValues[0] === mockToken;
                if (isVirtualParent) {
                    // Injecting mock to dataset manually for it to map correctly in render
                    filteredActiveData.push({ [field.valueField]: mockToken, [field.labelField]: 'Padre en Curso (Auto-Vinculado)', id_numero: 'TEMP' });
                }

                // S37.1 UI_Component_SearchableSingle reemplaza al framework nativo de ionic
                // Inversion de Control: Inyectamos componentConfig de Metadatos desde afuera en vez de que el Componente de búsqueda lo escanee por sí mismo
                const metadataToken = (window.APP_SCHEMAS && window.APP_SCHEMAS[field.targetEntity] && window.APP_SCHEMAS[field.targetEntity].metadata) || {};
                const componentConfig = { iconName: metadataToken.iconName, color: metadataToken.color, contextId: contextId, readonly: isActuallyReadonly };
                
                const basicSel = global.UI_Factory.buildSearchableSingle(field, filteredActiveData, initialValues, localEventBus, componentConfig);
                
                // S41.14 Bind Create Action
                basicSel.addEventListener('txSearchableCreate', (e) => {
                    const targetE = e.detail.targetEntity;
                    if (typeof window.renderForm === 'function') {
                        window.renderForm(targetE);
                    }
                });
                
                const rawLiveDataSingle = window.DataStore ? window.DataStore.get(field.targetEntity) : null;
                if (rawLiveDataSingle === null || rawLiveDataSingle === undefined) {
                    basicSel.setAttribute('is-loading', 'true');
                }
                
                if (field.isTemporalGraph) {
                    basicSel.setAttribute('data-skip-hydration', 'true');
                }
                
                if (uiStateInit.isDisabled || isActuallyReadonly) {
                    basicSel.setAttribute('disabled', 'true');
                }
                if (uiStateInit.placeholder) {
                    basicSel.setAttribute('placeholder', uiStateInit.placeholder);
                }
                basicSel.style.opacity = uiStateInit.opacity;

                // Controller Setup
                const emptyOpt = { textContent: uiStateInit.placeholder };
                new RelationStateController(basicSel, activeData, field, emptyOpt, localEventBus, isActuallyReadonly);

                // S57.X: Ignorar alerta de jerarquía si el target es una Persona o un Rol (no estructural)
                if (field.isTemporalGraph && field.relationType === 'padre' && field.targetEntity !== 'Persona' && field.targetEntity !== 'Rol') {
                    let originalVal = initialValues.length > 0 ? initialValues[0] : "";
                    basicSel.addEventListener('ionChange', async (ev) => {
                        const newVal = ev.detail.value;
                        
                        // S57.6: Ignorar eventos programáticos (evitando bloqueo en carga/hidratación)
                        if (!ev.detail || !ev.detail.isUserEvent) {
                            originalVal = newVal;
                            return;
                        }

                        const isNewContext = { currentEditId: currentEditId, data: data };
                        const isNewRecord = window.SubgridState ? window.SubgridState.isNewRecord(isNewContext) : (!currentEditId && (!data || !data.id_registro));
                        const mockToken = (window.UI_CONSTANTS && window.UI_CONSTANTS.MOCK_FK_TOKEN) ? window.UI_CONSTANTS.MOCK_FK_TOKEN : '_NEW_PARENT_';
                        
                        if (!isNewRecord && originalVal && originalVal !== "" && originalVal !== mockToken && newVal !== originalVal) {
                            const alert = document.createElement('ion-alert');
                            alert.header = 'Cambio de Jerarquía Detectado';
                            alert.message = 'Estás reasignando el nodo padre. Si guardas este cambio, toda la rama se trasladará a la nueva ubicación. ¿Estás seguro de continuar?';
                            alert.buttons = [
                                { text: 'Cancelar', role: 'cancel', handler: () => basicSel.value = originalVal },
                                { text: 'Sí, reubicar rama', handler: () => { originalVal = newVal; basicSel.dataset.optimisticLock = 'true'; setTimeout(()=> basicSel.dataset.optimisticLock = 'false', 6000); } }
                            ];
                            document.body.appendChild(alert);
                            await window.PresentSafe(alert);
                        } else if (!originalVal || originalVal === "" || originalVal === mockToken) {
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
                    const reloadDataset = (ev) => {
                        // Limpieza activa de ram interactiva (H10 Zombie Subscription Prevention)
                        if (!document.body.contains(basicSel)) {
                            window.AppEventBus.unsubscribe('FormEngine::RecordHydrated', reloadDataset);
                            window.AppEventBus.unsubscribe('DATASTORE::CHANGED', reloadDataset);
                            window.AppEventBus.unsubscribe('CACHE::GRAPH_HYDRATED', reloadDataset);
                            return;
                        }

                        // Optimización: Solo repinta si el cambio en DataStore afecta a la Entidad Objetivo (o si no hay scope declarado)
                        if (ev && ev.entityName && ev.entityName !== field.targetEntity) return;
                        if (basicSel.dataset.optimisticLock === 'true') return;

                        const freshLiveData = window.DataStore ? (window.DataStore.get(field.targetEntity) || []) : [];
                        const freshActiveData = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData 
                            ? window.UI_FormUtils.fetchContextualData(field.targetEntity, contextId)
                            : freshLiveData.filter(d => d.estado !== 'Eliminado' && typeof d === 'object');
                        
                        let freshFiltered = freshActiveData;
                        const cLvl = Number(data ? (data.nivel_tipo || 1) : 1);
                        if (rules) {
                            // [S35.4] Filtrado centralizado vía UI_FormUtils.filterByTopology (elimina H9)
                            freshFiltered = window.UI_FormUtils.filterByTopology(freshActiveData, rules, cLvl, field.relationType);
                        }

                        const isSyncingSingle = freshLiveData === null || freshLiveData === undefined || (window.DataStore && window.DataStore.get(field.targetEntity) === null);
                        if (isSyncingSingle) basicSel.setAttribute('is-loading', 'true');
                        else basicSel.removeAttribute('is-loading');

                        if (basicSel && basicSel.tagName.toLowerCase() === 'tx-searchable') {
                            // State-Driven Web Component Interaction (S57.4)
                            const uiStateInit = window.SubgridState ? 
                                window.SubgridState.evaluateFieldState(rules, cLvl, field.relationType) : 
                                { isDisabled: false, opacity: '1', placeholder: '— Sin asignar —' };
                            const finalDisabledState = uiStateInit.isDisabled || isActuallyReadonly;
                            basicSel.dataSource = freshFiltered || [];
                            if (uiStateInit.placeholder) basicSel.setAttribute('placeholder', uiStateInit.placeholder);
                            if (finalDisabledState) basicSel.setAttribute('disabled', 'true');
                            else basicSel.removeAttribute('disabled');
                        } else {
                            // Legacy ion-select rollback
                            const oldVal = basicSel.value || (initialValues.length > 0 ? initialValues[0] : null);
                            basicSel.innerHTML = '';
                            basicSel.appendChild(emptyOpt);
                            populateSelectOptions(basicSel, freshFiltered, field);
                            
                            if (oldVal) {
                                basicSel.value = oldVal;
                            }
                        }
                    };

                    window.AppEventBus.subscribe('FormEngine::RecordHydrated', reloadDataset);
                    window.AppEventBus.subscribe('DATASTORE::CHANGED', reloadDataset);
                    window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', reloadDataset);
                }
                
                // S57.5: Ocultar el componente del padre si el formulario está en modo lectura y el dominio no tiene un padre asignado (Nodo Raíz)
                if (isActuallyReadonly && initialValues.length === 0 && field.relationType === 'padre' && field.hideIfEmptyAndReadonly !== false) {
                    inputEl.style.display = 'none';
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