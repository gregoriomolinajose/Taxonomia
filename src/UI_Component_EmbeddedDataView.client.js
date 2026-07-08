/* ============================================================
   UI_Component_EmbeddedDataView.client.js
   Contenedor aislado para incrustar DataGrid + Toolbar
   ============================================================ */

window.UI_Component_EmbeddedDataView = {
    build: function(field, container, data, entityName, localEventBus, modalContext, config = {}) {
        const isReadonly = config.readonly === true || field.readonly === true;
        const targetEntity = field.targetEntity || 'Equipo';
        const edgeType = field.graphEdgeType || 'TAXONOMIA_EQUIPO';

        // S50.3 Context Identifier
        const explicitContext = (modalContext && modalContext.dataset && modalContext.dataset.taxonomiaContext) ? modalContext.dataset.taxonomiaContext : null;
        let currentPK = data ? (data[window.Schema_Utils.getPrimaryKey(entityName)] || data.id_registro) : null;
        const fallbackContext = window.UI_FormUtils ? window.UI_FormUtils.extractDraftContext(entityName, currentPK) : null;
        const contextId = explicitContext || fallbackContext;
        const isTopologyContainer = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName] && window.APP_SCHEMAS[entityName].metadata && window.APP_SCHEMAS[entityName].metadata.isTopologyContainer;
        const strictContext = !!explicitContext || isTopologyContainer;
        
        currentPK = currentPK || contextId;

        let _ctrl = new window.UI_DataGrid_Controller({
            entityName: targetEntity,
            pageSize: 50,
            onChange: function(newState) {
                if (typeof renderGrid === 'function') renderGrid();
            }
        });
        
        let _state = _ctrl.state;

        const wrapper = document.createElement('div');
        wrapper.className = 'embedded-dataview-wrapper';
        wrapper.setAttribute('data-form-component', field.name);
        wrapper.style.border = 'none'; // S56: Removido el borde para sensación nativa en el Wizard
        wrapper.style.borderRadius = '0';
        wrapper.style.background = 'var(--color-bg-body, #fff)';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'column';
        wrapper.style.flex = '1';
        wrapper.style.minHeight = '0'; // Crucial to prevent parent flex from growing beyond container
        wrapper.style.overflow = 'hidden';
        // S29.7 Value Export Node
        wrapper.getValidatedValue = () => Array.from(_state.data);

        // Auto-refresh when entities are saved anywhere in the app
        let unsubSubmit = null;
        let unsubETL = null;
        let unsubGraph = null;
        if (window.AppEventBus) {
            unsubSubmit = window.AppEventBus.subscribe('FORM::SUBMIT_SUCCESS', (payload) => {
                if (!wrapper.isConnected) {
                    if (unsubSubmit) unsubSubmit();
                    if (unsubETL) unsubETL();
                    if (unsubGraph) unsubGraph();
                    return;
                }
                if (payload && payload.entityName === targetEntity) {
                    refreshAll();
                }
            });
            
            unsubETL = window.AppEventBus.subscribe('ETL::FINISHED', (payload) => {
                if (!wrapper.isConnected) {
                    if (unsubSubmit) unsubSubmit();
                    if (unsubETL) unsubETL();
                    if (unsubGraph) unsubGraph();
                    return;
                }
                if (payload && payload.entity === targetEntity) {
                    refreshAll();
                }
            });
            
            unsubGraph = window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', () => {
                if (!wrapper.isConnected) {
                    if (unsubSubmit) unsubSubmit();
                    if (unsubETL) unsubETL();
                    if (unsubGraph) unsubGraph();
                    return;
                }
                refreshAll();
            });
        }

        // S56: El cintillo de título fue removido para evitar la sensación de pantalla encasulada
        // if (field.label) { ... }

        const toolbarContainer = document.createElement('div');
        const gridContainer = document.createElement('div');
        gridContainer.style.flex = '1';
        gridContainer.style.display = 'flex';
        gridContainer.style.flexDirection = 'column';
        gridContainer.style.overflow = 'hidden';
        gridContainer.style.minHeight = '0'; // Allow shrinking below content size so internal overflow triggers

        wrapper.appendChild(toolbarContainer);
        wrapper.appendChild(gridContainer);
        container.appendChild(wrapper);

        // Fetch Data
        const loadData = () => {
            if (!window.DataStore || !window.Graph_Utils) return [];
            const normPK = window.UI_FormUtils ? window.UI_FormUtils.normalizeId(currentPK) : String(currentPK);
            const childIds = window.Graph_Utils.resolveAllLinkedIds(normPK, edgeType, contextId, strictContext);
            
            let loaded = [];
            if (childIds.length > 0) {
                const targetTable = window.DataStore.get(targetEntity) || [];
                const schemaChild = window.APP_SCHEMAS ? window.APP_SCHEMAS[targetEntity] : null;
                const childPkKey = schemaChild && schemaChild.primaryKey ? schemaChild.primaryKey : 'id_registro';
                targetTable.forEach(row => {
                    const rawId = window.UI_FormUtils ? window.UI_FormUtils.normalizeId(row[childPkKey] || row.id_registro) : String(row[childPkKey] || row.id_registro);
                    if (childIds.includes(rawId) && row.estado !== 'Eliminado') {
                        loaded.push(row);
                    }
                });
            }
            return loaded;
        };

        const initColumns = () => {
            const meta = window.ENTITY_META ? window.ENTITY_META[targetEntity] : null;
            const fallbackTitleKey = (meta && meta.titleField) ? meta.titleField : 'nombre';
            const idKey = window.Schema_Utils.getPrimaryKey(targetEntity);
            
            let cols = [];
            if (window.UI_DataGrid && window.UI_DataGrid._normalizeFields) {
                const fieldsDef = window.UI_DataGrid._normalizeFields(targetEntity) || [];
                const VIRTUAL_TYPES = ['divider', 'header', 'spacer', 'alert', 'markup', 'title'];
                cols = fieldsDef.filter(f => !f.isVirtual && f.type !== 'hidden' && !VIRTUAL_TYPES.includes(f.type)).map(f => ({
                    key: f.name,
                    label: f.label || f.name,
                    visible: f.showInList !== false,
                    sortable: true,
                    uiType: f.uiDisplay || f.type || 'text',
                    order: f.gridOrder || 99
                }));
            }
            // Ensure numeration exists
            if (!cols.some(c => c.uiType === 'system-num')) {
                cols.unshift({ key: '_num', label: '#', visible: true, sortable: false, uiType: 'system-num', order: 2 });
            }
            cols.sort((a, b) => a.order - b.order);
            _ctrl.setColumns(cols);
        };

        // applyFilterAndSort was removed. Controlled by UI_DataGrid_Controller.

        const renderToolbar = () => {
            window.DOM.clear(toolbarContainer);

            const canCreate = !isReadonly;

            // 1. Build Header manually (simulating UI_DataView_Toolbar.buildHeader without ID conflicts)
            const meta = window.ENTITY_META && window.ENTITY_META[targetEntity] ? window.ENTITY_META[targetEntity] : { iconName: 'cube-outline', label: targetEntity };
            const headerDiv = document.createElement('div');
            headerDiv.className = 'dv-header';

            const leftDiv = document.createElement('div');
            leftDiv.className = 'dv-header-left';
            const h2 = document.createElement('h2');
            const icon = document.createElement('ion-icon');
            icon.className = 'dv-title-icon';
            icon.setAttribute('name', meta.iconName);
            h2.appendChild(icon);
            h2.appendChild(document.createTextNode(' ' + (field.label || meta.label || targetEntity)));
            const p = document.createElement('p');
            p.textContent = `${_state.filtered.length} registro${_state.filtered.length !== 1 ? 's' : ''} en total`;
            leftDiv.appendChild(h2);
            leftDiv.appendChild(p);
            headerDiv.appendChild(leftDiv);

            const rightDiv = document.createElement('div');
            rightDiv.className = 'dv-header-actions';
            
            // Botón Expandir (simulado para Embedded)
            const btnExpFull = document.createElement('button');
            btnExpFull.className = 'dv-btn dv-btn-ghost';
            btnExpFull.innerHTML = '<ion-icon name="expand-outline" slot="start"></ion-icon> Expandir';
            let isExpanded = false;
            let placeholder = null;
            btnExpFull.onclick = (e) => {
                e.preventDefault();
                isExpanded = !isExpanded;

                if (isExpanded) {
                    btnExpFull.innerHTML = '<ion-icon name="contract-outline" slot="start"></ion-icon> Colapsar';
                    
                    placeholder = document.createElement('div');
                    placeholder.className = 'dv-embedded-placeholder';
                    placeholder.style.height = wrapper.offsetHeight + 'px';
                    wrapper.parentNode.insertBefore(placeholder, wrapper);
                    
                    const rootContainer = document.getElementById('drawer-root-container') || document.body;
                    rootContainer.appendChild(wrapper);
                    
                    // Calcular z-index dinámico basado en el drawer actual
                    const currentDrawer = placeholder.closest('.drawer-panel');
                    let targetZIndex = 15001; // Base si no está en drawer (cubre dashboard, pero debajo del primer drawer)
                    if (currentDrawer) {
                        const depth = parseInt(currentDrawer.getAttribute('data-depth') || '1', 10);
                        targetZIndex = 15001 + depth;
                    }
                    
                    wrapper.style.position = 'fixed';
                    wrapper.style.top = '0';
                    wrapper.style.left = '0';
                    wrapper.style.width = '100vw';
                    wrapper.style.height = '100vh';
                    wrapper.style.zIndex = String(targetZIndex);
                    wrapper.style.borderRadius = '0';
                    wrapper.style.margin = '0';
                    wrapper.style.padding = 'var(--spacing-4)';
                    wrapper.style.pointerEvents = 'auto'; // Fix: allow clicks since drawer-root has pointer-events: none
                    gridContainer.style.maxHeight = 'calc(100vh - 120px)';
                } else {
                    btnExpFull.innerHTML = '<ion-icon name="expand-outline" slot="start"></ion-icon> Expandir';
                    
                    if (placeholder && placeholder.parentNode) {
                        placeholder.parentNode.insertBefore(wrapper, placeholder);
                        placeholder.remove();
                    }
                    
                    wrapper.style.position = 'static';
                    wrapper.style.width = '100%';
                    wrapper.style.height = '100%';
                    wrapper.style.zIndex = 'auto';
                    wrapper.style.borderRadius = '0';
                    wrapper.style.margin = '0';
                    wrapper.style.padding = '0';
                    wrapper.style.pointerEvents = 'auto';
                    gridContainer.style.maxHeight = '';
                }
            };
            rightDiv.appendChild(btnExpFull);

            // Botón Exportar CSV
            const btnExp = document.createElement('button');
            btnExp.className = 'dv-btn dv-btn-ghost';
            btnExp.innerHTML = '<ion-icon name="download-outline" slot="start"></ion-icon> Exportar';
            btnExp.onclick = (e) => {
                e.preventDefault();
                if (window.DataEngine && window.DataEngine.exportToSheet) {
                    window.DataEngine.exportToSheet(targetEntity, _state.columns, _state.filtered);
                } else {
                    console.error("DataEngine.exportToSheet no está disponible");
                }
            };
            rightDiv.appendChild(btnExp);

            // Importar Masivamente Button
            const btnImport = document.createElement('button');
            btnImport.className = 'dv-btn dv-btn-ghost';
            btnImport.innerHTML = '<ion-icon name="cloud-upload-outline" style="margin-right:4px;"></ion-icon> Importar';
            btnImport.onclick = (e) => {
                e.preventDefault();
                if (window.UI_ETL_Modal) {
                    window.UI_ETL_Modal.present(targetEntity, {
                        contextId: contextId,
                        edgeType: edgeType,
                        parentEntity: entityName
                    });
                }
            };
            rightDiv.appendChild(btnImport);

            // Vincular Button (ahora Agregar)
            const btnVincular = document.createElement('button');
            btnVincular.className = 'dv-btn dv-btn-outline';
            btnVincular.innerHTML = `<ion-icon name="link-outline" style="margin-right:4px;"></ion-icon> Agregar ${targetEntity}`;
            btnVincular.onclick = (e) => {
                e.preventDefault();
                if (window.UI_Factory && window.UI_Factory.openSearchableDrawer) {
                    window.UI_Factory.openSearchableDrawer({
                        targetEntity: targetEntity,
                        contextId: contextId,
                        edgeType: edgeType,
                        title: `Agregar ${targetEntity}`,
                        description: 'Busca y selecciona los registros que deseas vincular.',
                        currentData: _state.data, // Para que el multi-select sepa qué ya está vinculado
                        onConfirm: (selectedIds) => {
                            const normPK = window.UI_FormUtils ? window.UI_FormUtils.normalizeId(currentPK) : String(currentPK);
                            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(targetEntity) : 'id_registro';
                            const existingIds = _state.data.map(d => {
                                const rawId = d[pkField] || d.id_registro || d;
                                return window.UI_FormUtils ? window.UI_FormUtils.normalizeId(rawId) : String(rawId);
                            });
                            
                            // Si la lista cambió, procesamos los cambios temporales
                            existingIds.forEach(eid => {
                                if (!selectedIds.includes(eid)) {
                                    if(window.Graph_Utils) window.Graph_Utils.deleteTemporalEdge(normPK, eid, edgeType, contextId);
                                }
                            });
                            
                            selectedIds.forEach(eid => {
                                if (!existingIds.includes(eid)) {
                                    if(window.Graph_Utils) window.Graph_Utils.upsertTemporalEdge(normPK, eid, edgeType, contextId);
                                }
                            });
                            
                            refreshAll();
                            
                            // Parchear estado sincrónicamente para evitar race condition en hasChanges() del formulario padre
                            _state.data = _state.data.filter(d => {
                                const rawId = d[pkField] || d.id_registro || d;
                                const normId = window.UI_FormUtils ? window.UI_FormUtils.normalizeId(rawId) : String(rawId);
                                return selectedIds.includes(normId);
                            });
                            
                            // Al guardar silenciosamente, refescamos la vista de los vinculados.
                            refreshAll();
                            
                            // Disparar auto-guardado silencioso del formulario padre (ej. Taxonomía) para persistir las aristas inmediatamente
                            setTimeout(() => {
                                const formContainer = wrapper.closest('form, .drawer-content, ion-content');
                                if (formContainer) {
                                    const submitter = formContainer._formSubmitterInstance || (formContainer.parentElement && formContainer.parentElement._formSubmitterInstance);
                                    if (submitter && typeof submitter.executeSave === 'function') {
                                        submitter.executeSave({ isSilent: true });
                                    }
                                }
                            }, 50);
                        }
                    });
                }
            };
            rightDiv.appendChild(btnVincular);

            // Nuevo Button
            const btnNew = document.createElement('button');
            btnNew.className = 'dv-btn dv-btn-primary';
            btnNew.innerHTML = `<ion-icon name="add-outline" style="margin-right:4px;"></ion-icon> Crear ${targetEntity}`;
            btnNew.onclick = (e) => {
                e.preventDefault();
                if (window.renderForm) {
                    window.renderForm(targetEntity, null, null, {
                        asModal: true,
                        taxonomiaContext: contextId,
                        modalContext: { edgeType: edgeType, parentId: currentPK, contextId: contextId },
                        onModalClose: () => { refreshAll(); }
                    });
                }
            };
            rightDiv.appendChild(btnNew);

            headerDiv.appendChild(rightDiv);

            // 2. Build Toolbar manually (simulating UI_DataView_Toolbar.buildToolbarHTML without ID conflicts)
            const toolbarDiv = window.UI_DataView_Toolbar.buildToolbarHTML(
                _state.view, 
                targetEntity, 
                (newView) => {
                    // Update view toggle active state
                    const btns = toolbarDiv.querySelectorAll('.dv-btn-icon');
                    btns.forEach(b => b.classList.remove('active'));
                    const activeBtn = toolbarDiv.querySelector(`#dv-view-${newView}-btn`);
                    if (activeBtn) activeBtn.classList.add('active');
                    
                    _ctrl.setView(newView);
                },
                () => {
                    if (window.UI_UniversalFilter && window.UI_UniversalFilter.openModal) {
                        window.UI_UniversalFilter.openModal(targetEntity, _state.data, (filtered) => {
                            _ctrl.setAdvancedFilters(filtered);
                        });
                    } else {
                        alert("El filtro universal no está disponible en este contexto.");
                    }
                }
            );

            // Re-bind search
            const searchbar = toolbarDiv.querySelector('ion-searchbar');
            if (searchbar) {
                searchbar.placeholder = 'Buscar en ' + targetEntity + '...';
                searchbar.value = _state.searchText;
                searchbar.addEventListener('ionInput', (e) => {
                    _ctrl.setSearchText(e.target.value);
                });
            }

            // Bind column popover
            const btnCols = toolbarDiv.querySelector('#dv-col-trigger-btn');
            if (btnCols) {
                btnCols.addEventListener('click', (e) => {
                    // S24.8 Fix: Pass the columns configuration to popover
                    window.UI_DataView_Toolbar.ensureColPopover(_state.columns, (idx, isVisible) => {
                            _ctrl.onColToggle(idx, isVisible);
                            renderGrid();
                    });
                });
            }

            toolbarContainer.appendChild(headerDiv);
            toolbarContainer.appendChild(toolbarDiv);
        };

        const renderGrid = () => {
            window.DOM.clear(gridContainer);
            gridContainer.innerHTML = '';
            const gridConfig = {
                entityName: targetEntity,
                containerId: wrapper.id || 'embedded-dataview-grid',
                columns: _state.columns,
                filteredData: _state.filtered,
                page: _state.page,
                pageSize: _state.pageSize,
                totalPages: Math.ceil(_state.filtered.length / _state.pageSize),
                totalRows: _state.filtered.length,
                view: _state.view,
                onEdit: (id) => {
                    if (window.openEditForm) {
                        window.openEditForm(id, targetEntity, {
                            asModal: true,
                            taxonomiaContext: contextId,
                            modalContext: { edgeType: edgeType, parentId: currentPK, contextId: contextId },
                            onModalClose: () => refreshAll()
                        });
                    }
                },
                onDelete: (id) => {
                    if (window.Graph_Utils && !isReadonly) {
                        const normPK = window.UI_FormUtils ? window.UI_FormUtils.normalizeId(currentPK) : String(currentPK);
                        window.Graph_Utils.deleteTemporalEdge(normPK, String(id), edgeType, contextId);
                        refreshAll();
                    }
                },
                onPage: _ctrl.onPage,
                onPageSize: _ctrl.onPageSize,
                onSort: _ctrl.onSort,
                onGridScroll: (top) => { _state.lastGridScroll = top; },
                lastGridScroll: _state.lastGridScroll
            };

            const gridNodes = window.UI_DataGrid.buildLayout(gridConfig);
            gridContainer.appendChild(gridNodes);
        };

        const refreshAll = () => {
            _ctrl.setData(loadData());
            renderGrid();
        };

        // Listen for ETL Modal bulk import completion
        if (localEventBus) {
            localEventBus.subscribe('ETL::FINISHED', () => {
                refreshAll();
            });
        }

        initColumns();
        refreshAll();
        renderToolbar();

        return wrapper;
    }
};
