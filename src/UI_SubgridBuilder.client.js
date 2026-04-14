/**
 * Factoría dedicada a la inyección y ciclo de vida de Subgrids M:N interactivos.
 * Extraída de FormRenderer_UI.html en la S13.1 (SRP & Clean Code).
 * S18.5 (Declarative): Migrado al paradigma PURE NODAL (cero innerHTML ni XSS persistente).
 */
window.UI_SubgridBuilder = {
    /**
     * Construye un Subgrid (Tabla anidada reactiva a un LocalEventBus o App Cache).
     * @param {Object} field - Configuración del campo proveniente de APP_SCHEMAS
     * @param {HTMLElement} container - Nodo DOM donde añadir el Subgrid (ion-col usualmente)
     * @param {Object} data - Mutación Data actual (Hydration Cache)
     * @param {String} entityName - Nombre de la tabla principal
     */
    build: async function(field, container, data, entityName, localEventBus, modalContext, config = {}) {
        const isReadonly = config.readonly === true || field.readonly === true;

        const subgridDiv = document.createElement('div');
        subgridDiv.style.border = '1px solid var(--ion-border-color)';
        subgridDiv.style.borderRadius = 'var(--rounded-sm)';
        subgridDiv.style.overflow = 'hidden';
        subgridDiv.style.marginBottom = 'var(--spacing-5)';
        subgridDiv.setAttribute('data-form-component', field.name);
        
        // S30.11 Nodal Protocol
        subgridDiv.getValidatedValue = () => Array.from(childRecords);

        // Header de la mini-tabla
        const header = document.createElement('div');
        header.style.background = 'var(--ion-color-light)';
        header.style.padding = 'var(--spacing-2) var(--spacing-4)';
        header.classList.remove('ion-hide');
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        
        const headerTitle = document.createElement('strong');
        headerTitle.style.color = 'var(--ion-color-dark)';
        headerTitle.textContent = field.label;
        header.appendChild(headerTitle);

        const addBtn = document.createElement('ion-button');
        addBtn.setAttribute('size', 'small');
        addBtn.setAttribute('fill', 'clear');
        addBtn.style.cssText += ' --color: var(--ion-color-primary); font-family: var(--sys-font-family, inherit) !important;';
        
        const addIcon = document.createElement('ion-icon');
        addIcon.setAttribute('slot', 'start');
        addIcon.setAttribute('name', 'add-outline');
        addBtn.appendChild(addIcon);
        addBtn.appendChild(document.createTextNode(' Agregar'));
        
        if (!isReadonly) {
            header.appendChild(addBtn);
        }
        
        subgridDiv.appendChild(header);

        // Body (Lista)
        const list = document.createElement('ion-list');
        list.setAttribute('lines', 'full');
        list.style.padding = 'var(--spacing-0)';
        subgridDiv.appendChild(list);

        const emptyState = document.createElement('div');
        emptyState.style.padding = 'var(--spacing-5)';
        emptyState.style.textAlign = 'center';
        
        const emptyIcon = document.createElement('ion-icon');
        emptyIcon.setAttribute('name', 'layers-outline');
        emptyIcon.setAttribute('color', 'medium');
        emptyIcon.style.fontSize = 'var(--sys-font-display)';
        emptyState.appendChild(emptyIcon);
        
        const emptyText = document.createElement('p');
        emptyText.style.color = 'var(--ion-color-medium)';
        emptyText.style.fontSize = '12px';
        emptyText.textContent = 'Sin registros vinculados';
        emptyState.appendChild(emptyText);

        // [S29.7] Estado local del subgrid purificado de Singletons. Usamos un nodo escondido JSON
        const childRecords = (data && Array.isArray(data[field.name])) ? [...data[field.name]] : [];
        
        const schema = window.APP_SCHEMAS ? window.APP_SCHEMAS[entityName] : null;
        const pkKey = schema && schema.primaryKey ? schema.primaryKey : (data ? Object.keys(data).find(k => k.startsWith('id_') && k !== 'id_registro') : null);
        const currentPK = data ? (data[pkKey] || data.id_registro) : null;
        
        // [S29.9] Zero-Latency Cache Cross-Reference (Agile Join)
        if (childRecords.length === 0 && field.isTemporalGraph && field.graphEntity && window.DataStore) {
            
            if (currentPK && window.UI_FormUtils) {
                const graphEdges = window.DataStore.get(field.graphEntity) || [];
                const targetTable = window.DataStore.get(field.targetEntity) || [];
                
                if (graphEdges.length > 0 && targetTable.length > 0) {
                    const edgeName = (field.graphEdgeType || field.name).toUpperCase();
                    let childIds = [];
                    if (field.relationType === 'hijo') {
                        childIds = graphEdges.filter(e => e.es_version_actual !== false && window.UI_FormUtils.normalizeId(e.id_nodo_padre) === window.UI_FormUtils.normalizeId(currentPK) && String(e.tipo_relacion).toUpperCase() === edgeName).map(e => window.UI_FormUtils.normalizeId(e.id_nodo_hijo));
                    } else if (field.relationType === 'padre') {
                        childIds = graphEdges.filter(e => e.es_version_actual !== false && window.UI_FormUtils.normalizeId(e.id_nodo_hijo) === window.UI_FormUtils.normalizeId(currentPK) && String(e.tipo_relacion).toUpperCase() === edgeName).map(e => window.UI_FormUtils.normalizeId(e.id_nodo_padre));
                    }
                    
                    if (childIds.length > 0) {
                        const schemaChild = window.APP_SCHEMAS ? window.APP_SCHEMAS[field.targetEntity] : null;
                        const childPkKey = schemaChild && schemaChild.primaryKey ? schemaChild.primaryKey : Object.keys(targetTable[0] || {}).find(k => k.startsWith('id_') && k !== 'id_registro');
                        
                        targetTable.forEach(row => {
                             const rawId = window.UI_FormUtils.normalizeId(row[childPkKey] || row.id_registro);
                             if (childIds.includes(rawId) && row.estado !== 'Eliminado') {
                                 childRecords.push(row);
                             }
                        });
                    }
                }
            }
        }
        
        const _refreshList = () => {
            window.DOM.clear(list);
            if (childRecords.length === 0) {
                list.appendChild(emptyState);
                return;
            }
            childRecords.forEach((record, idx) => {
                const item = document.createElement('ion-item');
                
                const labelWrapper = document.createElement('ion-label');
                const h2 = document.createElement('h2');
                // S29.9 Override: Priorizar labelField por sobre prop hardcodeada "nombre" (ej. evitar "Sin nombre")
                h2.textContent = (field.labelField && record[field.labelField]) ? record[field.labelField] : (record.nombre || 'Sin nombre');
                const p = document.createElement('p');
                let extraInfo = record.estado || 'Nuevo';
                if (record.rol_agil && record.rol_agil !== 'N/A') {
                    extraInfo = `${record.rol_agil} • ${extraInfo}`;
                }
                p.textContent = extraInfo;
                labelWrapper.appendChild(h2);
                labelWrapper.appendChild(p);
                item.appendChild(labelWrapper);
                
                const delBtn = document.createElement('ion-button');
                delBtn.setAttribute('slot', 'end');
                delBtn.setAttribute('fill', 'clear');
                delBtn.setAttribute('color', 'danger');
                
                const delIcon = document.createElement('ion-icon');
                delIcon.setAttribute('name', 'trash-outline');
                delBtn.appendChild(delIcon);
                
                delBtn.addEventListener('click', () => {
                    setOptimisticLock();
                    childRecords.splice(idx, 1);
                    _refreshList();
                });
                
                // S30.6 Drill-Down Click Navigation
                item.style.cursor = 'pointer';
                item.addEventListener('click', (e) => {
                    // Prevenir conflictos con el botón de Eliminar
                    if (e.target.closest('ion-button')) return;
                    
                    if (typeof window.openEditForm === 'function') {
                        // Navega ciegamente apuntando al TargetEntity, el openEditForm resolverá ABAC aisaldo y lo stackeará
                        const entityKey = field.targetEntity;
                        const pkField = window.Schema_Utils.getPrimaryKey(entityKey);
                        const recordId = record[pkField] || record.id_registro;
                        window.openEditForm(recordId, entityKey);
                    }
                });
                
                if (!isReadonly) {
                    item.appendChild(delBtn);
                }
                list.appendChild(item);
            });
        };

        // Initial hydration
        _refreshList();

        let isOptimisticLock = false;
        const setOptimisticLock = () => {
            isOptimisticLock = true;
            subgridDiv.style.opacity = '0.7';
            setTimeout(() => {
                isOptimisticLock = false;
                subgridDiv.style.opacity = '1';
            }, 6000); // 6 second protection window against DataAPI roundtrip stale-cache
        };

        if (window.AppEventBus) {
            const unsubscribe = window.AppEventBus.subscribe('FormEngine::RecordHydrated', (data) => {
                // Auto-cleanup memory leak if the subgrid is no longer in DOM
                if (!document.body.contains(subgridDiv)) {
                    unsubscribe();
                    return;
                }
                if (isOptimisticLock) {
                    console.warn(`[UI_SubgridBuilder] Mutex Activo: Ignorando Hidratación (EventBus) sobre '${field.name}' para evitar pérdida de relaciones temporales.`);
                    return; // Avoid overwriting with stale cache
                }
                const refreshedData = data;
                
                // [S34.6 UX Fix] Race Condition Mitigation: Validar que el payload pertenece al registro actual
                const refreshedPK = refreshedData ? (refreshedData[pkKey] || refreshedData.id_registro) : null;
                if (currentPK && refreshedPK && String(currentPK) !== String(refreshedPK)) {
                    console.warn(`[UI_SubgridBuilder] Ignoring stale hydration payload para ID: ${refreshedPK}. Esperado: ${currentPK}`);
                    return;
                }

                if (refreshedData && Array.isArray(refreshedData[field.name])) {
                    childRecords.length = 0;
                    refreshedData[field.name].forEach(item => childRecords.push(item));
                    _refreshList();
                }
            });

            // Deterministic Cleanup: Prevenir memory leaks vinculando al ciclo de vida del DOM
            if (modalContext) {
                modalContext.addEventListener('ionModalDidDismiss', () => {
                    unsubscribe();
                });
            }
        }

        addBtn.addEventListener('click', async () => {
            // Optimized UX: Select OR Create PURE NODAL MODAL
            const modal = document.createElement('ion-modal');
            const modalId = 'modal-' + field.name;
            modal.id = modalId;
            
            let lookupSource = field.options || (window._LOOKUP_DATA && window._LOOKUP_DATA[field.name]);
            
            // S34.6 UX Fix: Race Condition Mitigation for Async Hydration
            const isEmptyLookup = !lookupSource || (Array.isArray(lookupSource) && lookupSource.length === 0) || (lookupSource.data && lookupSource.data.rows && lookupSource.data.rows.length === 0);
            if (isEmptyLookup && window.FormEngine_Resolvers && window.FormEngine_Resolvers._cache) {
                let apiMethod = field.lookupSource || 'getInitialPayload';
                let apiArgs = field.lookupSource ? [] : [field.targetEntity];
                const cacheKey = apiMethod + '::' + JSON.stringify(apiArgs);
                
                const cached = window.FormEngine_Resolvers._cache[cacheKey];
                if (cached instanceof Promise) {
                    addBtn.disabled = true;
                    const prevText = addBtn.innerHTML;
                    addBtn.innerHTML = '<ion-spinner name="dots" style="height:20px;"></ion-spinner>';
                    try {
                        await cached;
                        lookupSource = field.options || (window._LOOKUP_DATA && window._LOOKUP_DATA[field.name]) || [];
                    } catch(e) {
                        console.warn('[UI_SubgridBuilder] Falló la hidratación retrasada', e);
                    }
                    addBtn.disabled = false;
                    addBtn.innerHTML = prevText;
                }
            }

            let normalizedOptions = Array.isArray(lookupSource) ? lookupSource : [];
            
            if (lookupSource && lookupSource.data && lookupSource.lookups) {
                 // If it came from getInitialPayload (Tuples)
                 const headers = lookupSource.data.headers;
                 const rows = lookupSource.data.rows.map(tuple => {
                     const obj = {};
                     headers.forEach((h, i) => obj[h] = tuple[i]);
                     return obj;
                 });
                 // Map to {value, label}
                 const pkField = Object.keys(rows[0] || {}).find(k => k.startsWith('id_'));
                 if (pkField) {
                     normalizedOptions = rows.map(r => ({ 
                         value: r[pkField], 
                         label: (r.lexical_id ? `[${r.lexical_id}] ` : '') + (r.nombre || r.nombre_producto || r.nombre_equipo || '') || r[pkField],
                         nivel_tipo: r.nivel_tipo,
                         hasActiveParent: r.hasActiveParent,
                         rol_agil: r.rol_agil
                     }));
                 }
            }

            // Determinar la PK real del hijo basada en la entidad destino
            if (!field.targetEntity) {
                console.error(`[UI_SubgridBuilder] Error Crítico: field.targetEntity indefinido en esquema de campo '${field.name}'`);
                window.showToast && window.showToast(`Error de esquema en Subgrid: Múltiples de ${field.label}`, 'danger');
                return;
            }
            let childPK = "id_registro";
            if (window.Schema_Utils && typeof window.Schema_Utils.getPrimaryKey === 'function') {
                childPK = window.Schema_Utils.getPrimaryKey(field.targetEntity);
            } else if (window.APP_SCHEMAS && window.APP_SCHEMAS[field.targetEntity] && window.APP_SCHEMAS[field.targetEntity].primaryKey) {
                childPK = window.APP_SCHEMAS[field.targetEntity].primaryKey;
            } else {
                const tableKey = field.targetEntity.toLowerCase();
                const singularKey = tableKey.endsWith('s') ? tableKey.slice(0, -1) : (tableKey.endsWith('es') ? tableKey.slice(0, -2) : tableKey);
                childPK = 'id_' + singularKey;
            }

            // Delegación a SubgridState PURE Engine (Inyectado Híbridamente)
            const rootDOMContext = modalContext || window.currentFormDrawer || document;
            const liveNivelInput = rootDOMContext.querySelector('ion-input[name="nivel_tipo"], ion-select[name="nivel_tipo"]');
            const val = liveNivelInput?.value;
            const liveLevel = (val !== undefined && val !== "") ? Number(val) : Number(data ? (data.nivel_tipo || 1) : 1);

            const rulesContext = {
                topologyRules: window.APP_SCHEMAS[entityName]?.topologyRules || null,
                currentLevel: liveLevel,
                relationType: field.relationType
            };
            
            let availableOptions = window.SubgridState.filterAvailableOptions(normalizedOptions, childRecords, childPK, rulesContext);
            if (field.allowedRoles && Array.isArray(field.allowedRoles)) {
                availableOptions = availableOptions.filter(opt => field.allowedRoles.includes(opt.rol_agil));
            }

            console.log(`[FormEngine] Sincronizando modal para ${field.targetEntity}. IDs vinculados: ${childRecords.length}. Disponibles: ${availableOptions.length}`);

            // NODAL MODAL ASSEMBLY
            const mHeader = document.createElement('ion-header');
            const mToolbar = document.createElement('ion-toolbar');
            mToolbar.setAttribute('color', 'primary');
            
            const mTitle = document.createElement('ion-title');
            mTitle.textContent = `Seleccionar ${field.label}`;
            mToolbar.appendChild(mTitle);
            
            const mButtons = document.createElement('ion-buttons');
            mButtons.setAttribute('slot', 'end');
            
            const btnClose = document.createElement('ion-button');
            btnClose.setAttribute('fill', 'clear');
            btnClose.style.cssText += ' --color: var(--ion-color-primary-contrast, #ffffff) !important; font-family: var(--sys-font-family, inherit) !important;';
            btnClose.textContent = 'Cerrar';
            btnClose.addEventListener('click', () => {
                modal.dismiss().then(() => modal.remove());
            });
            mButtons.appendChild(btnClose);
            mToolbar.appendChild(mButtons);
            mHeader.appendChild(mToolbar);
            modal.appendChild(mHeader);

            const mContent = document.createElement('ion-content');
            const mList = document.createElement('ion-list');
            
            const itemCreate = document.createElement('ion-item');
            itemCreate.setAttribute('button', 'true');
            itemCreate.id = 'btn-create-new';
            itemCreate.setAttribute('lines', 'full');
            itemCreate.setAttribute('color', 'light');
            
            const iconCreate = document.createElement('ion-icon');
            iconCreate.setAttribute('name', 'add-circle-outline');
            iconCreate.setAttribute('slot', 'start');
            iconCreate.setAttribute('color', 'primary');
            itemCreate.appendChild(iconCreate);
            
            const labelCreate = document.createElement('ion-label');
            labelCreate.setAttribute('color', 'primary');
            const strongCreate = document.createElement('strong');
            strongCreate.textContent = `+ Crear Nuevo ${field.label.replace(/s de /i, ' de ').replace(/s$/i, '').replace(/Grupos/i, 'Grupo')}`;
            labelCreate.appendChild(strongCreate);
            itemCreate.appendChild(labelCreate);
            
            mList.appendChild(itemCreate);
            
            const divider = document.createElement('ion-item-divider');
            const divLabel = document.createElement('ion-label');
            divLabel.textContent = 'Registros Existentes';
            divider.appendChild(divLabel);
            mList.appendChild(divider);

            if (availableOptions.length === 0) {
                const itemEmpty = document.createElement('ion-item');
                const labelEmpty = document.createElement('ion-label');
                labelEmpty.setAttribute('color', 'medium');
                labelEmpty.textContent = 'No hay más registros disponibles';
                itemEmpty.appendChild(labelEmpty);
                mList.appendChild(itemEmpty);
            } else {
                availableOptions.forEach(opt => {
                    const itemOpt = document.createElement('ion-item');
                    itemOpt.setAttribute('button', 'true');
                    itemOpt.className = 'lookup-option';
                    itemOpt.dataset.value = String(opt.value);
                    itemOpt.dataset.label = String(opt.label);
                    
                    const lblOpt = document.createElement('ion-label');
                    lblOpt.textContent = opt.label;
                    itemOpt.appendChild(lblOpt);
                    
                    const cbOpt = document.createElement('ion-checkbox');
                    cbOpt.setAttribute('slot', 'end');
                    itemOpt.appendChild(cbOpt);
                    
                    itemOpt.addEventListener('click', (e) => {
                        // Evitar que el checkbox nativo y nuestro click se pisen
                        if (e.target.tagName !== 'ION-CHECKBOX') {
                            cbOpt.checked = !cbOpt.checked;
                        }
                        itemOpt.dispatchEvent(new CustomEvent('selectionChange'));
                    });
                    
                    mList.appendChild(itemOpt);
                });
            }
            
            mContent.appendChild(mList);
            modal.appendChild(mContent);
            
            const mFooter = document.createElement('ion-footer');
            const mfToolbar = document.createElement('ion-toolbar');
            
            const btnConfirm = document.createElement('ion-button');
            btnConfirm.setAttribute('expand', 'block');
            btnConfirm.setAttribute('fill', 'solid');
            btnConfirm.setAttribute('color', 'primary');
            btnConfirm.id = 'btn-confirm-selection';
            btnConfirm.disabled = true;
            btnConfirm.style.cssText += ' font-family: var(--sys-font-family, inherit) !important; margin: 8px;'; 
            btnConfirm.innerHTML = '<span style="color: #ffffff; font-weight: bold;">Vincular Seleccionados (0)</span>';
            
            mfToolbar.appendChild(btnConfirm);
            mFooter.appendChild(mfToolbar);
            modal.appendChild(mFooter);

            document.body.appendChild(modal);
            
            // GC Native Bind: Destruir el nodo DOM huérfano si el usuario cierra tocando el Backdrop oscuro
            modal.addEventListener('ionModalDidDismiss', () => {
                const el = document.getElementById(modalId);
                if (el) el.remove();
            });
            
            await window.PresentSafe(modal);

            // Logic for selection
            const optionsItems = modal.querySelectorAll('.lookup-option');
            optionsItems.forEach(item => {
                item.addEventListener('selectionChange', () => {
                    const allCbs = Array.from(modal.querySelectorAll('ion-checkbox'));
                    const checked = allCbs.filter(c => c.checked).length;
                    btnConfirm.innerHTML = `<span style="color: #ffffff; font-weight: bold;">Vincular Seleccionados (${checked})</span>`;
                    btnConfirm.disabled = checked === 0;
                });
            });

            btnConfirm.addEventListener('click', () => {
                setOptimisticLock();
                optionsItems.forEach(item => {
                    const cb = item.querySelector('ion-checkbox');
                    if (cb && cb.checked) {
                        const val = item.dataset.value;
                        const lab = item.dataset.label;
                        
                        childRecords.push({
                            [childPK]: val,
                            nombre: lab,
                            estado: 'Activo'
                        });
                    }
                });
                _refreshList();
                modal.dismiss().then(() => modal.remove());
            });

            itemCreate.addEventListener('click', async () => {
                // In-Line Creation via Modal Stack
                // Desmontamos el Subgrid Picker
                modal.dismiss().then(() => modal.remove());
                
                const onSubFormSuccess = (newRecordResp, submittedPayload) => {
                    if (newRecordResp && newRecordResp.status === 'success') {
                        setOptimisticLock();
                        // Soporte para distintas firmas de payload (según controlador de GAS)
                        const itemPayload = (newRecordResp.data && newRecordResp.data.data) ? newRecordResp.data.data : (newRecordResp.data || newRecordResp);
                        
                        // Extraemos el PK de la respuesta del servidor u originamos del payload devuelto
                        const newId = newRecordResp.pkValue || itemPayload[childPK] || itemPayload['id_registro'];
                        
                        // RQ1: Fallback Defensivo con Invocación Ontológica
                        // La representación visual se mapea prioritariamente según el schema del framework
                        const sourceName = submittedPayload || itemPayload;
                        const schemaMeta = window.APP_SCHEMAS && window.APP_SCHEMAS[field.targetEntity];
                        const titleKey = schemaMeta ? (schemaMeta.titleField || (schemaMeta.metadata && schemaMeta.metadata.titleField) || 'nombre') : 'nombre';
                        
                        const newName = sourceName[titleKey] || sourceName.nombre || sourceName.nombre_producto || newId;

                        if (newId) {
                            childRecords.push({
                                [childPK]: newId,
                                nombre: newName,
                                estado: 'Activo'
                            });
                            _refreshList();
                        }
                    }
                };
                
                // [S29.8] Determinar Foreign Key recíproca hacia el Padre
                let initialData = {};
                const schemaMeta = window.APP_SCHEMAS && window.APP_SCHEMAS[field.targetEntity];
                if (schemaMeta && schemaMeta.fields) {
                    const reciprocalField = schemaMeta.fields.find(f => 
                        f.type === 'relation' && 
                        f.targetEntity === entityName && // Apunta de vuelta al Padre
                        f.relationType !== field.relationType // Tiene el tipo de arista opuesto
                    );
                    if (reciprocalField) {
                        const mockToken = (window.UI_CONSTANTS && window.UI_CONSTANTS.MOCK_FK_TOKEN) ? window.UI_CONSTANTS.MOCK_FK_TOKEN : '_NEW_PARENT_';
                        initialData[reciprocalField.name] = config.parentEditId || mockToken;
                    }
                }
                
                // Emisión Invertida (Pub/Sub Topológico) hacia el EventBus para no llamar a globals
                if (localEventBus && typeof localEventBus.publish === 'function') {
                    localEventBus.publish('UI::REQUEST_SUBFORM_OPEN', {
                        targetEntity: field.targetEntity,
                        initialData: initialData,
                        onSuccess: onSubFormSuccess
                    });
                } else {
                    console.warn(`[UI_SubgridBuilder] No EventBus provided. Cannot open subform for ${field.targetEntity}`);
                }
            });
        });

        // Aseguramos que antes de retornar el modal esté instanciado en el layout (esto sigue sin cambiar la refactorización purista)
        container.appendChild(subgridDiv);
    }
};