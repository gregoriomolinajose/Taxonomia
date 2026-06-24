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
        const currentPK = data ? (data[window.Schema_Utils.getPrimaryKey(entityName)] || data.id_registro) : null;
        const fallbackContext = window.UI_FormUtils ? window.UI_FormUtils.extractDraftContext(entityName, currentPK) : null;
        const contextId = explicitContext || fallbackContext;
        const strictContext = !!explicitContext || entityName === 'Taxonomia';

        let _state = {
            data: [],
            filtered: [],
            page: 1,
            pageSize: 10,
            sortCol: '',
            sortDir: 'asc',
            view: 'table',
            columns: [],
            searchText: ''
        };

        const wrapper = document.createElement('div');
        wrapper.className = 'embedded-dataview-wrapper';
        wrapper.style.border = '1px solid var(--ion-color-step-150, #ccc)';
        wrapper.style.borderRadius = 'var(--rounded-md, 8px)';
        wrapper.style.overflow = 'hidden';
        wrapper.style.marginBottom = 'var(--spacing-4, 16px)';
        wrapper.style.background = 'var(--color-bg-body, #fff)';
        // S29.7 Value Export Node
        wrapper.getValidatedValue = () => Array.from(_state.data);

        // Header Title (optional)
        if (field.label) {
            const headerTitle = document.createElement('div');
            headerTitle.style.padding = '12px 16px';
            headerTitle.style.background = 'var(--ion-color-light)';
            headerTitle.style.fontWeight = '600';
            headerTitle.style.borderBottom = '1px solid var(--ion-color-step-150, #ccc)';
            headerTitle.textContent = field.label;
            wrapper.appendChild(headerTitle);
        }

        const toolbarContainer = document.createElement('div');
        const gridContainer = document.createElement('div');
        gridContainer.style.maxHeight = '400px';
        gridContainer.style.overflowY = 'auto';

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
                cols = fieldsDef.filter(f => !f.isVirtual && f.type !== 'hidden').map(f => ({
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
            _state.columns = cols;
        };

        const applyFilterAndSort = () => {
            let result = [..._state.data];
            
            if (_state.searchText) {
                const term = _state.searchText.toLowerCase();
                result = result.filter(row => {
                    return Object.values(row).some(val => val && String(val).toLowerCase().includes(term));
                });
            }

            if (_state.sortCol) {
                result.sort((a, b) => {
                    let vA = a[_state.sortCol] || '';
                    let vB = b[_state.sortCol] || '';
                    if (typeof vA === 'string') vA = vA.toLowerCase();
                    if (typeof vB === 'string') vB = vB.toLowerCase();
                    if (vA < vB) return _state.sortDir === 'asc' ? -1 : 1;
                    if (vA > vB) return _state.sortDir === 'asc' ? 1 : -1;
                    return 0;
                });
            }
            _state.filtered = result;
        };

        const renderToolbar = () => {
            window.DOM.clear(toolbarContainer);
            
            // Build custom toolbar based on UI_DataView_Toolbar structure
            const toolbar = document.createElement('div');
            toolbar.className = 'dv-toolbar';
            toolbar.style.padding = '12px 16px';
            toolbar.style.borderBottom = '1px solid var(--ion-color-step-150, #ccc)';
            
            const left = document.createElement('div');
            left.className = 'dv-toolbar-left';
            
            // Search
            const searchWrap = document.createElement('div');
            searchWrap.className = 'dv-search-wrap';
            const searchbar = document.createElement('ion-searchbar');
            searchbar.placeholder = 'Buscar en ' + targetEntity + '...';
            searchbar.value = _state.searchText;
            searchbar.style.padding = '0';
            searchbar.addEventListener('ionInput', (e) => {
                _state.searchText = e.target.value;
                _state.page = 1;
                applyFilterAndSort();
                renderGrid();
            });
            searchWrap.appendChild(searchbar);
            left.appendChild(searchWrap);
            
            const right = document.createElement('div');
            right.className = 'dv-toolbar-right';
            
            if (!isReadonly) {
                // Importar Masivamente Button
                const btnImport = document.createElement('button');
                btnImport.className = 'dv-btn dv-btn-ghost';
                btnImport.style.marginRight = '8px';
                btnImport.innerHTML = '<ion-icon name="cloud-upload-outline" style="margin-right:4px;"></ion-icon> Importar Masivamente';
                btnImport.onclick = (e) => {
                    e.preventDefault();
                    if (window.UI_ETL_Modal) {
                        window.UI_ETL_Modal.present(targetEntity, contextId);
                    }
                };
                right.appendChild(btnImport);

                // Vincular Button
                const btnVincular = document.createElement('button');
                btnVincular.className = 'dv-btn dv-btn-outline';
                btnVincular.style.marginRight = '8px';
                btnVincular.innerHTML = '<ion-icon name="link-outline" style="margin-right:4px;"></ion-icon> Vincular Equipo';
                btnVincular.onclick = (e) => {
                    e.preventDefault();
                    if (window.UI_DrawerManager) {
                        const content = document.createElement('div');
                        content.style.padding = '24px 16px';
                        
                        const title = document.createElement('h3');
                        title.textContent = 'Vincular ' + targetEntity;
                        title.style.marginTop = '0';
                        title.style.marginBottom = '12px';
                        title.style.fontWeight = '700';
                        content.appendChild(title);
                        
                        const desc = document.createElement('p');
                        desc.textContent = 'Seleccione los equipos que desea vincular a esta Taxonomía.';
                        desc.style.color = 'var(--ion-color-medium)';
                        desc.style.fontSize = '0.9rem';
                        desc.style.marginBottom = '24px';
                        content.appendChild(desc);
                        
                        // Fake field configuration for TXSearchable
                        const pkField = window.Schema_Utils.getPrimaryKey(targetEntity);
                        const virtualField = {
                            name: 'vincular_multi',
                            uiComponent: 'searchable_multi',
                            targetEntity: targetEntity,
                            valueField: pkField,
                            labelField: 'nombre'
                        };
                        
                        // Pass existing links
                        const virtualData = { vincular_multi: _state.data.map(d => String(d[pkField] || d.id_registro)) };
                        
                        const searchableNode = window.UI_Factory.buildFieldNode(virtualField, targetEntity, virtualData, localEventBus, contextId);
                        content.appendChild(searchableNode);
                        
                        const actions = document.createElement('div');
                        actions.style.marginTop = '32px';
                        actions.style.display = 'flex';
                        actions.style.justifyContent = 'flex-end';
                        actions.style.gap = '12px';
                        
                        const cancelBtn = document.createElement('ion-button');
                        cancelBtn.textContent = 'Cancelar';
                        cancelBtn.fill = 'clear';
                        cancelBtn.color = 'medium';
                        cancelBtn.onclick = () => window.UI_DrawerManager.closeDrawer();
                        
                        const saveBtn = document.createElement('ion-button');
                        saveBtn.textContent = 'Confirmar Vínculos';
                        saveBtn.onclick = () => {
                            if (searchableNode.getValidatedValue && window.Graph_Utils) {
                                const selectedIds = searchableNode.getValidatedValue() || [];
                                const normPK = window.UI_FormUtils ? window.UI_FormUtils.normalizeId(currentPK) : String(currentPK);
                                
                                const existingIds = _state.data.map(d => window.UI_FormUtils.normalizeId(d[pkField] || d.id_registro));
                                
                                // Remove edges that are no longer selected
                                existingIds.forEach(eid => {
                                    if (!selectedIds.includes(eid)) {
                                        window.Graph_Utils.deleteTemporalEdge(normPK, eid, edgeType, contextId);
                                    }
                                });
                                // Add newly selected edges
                                selectedIds.forEach(eid => {
                                    if (!existingIds.includes(eid)) {
                                        window.Graph_Utils.upsertTemporalEdge(normPK, eid, edgeType, contextId);
                                    }
                                });
                                
                                refreshAll();
                                window.UI_DrawerManager.closeDrawer();
                            }
                        };
                        actions.appendChild(cancelBtn);
                        actions.appendChild(saveBtn);
                        content.appendChild(actions);
                        
                        window.UI_DrawerManager.openDrawer(content, 'right');
                    }
                };
                right.appendChild(btnVincular);

                // Nuevo Button
                const btnNew = document.createElement('button');
                btnNew.className = 'dv-btn dv-btn-primary';
                btnNew.innerHTML = '<ion-icon name="add-outline" style="margin-right:4px;"></ion-icon> Nuevo';
                btnNew.onclick = (e) => {
                    e.preventDefault();
                    if (window.UI_Router) {
                        window.UI_Router.navigateTo('form', { 
                            entityName: targetEntity, 
                            recordId: null, 
                            asModal: true,
                            modalContext: { edgeType: edgeType, parentId: currentPK, contextId: contextId },
                            onModalClose: () => { refreshAll(); }
                        });
                    }
                };
                right.appendChild(btnNew);
            }
            
            toolbar.appendChild(left);
            toolbar.appendChild(right);
            toolbarContainer.appendChild(toolbar);
        };

        const renderGrid = () => {
            window.DOM.clear(gridContainer);
            
            const startIdx = (_state.page - 1) * _state.pageSize;
            const pagedData = _state.filtered.slice(startIdx, startIdx + _state.pageSize);
            const visibleCols = _state.columns.filter(c => c.visible);

            const gridConfig = {
                entityName: targetEntity,
                columns: visibleCols,
                filteredData: pagedData,
                page: _state.page,
                pageSize: _state.pageSize,
                totalPages: Math.ceil(_state.filtered.length / _state.pageSize),
                totalRows: _state.filtered.length,
                view: _state.view,
                onEdit: (id) => {
                    if (window.UI_Router && !isReadonly) {
                        window.UI_Router.navigateTo('form', { 
                            entityName: targetEntity, 
                            recordId: id, 
                            asModal: true,
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
                onPageChange: (newPage) => {
                    _state.page = newPage;
                    renderGrid();
                },
                onPageSizeChange: (newSize) => {
                    _state.pageSize = newSize;
                    _state.page = 1;
                    renderGrid();
                },
                onSort: (colKey) => {
                    if (_state.sortCol === colKey) {
                        _state.sortDir = _state.sortDir === 'asc' ? 'desc' : 'asc';
                    } else {
                        _state.sortCol = colKey;
                        _state.sortDir = 'asc';
                    }
                    applyFilterAndSort();
                    renderGrid();
                }
            };

            const gridNodes = window.UI_DataGrid.buildLayout(gridConfig);
            gridContainer.appendChild(gridNodes);
        };

        const refreshAll = () => {
            _state.data = loadData();
            applyFilterAndSort();
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
