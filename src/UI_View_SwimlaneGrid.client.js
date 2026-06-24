/**
 * UI_View_SwimlaneGrid.client.js
 * 
 * Orquestador Visual: Matriz de Swimlanes para Taxonomía.
 * Lee desde el DataStore en memoria y construye un DOM de CSS Flexbox.
 */

window.UI_View_SwimlaneGrid = {
    render: function(containerElement, taxonomiaId, viewMode = 'COMPLETO') {
        this.container = containerElement;
        this.taxonomiaId = taxonomiaId;
        this.viewMode = viewMode;
        
        // Setup initial UI
        this._bindEvents();
        this.refresh();
    },
    
    _bindEvents: function() {
        if (this._unsubSubmit) { this._unsubSubmit(); this._unsubSubmit = null; }
        if (this._unsubGraph) { this._unsubGraph(); this._unsubGraph = null; }
        
        if (window.AppEventBus) {
            this._unsubSubmit = window.AppEventBus.subscribe('FORM::SUBMIT_SUCCESS', (payload) => {
                if (payload && payload.entityName === 'Taxonomia' && payload.response && payload.response.data) {
                    const pk = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey('Taxonomia') : 'id_taxonomia';
                    const newId = payload.response.data[pk];
                    if (newId) {
                        this.taxonomiaId = newId;
                        // S53.3 Actualizar título en URL/State si existe router
                        window.history.replaceState({viewType: 'dataview', payload: 'Taxonomia', recordId: newId}, '', '');
                        this.refresh();
                    }
                }
                
                // S55.2: Detectar creación de Unidad_Negocio desde el Canvas y enlazarla a Taxonomia
                if (payload && payload.entityName === 'Unidad_Negocio' && payload.response && payload.response.data) {
                    const pk = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey('Unidad_Negocio') : 'id_unidad_negocio';
                    const newId = payload.response.data[pk];
                    
                    if (newId) {
                        // Inyectar el ID en el formulario borrador de Taxonomía
                        const hiddenInput = document.querySelector('form#dynamicForm_Taxonomia [name="id_unidad_negocio"]');
                        if (hiddenInput) {
                            hiddenInput.value = newId;
                            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                            
                            // S55.2 Auto-guardar Taxonomia para persistir la arista TAXONOMIA_UNIDAD
                            const formContainer = hiddenInput.closest('.drawer-content, ion-content');
                            if (formContainer) {
                                const submitter = formContainer._formSubmitterInstance || (formContainer.parentElement && formContainer.parentElement._formSubmitterInstance);
                                if (submitter && typeof submitter.submit === 'function') {
                                    submitter.submit(null, { skipUI: true, silent: true });
                                } else {
                                    const btnSubmit = formContainer.querySelector('ion-button[color="primary"]');
                                    if (btnSubmit) btnSubmit.click();
                                }
                            }
                        }
                        this.refresh();
                    }
                }
            });
            
            this._unsubGraph = window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', () => {
                this.refresh();
            });
        }

        // Monitor local form changes if we are in the wizard to provide real-time updates
        const draftForm = document.querySelector('form#dynamicForm_Taxonomia');
        if (draftForm && !this._formEventsBound) {
            this._formEventsBound = true;
            // Listen to standard input changes and Ionic custom events
            draftForm.addEventListener('change', () => this.refresh(), true);
            draftForm.addEventListener('ionChange', () => this.refresh(), true);
        }
        
        // S54.4 TXSearchable custom events - Global listener to catch from any drawer
        if (!this._txChangeBound) {
            this._txChangeBound = true;
            document.body.addEventListener('txChange', () => this.refresh(), true);
        }
    },
    
    refresh: function() {
        console.log("[Canvas Debug] refresh() CALLED");
        
        // [BugFix] Evitar colisión de DOM/CSSOM si un Drawer se está cerrando
        if (window.DrawerStackController && window.DrawerStackController._isClosing) {
            console.warn("[Canvas Debug] refresh() pospuesto porque un Drawer se está cerrando (_isClosing).");
            if (this._refreshTimeout) clearTimeout(this._refreshTimeout);
            this._refreshTimeout = setTimeout(() => {
                console.warn("[Canvas Debug] TIMEOUT FIRED! Evaluando refresh() nuevamente...");
                this.refresh();
            }, 350);
            return;
        }

        const rootContainer = this.container.querySelector('#tax-canvas-root');
        if (!rootContainer) {
            console.warn("[Canvas Debug] rootContainer NO ENCONTRADO en this.container");
            return;
        }
        
        // S54.4 UI Stabilization: Throttle multiple refresh triggers (Phase 1 vs Phase 2)
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
        }
        
        this._refreshTimeout = setTimeout(() => {
            // "Silent" update: don't clear the canvas to prevent the blinking/disappearance effect
            this._buildCanvas(rootContainer);
        }, 150);
    },
    
    _openCustomUnidadDrawer: function() {
        if (window.DrawerStackController && window.UI_Factory) {
            if (document.getElementById('manual-drawer-unidad-negocio')) return;
            const drawerNode = document.createElement('div');
            drawerNode.id = 'manual-drawer-unidad-negocio';
            drawerNode.style.backgroundColor = 'var(--ion-background-color, #fff)';
            drawerNode.style.display = 'flex';
            drawerNode.style.flexDirection = 'column';
            drawerNode.style.height = '100%';
            drawerNode.style.position = 'absolute'; // User requested explicit absolute overlay
            drawerNode.style.right = '0';
            drawerNode.style.top = '0';
            drawerNode.style.bottom = '0';
            drawerNode.style.zIndex = '20000'; // Ensure it is above the canvas
            drawerNode.style.pointerEvents = 'auto'; // Block clicks from falling through

            // 1. HEADER NATIVO DE LA PLATAFORMA
            let taxoTitle = 'Nueva Taxonomía';
            const titleInput = document.querySelector('form#dynamicForm_Taxonomia [name="nombre"]');
            if (titleInput && titleInput.value) {
                taxoTitle = titleInput.value;
            } else if (window.DataStore) {
                const ds = window.DataStore.get('Taxonomia') || [];
                const taxoRec = ds.find(d => String(d.id_taxonomia) === String(this.taxonomiaId));
                if (taxoRec && taxoRec.nombre) taxoTitle = taxoRec.nombre;
            }

            const header = window.UI_Factory.buildDrawerHeader({
                entityName: 'Taxonomia',
                data: { nombre: taxoTitle },
                localEditId: this.taxonomiaId || null,
                onClose: () => window.DrawerStackController.closeTop()
            });
            drawerNode.appendChild(header);

            // 2. CONTENIDO SCROLLABLE
            const container = document.createElement('ion-content');
            container.className = 'drawer-content ion-padding';
            
            container.innerHTML = `
                <div style="margin-bottom: 24px;">
                    <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--ion-text-color); margin-top:0;">Seleccionar Unidad Existente</h2>
                    <p style="color: var(--ion-color-medium); font-size: 0.875rem;">Utilice el buscador para vincular o cambiar la unidad de negocio a esta taxonomía.</p>
                </div>
                <tx-searchable 
                    data-form-component="temp_searchable_unidad" 
                    entity-name="Unidad_Negocio" 
                    target-entity="Unidad_Negocio"
                    value-field="id_unidad_negocio" 
                    label-field="nombre" 
                    icon-name="business-outline"
                    style="display:block; margin-bottom: 24px;">
                </tx-searchable>
            `;
            drawerNode.appendChild(container);

            window.DrawerStackController.push(drawerNode);

            setTimeout(() => {
                const tempTx = drawerNode.querySelector('tx-searchable');
                if(tempTx) {
                    // Cargar la fuente de datos (lista de unidades de negocio)
                    if (window.DataStore) {
                        const ds = window.DataStore.get('Unidad_Negocio') || [];
                        tempTx.dataSource = ds.filter(d => d.estado !== 'Eliminado');
                    }

                    // currentUnidadId logic
                    let currentUnidadId = null;
                    let mainInput = document.querySelector('form#dynamicForm_Taxonomia [data-form-component="id_unidad_negocio"], form#dynamicForm_Taxonomia [name="id_unidad_negocio"]');
                    if (!mainInput) mainInput = document.querySelector('[data-form-component="id_unidad_negocio"], [name="id_unidad_negocio"]');
                    if (mainInput) {
                        currentUnidadId = mainInput.value || mainInput._selectedState || null;
                    } else {
                        const taxRec = window.DataStore && window.DataStore.get('Taxonomia') ? window.DataStore.get('Taxonomia').find(t => String(t.id_taxonomia) === String(this.taxonomiaId)) : null;
                        if (taxRec) currentUnidadId = taxRec.id_unidad_negocio;
                    }

                    if (currentUnidadId) {
                        if (typeof tempTx.setValidatedValue === 'function') {
                            tempTx.setValidatedValue(currentUnidadId);
                        } else {
                            tempTx.value = currentUnidadId;
                        }
                    }

                    tempTx.addEventListener('txChange', (ev) => {
                        ev.stopPropagation(); // Prevenir propagación al stepper principal
                        const payloadVal = ev.detail ? ev.detail.value : null;
                        const selectedId = typeof payloadVal === 'object' && payloadVal !== null ? (payloadVal.id_registro || payloadVal.id_unidad_negocio || payloadVal.id) : (payloadVal || '');
                        if (selectedId !== undefined) {
                            // Sincronizar silenciosamente el campo de la taxonomía con la selección
                            let mainInput = document.querySelector('form#dynamicForm_Taxonomia [data-form-component="id_unidad_negocio"], form#dynamicForm_Taxonomia [name="id_unidad_negocio"]');
                            if (!mainInput) mainInput = document.querySelector('[data-form-component="id_unidad_negocio"], [name="id_unidad_negocio"]');
                            if (mainInput) {
                                if (mainInput.tagName.toLowerCase() === 'tx-searchable') {
                                    if (typeof mainInput.setValidatedValue === 'function') {
                                        mainInput.setValidatedValue(selectedId);
                                    } else {
                                        mainInput._selectedState = selectedId;
                                    }
                                    if (typeof mainInput.dispatchSelection === 'function') {
                                        mainInput.dispatchSelection();
                                    }
                                } else {
                                    mainInput.value = selectedId || '';
                                    mainInput.dispatchEvent(new Event('ionChange', { bubbles: true }));
                                    mainInput.dispatchEvent(new Event('change', { bubbles: true }));
                                }
                                // Forzar el repintado del canvas y guardado silencioso para persistir relación
                                const btnSubmit = document.querySelector('form#dynamicForm_Taxonomia button[type="submit"]');
                                if (btnSubmit && btnSubmit._formSubmitterInstance) {
                                    btnSubmit._formSubmitterInstance.executeSave({ isSilent: true }).then(() => {
                                        if (typeof window.UI_View_SwimlaneGrid !== 'undefined' && typeof window.UI_View_SwimlaneGrid.refresh === 'function') {
                                            window.UI_View_SwimlaneGrid.refresh();
                                        }
                                    });
                                } else {
                                    if (typeof window.UI_View_SwimlaneGrid !== 'undefined' && typeof window.UI_View_SwimlaneGrid.refresh === 'function') {
                                        window.UI_View_SwimlaneGrid.refresh();
                                    }
                                }

                                // Auto-cerrar el custom drawer de selección
                                if (window.DrawerStackController && window.DrawerStackController.getDepth() > 0) {
                                    window.DrawerStackController.closeTop();
                                }
                            } else {
                                console.warn('[Canvas] No se encontró el input principal para sincronizar.');
                            }
                        }
                    });
                }
            }, 300);
        } else {
            console.warn('[Canvas] DrawerStackController no está disponible.');
        }
    },

    _buildCanvas: function(rootContainer) {
        console.log("[Canvas Debug] _buildCanvas TRIGGERED! rootContainer exists.");
        if (!window.DataStore) {
            rootContainer.innerHTML = '<div class="tax-canvas-empty"><ion-icon name="warning"></ion-icon><h3>Error de Estado</h3><p>DataStore no inicializado.</p></div>';
            return;
        }

        // ESPECTADOR REACTIVO (S54.5): Leer valores borradores del DOM si estamos en el Wizard
        let edges = window.DataStore.get('Sys_Graph_Edges') || [];
        edges = [...edges]; // Clonar para no mutar el DataStore original
        
        let currentUnidadId = null;
        let input = document.querySelector('form#dynamicForm_Taxonomia [data-form-component="id_unidad_negocio"], form#dynamicForm_Taxonomia [name="id_unidad_negocio"]');
        if (!input) input = document.querySelector('[data-form-component="id_unidad_negocio"], [name="id_unidad_negocio"]');
        
        if (input) {
            currentUnidadId = typeof input.getValidatedValue === 'function' ? input.getValidatedValue() : input.value;
        }

        if (!currentUnidadId || String(currentUnidadId).trim() === '') {
            if (window.DataStore && this.taxonomiaId) {
                const taxDS = window.DataStore.get('Taxonomia') || [];
                const taxRec = taxDS.find(t => String(t.id_taxonomia) === String(this.taxonomiaId) || String(t.id_registro) === String(this.taxonomiaId));
                if (taxRec && taxRec.id_unidad_negocio) {
                    currentUnidadId = taxRec.id_unidad_negocio;
                }
            }
        }

        if (currentUnidadId && String(currentUnidadId).trim() !== '') {
            edges.push({
                id_nodo_padre: currentUnidadId,
                id_nodo_hijo: this.taxonomiaId,
                tipo_relacion: 'TAXONOMIA_UNIDAD',
                es_version_actual: 'true',
                contexto_id: this.taxonomiaId
            });
        }

        // 2. Extraer aristas de los formularios hijos en los Drawers de forma optimista (Config-Driven)
        const edgeExtractors = [
            { component: 'portafolios_vinculados', parentField: 'id_unidad_negocio', edgeType: 'UNIDAD_NEGOCIO_PORTAFOLIO', fallbackParent: currentUnidadId },
            { component: 'value_streams_vinculados', parentField: 'id_portafolio', edgeType: 'PORTAFOLIO_VALUE_STREAM' },
            { component: 'grupos_productos_vinculados', parentField: 'id_value_stream', edgeType: 'VALUE_STREAM_GRUPO_PRODUCTO' },
            { component: 'dominios_vinculados', parentField: 'id_value_stream', edgeType: 'VALUE_STREAM_DOMINIO' },
            { component: 'equipos_asignados', parentField: 'id_grupo_producto', edgeType: 'GRUPO_PRODUCTO_EQUIPO' },
            { component: 'equipos_asignados', parentField: 'id_dominio', edgeType: 'DOMINIO_EQUIPO' }
        ];

        edgeExtractors.forEach(cfg => {
            const forms = document.querySelectorAll(`[data-form-component="${cfg.component}"]`);
            let processed = new Set();
            
            forms.forEach(node => {
                const formContainer = node.closest('ion-content, .drawer-content, #wizard-col-right');
                if (!formContainer) return;
                
                const pkInput = formContainer.querySelector(`[name="${cfg.parentField}"]`);
                const parentId = (pkInput && pkInput.value) ? pkInput.value : cfg.fallbackParent;
                if (!parentId || processed.has(parentId)) return;
                processed.add(parentId);
                
                const edgeInput = formContainer.querySelector(`[data-form-component="${cfg.component}"]`);
                if (edgeInput && typeof edgeInput.getValidatedValue === 'function') {
                    const val = edgeInput.getValidatedValue();
                    
                    // La UI es la fuente de verdad. Limpiamos aristas cacheadas para este padre.
                    edges = edges.filter(e => !(e.tipo_relacion === cfg.edgeType && String(e.id_nodo_padre).trim() === String(parentId).trim()));
                    
                    if (val) {
                        const arr = Array.isArray(val) ? val : [val];
                        arr.forEach(childId => {
                            if (childId) {
                                edges.push({
                                    id_nodo_padre: String(parentId),
                                    id_nodo_hijo: String(childId),
                                    tipo_relacion: cfg.edgeType,
                                    es_version_actual: 'true',
                                    estado: 'Activo',
                                    contexto_id: String(this.taxonomiaId)
                                });
                            }
                        });
                    }
                }
            });
        });

        // 1. Encontrar la Unidad de Negocio Raíz (Arista TAXONOMIA_UNIDAD)
        const rootEdge = edges.find(e => 
            String(e.id_nodo_hijo) === String(this.taxonomiaId) && 
            e.tipo_relacion === 'TAXONOMIA_UNIDAD' &&
            String(e.es_version_actual).toLowerCase() === 'true'
        );

        if (!rootEdge) {
            rootContainer.innerHTML = `
                <div class="tax-canvas-empty" style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem;">
                    <div style="width: 250px; height: 120px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                        <ion-icon name="business-outline" style="font-size: 32px; color: var(--ion-color-step-400, #aaa); margin-bottom: 8px;"></ion-icon>
                        <div style="width: 60%; height: 8px; background: var(--ion-color-step-200, #ddd); border-radius: 4px; margin-bottom: 6px;"></div>
                        <div style="width: 40%; height: 8px; background: var(--ion-color-step-200, #ddd); border-radius: 4px;"></div>
                    </div>
                    <h3 style="color: var(--ion-color-dark); margin: 0 0 8px 0; font-weight: 600;">Lienzo Vacío</h3>
                    <p style="color: var(--ion-color-medium); text-align: center; max-width: 300px; margin: 0 0 24px 0; font-size: 0.95rem;">Agrega una Unidad de Negocio para comenzar a diseñar tu jerarquía.</p>
                    <button id="btn-add-root-unit" style="width: 56px; height: 56px; border-radius: 50%; background: var(--ion-color-primary, #3880ff); border: none; display: flex; justify-content: center; align-items: center; cursor: pointer; box-shadow: 0 4px 10px rgba(56, 128, 255, 0.4); transition: transform 0.2s ease;">
                        <ion-icon name="add-outline" style="font-size: 32px; color: #ffffff; display: block;"></ion-icon>
                    </button>
                </div>
            `;
            
            setTimeout(() => {
                const btn = rootContainer.querySelector('#btn-add-root-unit');
                if (btn) {
                    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
                    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this._openCustomUnidadDrawer();
                    });
                }
            }, 50);
            return;
        }

        const unidadNegocioId = rootEdge.id_nodo_padre;
        
        // 2. Extraer aristas contextuales de esta taxonomía
        const contextEdges = edges.filter(e => 
            String(e.contexto_id).trim() === String(this.taxonomiaId).trim() && 
            String(e.es_version_actual).toLowerCase() === 'true'
        );

        // 3. Obtener portafolios hijos de la Unidad de Negocio
        const portafolioEdges = contextEdges.filter(e => 
            e.tipo_relacion === 'UNIDAD_NEGOCIO_PORTAFOLIO' && 
            String(e.id_nodo_padre).trim() === String(unidadNegocioId).trim()
        );
        
        console.log("[Canvas Debug] Rendering Info:", {
            unidadNegocioId, 
            taxonomiaId: this.taxonomiaId, 
            contextEdgesCount: contextEdges.length, 
            portafolioEdgesCount: portafolioEdges.length,
            portafolioEdges_dump: portafolioEdges
        });
        
        // Iniciar render
        window.DOM.clear(rootContainer);
        
        const canvasDiv = document.createElement('div');
        canvasDiv.className = 'tax-canvas-container';

        // Nivel 1: Unidad de Negocio
        const rowUnidad = document.createElement('div');
        rowUnidad.className = 'tax-swimlane-row';
        
        rowUnidad.appendChild(this._createNodeEl(unidadNegocioId, 'Unidad_Negocio', 'Añadir Portafolio'));

        // Si hay portafolios, crear el contenedor horizontal
        if (portafolioEdges.length > 0) {
            const hContainer = document.createElement('div');
            hContainer.className = 'tax-swimlane-children-horizontal';

            portafolioEdges.forEach(pEdge => {
                const portafolioId = pEdge.id_nodo_hijo;
                const vCol = document.createElement('div');
                vCol.className = 'tax-swimlane-children-vertical';
                
                vCol.appendChild(this._createNodeEl(portafolioId, 'Portafolio', 'Añadir Value Stream'));

                // Nivel 3: Value Streams
                const valueStreamEdges = contextEdges.filter(e => 
                    e.tipo_relacion === 'PORTAFOLIO_VALUE_STREAM' && 
                    String(e.id_nodo_padre).trim() === String(portafolioId).trim()
                );

                if (valueStreamEdges.length > 0) {
                    const vsHorizontalContainer = document.createElement('div');
                    vsHorizontalContainer.className = 'tax-swimlane-value-streams';

                    valueStreamEdges.forEach(vsEdge => {
                        const vsId = vsEdge.id_nodo_hijo;
                        const vsCol = document.createElement('div');
                        vsCol.className = 'tax-swimlane-row';
                        vsCol.style.flex = '1 0 auto'; // Expand to fit inner containers instead of shrinking
                        vsCol.style.minWidth = '280px';
                        
                        vsCol.appendChild(this._createNodeEl(vsId, 'Value_Stream', 'Editar Value Stream'));

                        const vsChildrenWrapper = document.createElement('div');
                        vsChildrenWrapper.style.display = 'flex';
                        vsChildrenWrapper.style.flexDirection = 'column';
                        vsChildrenWrapper.style.gap = '24px';
                        vsChildrenWrapper.style.marginTop = '16px';
                        vsChildrenWrapper.style.flexWrap = 'nowrap';
                        vsChildrenWrapper.style.alignItems = 'stretch';
                        vsChildrenWrapper.style.minWidth = 'max-content';

                        // Nivel 4a: Grupos de Productos

                        const grupoEdges = contextEdges.filter(e => 
                            e.tipo_relacion === 'VALUE_STREAM_GRUPO_PRODUCTO' && 
                            String(e.id_nodo_padre).trim() === String(vsId).trim()
                        );

                        if (grupoEdges.length > 0) {
                            const gpContainer = document.createElement('div');
                            gpContainer.className = 'tax-swimlane-grupo-productos-wrapper';
                            gpContainer.style.display = 'flex';
                            gpContainer.style.flexDirection = 'column';
                            gpContainer.style.flex = '1 0 auto'; // Grow to fill but don't shrink below content
                            gpContainer.style.padding = '12px';
                            gpContainer.style.background = 'rgba(11, 20, 58, 0.05)';
                            gpContainer.style.border = '1px solid rgba(11, 20, 58, 0.2)';
                            gpContainer.style.borderRadius = '8px';
                            gpContainer.style.minWidth = 'max-content';

                            const gpLabel = document.createElement('div');
                            gpLabel.innerText = 'Grupos de Producto:';
                            gpLabel.style.fontSize = '0.75rem';
                            gpLabel.style.textTransform = 'uppercase';
                            gpLabel.style.fontWeight = 'bold';
                            gpLabel.style.marginBottom = '12px';
                            gpLabel.style.color = 'rgba(11, 20, 58, 1)'; // Match the dark blue color
                            gpContainer.appendChild(gpLabel);

                            const gpItemsFlex = document.createElement('div');
                            gpItemsFlex.className = 'tax-swimlane-grupo-productos';
                            gpItemsFlex.style.display = 'flex';
                            gpItemsFlex.style.flexDirection = 'row';
                            gpItemsFlex.style.gap = '16px';
                            gpItemsFlex.style.flexWrap = 'nowrap';
                            gpItemsFlex.style.overflow = 'visible'; // allow canvas to grow instead of inner scroll
                            gpItemsFlex.style.paddingBottom = '8px';

                            grupoEdges.forEach(gEdge => {
                                const gpNodeId = gEdge.id_nodo_hijo;
                                const gpWrapper = document.createElement('div');
                                gpWrapper.style.display = 'flex';
                                gpWrapper.style.flexDirection = 'column';
                                gpWrapper.style.gap = '8px';
                                gpWrapper.style.minWidth = '320px';
                                gpWrapper.style.flex = '1 1 0%'; // Grow and shrink equally based on available space

                                gpWrapper.appendChild(this._createNodeEl(gpNodeId, 'Grupo_Productos', 'Añadir Equipo'));

                                // Nivel 5: Equipos (Productos)
                                const equipoEdges = contextEdges.filter(e => 
                                    e.tipo_relacion === 'GRUPO_PRODUCTO_PRODUCTO' && 
                                    String(e.id_nodo_padre).trim() === String(gpNodeId).trim()
                                );

                                if (equipoEdges.length > 0) {
                                    const toggleId = 'col-prod-' + String(gpNodeId).replace(/[^a-zA-Z0-9]/g, '');
                                    
                                    // Resolver nombres para el resumen
                                    const records = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData 
                                        ? window.UI_FormUtils.fetchContextualData('Producto', this.taxonomiaId)
                                        : (window.DataStore ? window.DataStore.get('Producto') || [] : []);
                                    const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey('Producto') : 'id';
                                    const titleField = window.APP_SCHEMAS && window.APP_SCHEMAS['Producto'] && window.APP_SCHEMAS['Producto'].metadata ? window.APP_SCHEMAS['Producto'].metadata.titleField : 'nombre';
                                    
                                    const productNames = equipoEdges.map(eqEdge => {
                                        const r = records.find(rec => String(rec[pkField]) === String(eqEdge.id_nodo_hijo));
                                        return r && r[titleField] ? r[titleField] : eqEdge.id_nodo_hijo;
                                    }).join(', ');

                                    const toggleContainer = document.createElement('div');
                                    toggleContainer.style.width = '100%';
                                    toggleContainer.innerHTML = `
                                        <div onclick="const e = document.getElementById('${toggleId}'); const isH = e.style.display === 'none'; e.style.display = isH ? 'flex' : 'none'; this.querySelector('ion-icon').name = isH ? 'chevron-up-outline' : 'chevron-down-outline'; this.querySelector('.prod-summary').style.display = isH ? 'none' : '-webkit-box'; event.stopPropagation();" 
                                             style="cursor: pointer; display: flex; flex-direction: column; gap: 6px; padding: 10px; background: rgba(0,0,0,0.03); border-radius: 6px; border: 1px solid rgba(0,0,0,0.08); margin-left: 20px; width: calc(100% - 20px); margin-top: 8px;">
                                            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; font-size: 0.75rem; color: var(--ion-color-medium); font-weight: 600;">
                                                <span>Ver Productos (${equipoEdges.length})</span>
                                                <ion-icon name="chevron-down-outline" style="font-size: 1.1rem;"></ion-icon>
                                            </div>
                                            <div class="prod-summary" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.7rem; color: var(--ion-color-step-600, #666); font-weight: 500; line-height: 1.3;">
                                                ${productNames}
                                            </div>
                                        </div>
                                    `;
                                    gpWrapper.appendChild(toggleContainer);

                                    const eqContainer = document.createElement('div');
                                    eqContainer.id = toggleId;
                                    eqContainer.className = 'tax-swimlane-productos';
                                    eqContainer.style.display = 'none'; // Iniciar colapsado
                                    eqContainer.style.flexDirection = 'column';
                                    eqContainer.style.gap = '8px';
                                    eqContainer.style.marginLeft = '20px';
                                    eqContainer.style.marginTop = '8px';

                                    equipoEdges.forEach(eqEdge => {
                                        eqContainer.appendChild(this._createNodeEl(eqEdge.id_nodo_hijo, 'Producto', 'Ver Producto'));
                                    });
                                    gpWrapper.appendChild(eqContainer);
                                } else {
                                    // Empty State Onboarding para Productos
                                    const emptyState = document.createElement('div');
                                    emptyState.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem 1rem; margin-top: 8px; margin-left: 20px; width: calc(100% - 20px); border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden;';
                                    
                                    emptyState.innerHTML = `
                                        <div style="width: 80px; height: 45px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; margin-bottom: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                                            <ion-icon name="cube-outline" style="font-size: 24px; color: var(--ion-color-step-400, #aaa); margin-bottom: 4px;"></ion-icon>
                                            <div style="width: 40%; height: 4px; background: var(--ion-color-step-200, #ddd); border-radius: 2px;"></div>
                                        </div>
                                        
                                        <h3 style="color: var(--ion-color-dark); margin: 0 0 4px 0; font-weight: 600; font-size: 0.9rem; letter-spacing: -0.01em; text-align: center;">Sin Productos</h3>
                                        <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 180px; margin: 0 0 12px 0; font-size: 0.8rem; line-height: 1.3;">
                                            Vincula un nuevo registro.
                                        </p>
                                    `;
                                    const btnAdd = document.createElement('button');
                                    btnAdd.className = 'tax-add-btn';
                                    btnAdd.style.position = 'relative';
                                    btnAdd.style.right = 'auto';
                                    btnAdd.style.top = 'auto';
                                    btnAdd.style.transform = 'none';
                                    btnAdd.style.margin = '0 auto';
                                    btnAdd.style.backgroundColor = 'var(--ion-color-primary, #3880ff)';
                                    btnAdd.style.color = '#ffffff';
                                    btnAdd.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                    btnAdd.title = 'Añadir Producto';
                                    btnAdd.innerHTML = '+';
                                    btnAdd.onclick = (e) => {
                                        e.stopPropagation();
                                        this._handleNodeAdd(gpNodeId, 'Grupo_Productos', e);
                                    };
                                    emptyState.appendChild(btnAdd);
                                    
                                    gpWrapper.appendChild(emptyState);
                                }

                                gpItemsFlex.appendChild(gpWrapper);
                            });
                            gpContainer.appendChild(gpItemsFlex);
                            vsChildrenWrapper.appendChild(gpContainer);
                        }
                        // Nivel 4b: Dominios

                        const dominioEdges = contextEdges.filter(e => 
                            e.tipo_relacion === 'VALUE_STREAM_DOMINIO' && 
                            String(e.id_nodo_padre).trim() === String(vsId).trim()
                        );

                        if (dominioEdges.length > 0) {
                            const domContainer = document.createElement('div');
                            domContainer.className = 'tax-swimlane-dominios';
                            domContainer.style.display = 'flex';
                            domContainer.style.flexDirection = 'column';
                            domContainer.style.flex = '1 0 auto'; // Grow to fill but don't shrink below content
                            domContainer.style.padding = '12px';
                            domContainer.style.background = 'rgba(45, 211, 111, 0.05)';
                            domContainer.style.border = '1px solid rgba(45, 211, 111, 0.2)';
                            domContainer.style.borderRadius = '8px';
                            domContainer.style.minWidth = 'max-content';
                            
                            const domLabel = document.createElement('div');
                            domLabel.innerText = 'Dominios:';
                            domLabel.style.fontSize = '0.75rem';
                            domLabel.style.textTransform = 'uppercase';
                            domLabel.style.fontWeight = 'bold';
                            domLabel.style.marginBottom = '6px';
                            domLabel.style.color = 'var(--ion-color-success)';
                            domContainer.appendChild(domLabel);

                            const domItemsFlex = document.createElement('div');
                            domItemsFlex.className = 'tax-swimlane-dominios-items';
                            domItemsFlex.style.display = 'flex';
                            domItemsFlex.style.flexDirection = 'row';
                            domItemsFlex.style.gap = '16px';
                            domItemsFlex.style.flexWrap = 'nowrap';
                            domItemsFlex.style.overflow = 'visible'; // allow canvas to grow instead of inner scroll
                            domItemsFlex.style.paddingBottom = '8px';

                            dominioEdges.forEach(dEdge => {
                                const domNodeId = dEdge.id_nodo_hijo;
                                
                                const domWrapper = document.createElement('div');
                                domWrapper.style.display = 'flex';
                                domWrapper.style.flexDirection = 'column';
                                domWrapper.style.gap = '8px';
                                domWrapper.style.minWidth = '320px';
                                domWrapper.style.flex = '1 1 0%'; // Grow and shrink equally based on available space
                                domWrapper.style.marginBottom = '8px';

                                domWrapper.appendChild(this._createNodeEl(domNodeId, 'Dominio', 'Añadir Equipo'));

                                // Nivel 5: Equipos de Dominio
                                if (this.viewMode !== 'ESTRUCTURA') {
                                    const equipoEdges = contextEdges.filter(e => 
                                        e.tipo_relacion === 'DOMINIO_EQUIPO' && 
                                        String(e.id_nodo_padre).trim() === String(domNodeId).trim()
                                    );

                                    if (equipoEdges.length > 0) {
                                        const eqContainer = document.createElement('div');
                                        eqContainer.className = 'tax-swimlane-equipos';
                                        eqContainer.style.display = 'flex';
                                        eqContainer.style.flexDirection = 'column';
                                        eqContainer.style.gap = '8px';
                                        eqContainer.style.marginLeft = '20px';

                                        equipoEdges.forEach(eqEdge => {
                                            eqContainer.appendChild(this._createNodeEl(eqEdge.id_nodo_hijo, 'Equipo', 'Ver Equipo'));
                                        });
                                        domWrapper.appendChild(eqContainer);
                                    } else {
                                        // Empty State Onboarding para Equipos
                                        const emptyState = document.createElement('div');
                                        emptyState.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem 1rem; margin-top: 8px; margin-left: 20px; width: calc(100% - 20px); border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden;';
                                        
                                        emptyState.innerHTML = `
                                            <div style="width: 80px; height: 45px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; margin-bottom: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                                                <ion-icon name="people-outline" style="font-size: 24px; color: var(--ion-color-step-400, #aaa); margin-bottom: 4px;"></ion-icon>
                                                <div style="width: 40%; height: 4px; background: var(--ion-color-step-200, #ddd); border-radius: 2px;"></div>
                                            </div>
                                            
                                            <h3 style="color: var(--ion-color-dark); margin: 0 0 4px 0; font-weight: 600; font-size: 0.9rem; letter-spacing: -0.01em; text-align: center;">Sin Equipos</h3>
                                            <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 180px; margin: 0 0 12px 0; font-size: 0.8rem; line-height: 1.3;">
                                                Vincula un nuevo registro.
                                            </p>
                                        `;
                                        
                                        const btnAdd = document.createElement('button');
                                        btnAdd.className = 'tax-add-btn';
                                        btnAdd.style.position = 'relative';
                                        btnAdd.style.right = 'auto';
                                        btnAdd.style.top = 'auto';
                                        btnAdd.style.transform = 'none';
                                        btnAdd.style.margin = '0 auto';
                                        btnAdd.style.backgroundColor = 'var(--ion-color-primary, #3880ff)';
                                        btnAdd.style.color = '#ffffff';
                                        btnAdd.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                        btnAdd.title = 'Añadir Equipo';
                                        btnAdd.innerHTML = '+';
                                        btnAdd.onclick = (e) => {
                                            e.stopPropagation();
                                            this._handleNodeAdd(domNodeId, 'Dominio', e);
                                        };
                                        emptyState.appendChild(btnAdd);
                                        
                                        domWrapper.appendChild(emptyState);
                                    }
                                }
                                domItemsFlex.appendChild(domWrapper);
                            });
                            domContainer.appendChild(domItemsFlex);
                            vsChildrenWrapper.appendChild(domContainer);
                        }

                        if (grupoEdges.length === 0 && dominioEdges.length === 0) {
                            // S53: Empty State Onboarding Dual (Grupo de Productos / Dominios)
                            // El contenedor superior (vsChildrenWrapper) los pondrá lado a lado gracias a flex-direction: row
                            vsChildrenWrapper.style.width = '100%';

                            // 1. Empty State: Grupo de Productos
                            const emptyStateGP = document.createElement('div');
                            emptyStateGP.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden; flex: 1 1 50%; min-width: 250px;';
                            
                            emptyStateGP.innerHTML = `
                                <div style="width: 110px; height: 60px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                                    <ion-icon name="layers-outline" style="font-size: 28px; color: var(--ion-color-step-400, #aaa); margin-bottom: 6px;"></ion-icon>
                                    <div style="width: 50%; height: 5px; background: var(--ion-color-step-200, #ddd); border-radius: 3px;"></div>
                                </div>
                                
                                <h3 style="color: var(--ion-color-dark); margin: 0 0 6px 0; font-weight: 600; font-size: 1rem; letter-spacing: -0.01em; text-align: center;">Sin Grupos de Producto</h3>
                                <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 220px; margin: 0 0 16px 0; font-size: 0.85rem; line-height: 1.4;">
                                    Vincula un nuevo registro.
                                </p>
                            `;
                            const btnAddGP = document.createElement('button');
                            btnAddGP.className = 'tax-add-btn';
                            btnAddGP.style.position = 'relative';
                            btnAddGP.style.right = 'auto';
                            btnAddGP.style.top = 'auto';
                            btnAddGP.style.transform = 'none';
                            btnAddGP.style.margin = '0 auto';
                            btnAddGP.style.backgroundColor = 'var(--ion-color-primary, #3880ff)';
                            btnAddGP.style.color = '#ffffff';
                            btnAddGP.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            btnAddGP.title = 'Añadir Grupo de Productos';
                            btnAddGP.innerHTML = '+';
                            btnAddGP.onclick = (e) => {
                                e.stopPropagation();
                                this._handleNodeAdd(vsId, 'Value_Stream', e);
                            };
                            emptyStateGP.appendChild(btnAddGP);
                            vsChildrenWrapper.appendChild(emptyStateGP);

                            // 2. Empty State: Dominio
                            const emptyStateDom = document.createElement('div');
                            emptyStateDom.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden; flex: 1 1 50%; min-width: 250px;';
                            
                            emptyStateDom.innerHTML = `
                                <div style="width: 110px; height: 60px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                                    <ion-icon name="globe-outline" style="font-size: 28px; color: var(--ion-color-step-400, #aaa); margin-bottom: 6px;"></ion-icon>
                                    <div style="width: 50%; height: 5px; background: var(--ion-color-step-200, #ddd); border-radius: 3px;"></div>
                                </div>
                                
                                <h3 style="color: var(--ion-color-dark); margin: 0 0 6px 0; font-weight: 600; font-size: 1rem; letter-spacing: -0.01em; text-align: center;">Sin Dominio</h3>
                                <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 220px; margin: 0 0 16px 0; font-size: 0.85rem; line-height: 1.4;">
                                    Vincula un nuevo registro.
                                </p>
                            `;
                            const btnAddDom = document.createElement('button');
                            btnAddDom.className = 'tax-add-btn';
                            btnAddDom.style.position = 'relative';
                            btnAddDom.style.right = 'auto';
                            btnAddDom.style.top = 'auto';
                            btnAddDom.style.transform = 'none';
                            btnAddDom.style.margin = '0 auto';
                            btnAddDom.style.backgroundColor = 'var(--ion-color-primary, #3880ff)';
                            btnAddDom.style.color = '#ffffff';
                            btnAddDom.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            btnAddDom.title = 'Añadir Dominio';
                            btnAddDom.innerHTML = '+';
                            btnAddDom.onclick = (e) => {
                                e.stopPropagation();
                                this._handleNodeAdd(vsId, 'Value_Stream', e);
                            };
                            emptyStateDom.appendChild(btnAddDom);
                            vsChildrenWrapper.appendChild(emptyStateDom);
                        }

                        vsCol.appendChild(vsChildrenWrapper);

                        vsHorizontalContainer.appendChild(vsCol);
                    });
                    vCol.appendChild(vsHorizontalContainer);
                } else {
                    // Empty State Onboarding para Value Streams
                    const emptyState = document.createElement('div');
                    emptyState.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; margin-top: 0.5rem; width: 100%; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden;';
                    
                    emptyState.innerHTML = `
                        <div style="width: 140px; height: 80px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                            <ion-icon name="swap-horizontal-outline" style="font-size: 32px; color: var(--ion-color-step-400, #aaa); margin-bottom: 8px;"></ion-icon>
                            <div style="width: 50%; height: 6px; background: var(--ion-color-step-200, #ddd); border-radius: 3px;"></div>
                        </div>
                        
                        <h3 style="color: var(--ion-color-dark); margin: 0 0 8px 0; font-weight: 600; font-size: 1.15rem; letter-spacing: -0.01em;">Siguiente paso: Agrega un Value Stream</h3>
                        <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 300px; margin: 0 0 20px 0; font-size: 0.95rem; line-height: 1.45;">
                            Vincula un nuevo registro.
                        </p>
                    `;
                    const btnAdd = document.createElement('button');
                    btnAdd.className = 'tax-add-btn';
                    btnAdd.style.position = 'relative';
                    btnAdd.style.right = 'auto';
                    btnAdd.style.top = 'auto';
                    btnAdd.style.transform = 'none';
                    btnAdd.style.margin = '0 auto';
                    btnAdd.style.backgroundColor = 'var(--ion-color-primary, #3880ff)';
                    btnAdd.style.color = '#ffffff';
                    btnAdd.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                    btnAdd.title = 'Añadir Value Stream';
                    btnAdd.innerHTML = '+';
                    btnAdd.onclick = (e) => {
                        e.stopPropagation();
                        this._handleNodeAdd(portafolioId, 'Portafolio', e);
                    };
                    emptyState.appendChild(btnAdd);
                    
                    vCol.appendChild(emptyState);
                }

                hContainer.appendChild(vCol);
            });
            rowUnidad.appendChild(hContainer);
        } else {
            // S53.x: Empty State Onboarding para Portafolios
            const emptyState = document.createElement('div');
            emptyState.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem 2rem; margin-top: 0.5rem; width: 100%; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden;';
            
            emptyState.innerHTML = `
                <div style="width: 140px; height: 80px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                    <ion-icon name="briefcase-outline" style="font-size: 32px; color: var(--ion-color-step-400, #aaa); margin-bottom: 8px;"></ion-icon>
                    <div style="width: 50%; height: 6px; background: var(--ion-color-step-200, #ddd); border-radius: 3px;"></div>
                </div>
                
                <h3 style="color: var(--ion-color-dark); margin: 0 0 8px 0; font-weight: 600; font-size: 1.15rem; letter-spacing: -0.01em;">Siguiente paso: Agrega un Portafolio</h3>
                <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 340px; margin: 0 0 20px 0; font-size: 0.95rem; line-height: 1.45;">
                    Vincula un nuevo registro.
                </p>
            `;
            const btnAdd = document.createElement('button');
            btnAdd.className = 'tax-add-btn';
            btnAdd.style.position = 'relative';
            btnAdd.style.right = 'auto';
            btnAdd.style.top = 'auto';
            btnAdd.style.transform = 'none';
            btnAdd.style.margin = '0 auto';
            btnAdd.style.backgroundColor = 'var(--ion-color-primary, #3880ff)';
            btnAdd.style.color = '#ffffff';
            btnAdd.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
            btnAdd.title = 'Añadir Portafolio';
            btnAdd.innerHTML = '+';
            btnAdd.onclick = (e) => {
                e.stopPropagation();
                this._handleNodeAdd(unidadNegocioId, 'Unidad_Negocio', e);
            };
            emptyState.appendChild(btnAdd);
            
            rowUnidad.appendChild(emptyState);
        }

        canvasDiv.appendChild(rowUnidad);
        rootContainer.appendChild(canvasDiv);

        // Crear controlador de zoom (Alternativa visual a pinch-to-zoom)
        if (!rootContainer.querySelector('.tax-zoom-ctrl')) {
            const zoomCtrl = document.createElement('div');
            zoomCtrl.className = 'tax-zoom-ctrl';
            zoomCtrl.innerHTML = `
                <button class="tax-zoom-btn" id="tax-zoom-out"><ion-icon name="remove-outline"></ion-icon></button>
                <span class="tax-zoom-label" id="tax-zoom-label">100%</span>
                <button class="tax-zoom-btn" id="tax-zoom-in"><ion-icon name="add-outline"></ion-icon></button>
            `;
            rootContainer.appendChild(zoomCtrl);
        }

        // Inicializar Miro-like Pan & Zoom
        this._initPanZoom(rootContainer, canvasDiv);
    },

    _initPanZoom: function(viewport, canvas) {
        // Guardar referencia al canvas actual (necesario cuando se recrea en silent refresh)
        this._currentCanvas = canvas;

        // Mantener estado en la instancia para persistir entre refrescos
        if (!this._transformState) {
            this._transformState = { scale: 1, translateX: 0, translateY: 0 };
        }
        
        const state = this._transformState;

        // Definir función en el contexto del objeto para que los listeners usen siempre la versión más reciente
        this._applyTransform = () => {
            if (this._currentCanvas) {
                this._currentCanvas.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
            }
            const label = document.getElementById('tax-zoom-label');
            if (label) {
                label.innerText = Math.round(state.scale * 100) + '%';
            }
        };
        
        this._zoomToCenter = (newScale) => {
            const rect = viewport.getBoundingClientRect();
            const mouseX = rect.width / 2;
            const mouseY = rect.height / 2;
            const CanvasMath = window.Math_Engine && window.Math_Engine.CanvasMath ? window.Math_Engine.CanvasMath : {
                calculateMiroZoom: (mx, my, os, ns, ox, oy) => {
                    const sr = ns / os;
                    return { translateX: mx - (mx - ox) * sr, translateY: my - (my - oy) * sr };
                }
            };
            const newTransforms = CanvasMath.calculateMiroZoom(mouseX, mouseY, state.scale, newScale, state.translateX, state.translateY);
            state.translateX = newTransforms.translateX;
            state.translateY = newTransforms.translateY;
            state.scale = newScale;
            this._applyTransform();
        };

        const btnZoomOut = document.getElementById('tax-zoom-out');
        const btnZoomIn = document.getElementById('tax-zoom-in');
        
        if (btnZoomOut) {
            btnZoomOut.onclick = (e) => {
                e.stopPropagation();
                const newScale = Math.max(0.2, state.scale - 0.15);
                this._zoomToCenter(newScale);
            };
        }
        if (btnZoomIn) {
            btnZoomIn.onclick = (e) => {
                e.stopPropagation();
                const newScale = Math.min(2.0, state.scale + 0.15);
                this._zoomToCenter(newScale);
            };
        }
        
        // Aplicar estado inicial al nuevo canvas
        this._applyTransform();

        // Evitar múltiples listeners si el viewport ya los tiene
        if (viewport._panZoomBound) return;
        viewport._panZoomBound = true;

        let isDragging = false;
        let startX, startY, initialX, initialY;

        viewport.addEventListener('mousedown', (e) => {
            // Ignorar si hace clic en un botón o nodo interactivo
            if (e.target.closest('button') || e.target.closest('.tax-node')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            initialX = state.translateX;
            initialY = state.translateY;
            viewport.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            state.translateX = initialX + dx;
            state.translateY = initialY + dy;
            if (this._applyTransform) this._applyTransform();
        });

        window.addEventListener('mouseup', () => {
            isDragging = false;
            viewport.style.cursor = 'grab';
        });

        viewport.addEventListener('wheel', (e) => {
            // Prevenir scroll nativo
            e.preventDefault();
            
            if (e.ctrlKey) {
                // Pinch to Zoom o Ctrl+Wheel
                const zoomSensitivity = 0.006; // Incrementado a 0.006 según la solicitud
                
                // Usar Motor Matemático para los cálculos
                const CanvasMath = window.Math_Engine && window.Math_Engine.CanvasMath ? window.Math_Engine.CanvasMath : {
                    clampScale: (s, dy, sens) => Math.min(Math.max(0.2, s - dy * sens), 2.0),
                    calculateMiroZoom: (mx, my, os, ns, ox, oy) => {
                        const sr = ns / os;
                        return { translateX: mx - (mx - ox) * sr, translateY: my - (my - oy) * sr };
                    }
                };

                // Límite de escala (20% a 200%)
                const newScale = CanvasMath.clampScale(state.scale, e.deltaY, zoomSensitivity);
                
                // Zoom hacia el mouse (Miro-like)
                const rect = viewport.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const newTransforms = CanvasMath.calculateMiroZoom(mouseX, mouseY, state.scale, newScale, state.translateX, state.translateY);
                
                state.translateX = newTransforms.translateX;
                state.translateY = newTransforms.translateY;
                state.scale = newScale;
            } else {
                // Pan (Normal scroll)
                state.translateX -= e.deltaX;
                state.translateY -= e.deltaY;
            }
            
            if (this._applyTransform) this._applyTransform();
        }, { passive: false });
    },

    _createNodeEl: function(recordId, entityName, addTitle) {
        const node = document.createElement('div');
        node.className = 'tax-node';
        node.style.cursor = 'pointer';
        node.onclick = (e) => {
            e.stopPropagation();
            if (entityName === 'Unidad_Negocio') {
                if (typeof this._openCustomUnidadDrawer === 'function') {
                    this._openCustomUnidadDrawer();
                }
            } else if (window.openEditForm) {
                window.openEditForm(recordId, entityName, { taxonomiaContext: this.taxonomiaId });
            }
        };
        
        // Determinar Color por Metadatos
        let bgColor = 'var(--ion-color-medium)';
        let iconName = 'cube-outline';
        const schema = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName];
        if (schema && schema.metadata) {
            bgColor = `var(--ion-color-${schema.metadata.color})`;
            iconName = schema.metadata.iconName || iconName;
        }
        
        node.style.backgroundColor = bgColor;
        
        // Obtener Nombre
        let titleText = recordId;
        let records = [];
        if (entityName === 'Taxonomia' || entityName === 'Unidad_Negocio') {
            records = window.DataStore ? window.DataStore.get(entityName) || [] : [];
        } else {
            records = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData 
                ? window.UI_FormUtils.fetchContextualData(entityName, this.taxonomiaId)
                : (window.DataStore ? window.DataStore.get(entityName) || [] : []);
        }
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id';
        const titleField = schema && schema.metadata ? schema.metadata.titleField : 'nombre';
        
        const record = records.find(r => String(r[pkField]) === String(recordId));
        if (record && record[titleField]) {
            titleText = record[titleField];
        }

        // 1. Entity Label (Singularized if possible)
        const rawLabel = schema && schema.metadata ? schema.metadata.label : entityName;
        const displayEntityName = (rawLabel || '').replace(/s$/, '').replace(/es$/, '').replace(/_/g, ' ');

        // [S45.1] Computar el total de entidades hijas vinculadas para mostrar en el header
        let childCountText = '';
        if (window.Graph_Utils && typeof window.Graph_Utils.resolveAllLinkedIds === 'function') {
            let edgeType = null;
            let childLabelSingle = '';
            let childLabelPlural = '';
            
            if (entityName === 'Unidad_Negocio') {
                edgeType = 'UNIDAD_NEGOCIO_PORTAFOLIO'; childLabelSingle = 'Portafolio'; childLabelPlural = 'Portafolios';
            } else if (entityName === 'Portafolio') {
                edgeType = 'PORTAFOLIO_VALUE_STREAM'; childLabelSingle = 'Value Stream'; childLabelPlural = 'Value Streams';
            } else if (entityName === 'Value_Stream') {
                const gpIds = window.Graph_Utils.resolveAllLinkedIds(recordId, 'VALUE_STREAM_GRUPO_PRODUCTO', this.taxonomiaId, false, 'hijo');
                const domIds = window.Graph_Utils.resolveAllLinkedIds(recordId, 'VALUE_STREAM_DOMINIO', this.taxonomiaId, false, 'hijo');
                const gpCount = gpIds ? gpIds.length : 0;
                const domCount = domIds ? domIds.length : 0;
                const gpLabel = gpCount === 1 ? 'Grupo' : 'Grupos';
                const domLabel = domCount === 1 ? 'Dominio' : 'Dominios';
                childCountText = `<span style="opacity: 0.5; font-size: 0.65rem; margin: 0 4px;">•</span><span style="text-transform: none; font-weight: 700; font-size: 0.65rem; opacity: 0.85;">${gpCount} ${gpLabel}</span><span style="opacity: 0.5; font-size: 0.65rem; margin: 0 4px;">•</span><span style="text-transform: none; font-weight: 700; font-size: 0.65rem; opacity: 0.85;">${domCount} ${domLabel}</span>`;
            } else if (entityName === 'Grupo_Productos') {
                edgeType = 'GRUPO_PRODUCTO_PRODUCTO'; childLabelSingle = 'Producto'; childLabelPlural = 'Productos';
            } else if (entityName === 'Producto') {
                edgeType = null; childLabelSingle = ''; childLabelPlural = '';
            } else if (entityName === 'Dominio') {
                edgeType = 'DOMINIO_EQUIPO'; childLabelSingle = 'Equipo'; childLabelPlural = 'Equipos';
            } else if (entityName === 'Equipo') {
                edgeType = 'PERSONA_EQUIPO'; childLabelSingle = 'Persona'; childLabelPlural = 'Personas';
            }
            
            if (edgeType) {
                // Contar sólo relaciones activas 'hijo'
                const childrenIds = window.Graph_Utils.resolveAllLinkedIds(recordId, edgeType, this.taxonomiaId, false, 'hijo');
                const count = childrenIds ? childrenIds.length : 0;
                const labelText = count === 1 ? childLabelSingle : childLabelPlural;
                childCountText = `<span style="opacity: 0.5; font-size: 0.65rem; margin: 0 4px;">•</span><span style="text-transform: none; font-weight: 700; font-size: 0.65rem; opacity: 0.85;">${count} ${labelText}</span>`;
            }
        }

        // 2. Roles
        let rolesHtml = '';
        let poRoleHtml = '';
        let collapsibleRolesHtml = '';
        let collapsibleCount = 0;
        let poIds = new Set();
        let blockedIds = new Set();

        if (schema && schema.fields && record) {
            // Primer pase: Identificar IDs bloqueados (Liderazgo)
            if (entityName === 'Equipo') {
                schema.fields.forEach(f => {
                    if (f.type === 'relation' && f.targetEntity === 'Persona' && f.name !== 'personas_asignadas') {
                        let personIds = [];
                        if (f.isTemporalGraph && f.graphEdgeType && window.Graph_Utils) {
                            const resolvedIds = window.Graph_Utils.resolveAllLinkedIds(recordId, f.graphEdgeType, this.taxonomiaId, false, f.relationType);
                            if (resolvedIds && resolvedIds.length > 0) personIds = resolvedIds;
                            else if (record[f.name]) personIds = Array.isArray(record[f.name]) ? record[f.name] : [record[f.name]];
                        } else if (record[f.name]) {
                            personIds = Array.isArray(record[f.name]) ? record[f.name] : [record[f.name]];
                        }
                        personIds.forEach(pidObj => {
                            let actualPid = (typeof pidObj === 'object' && pidObj !== null) ? (pidObj.id_registro || pidObj.id || pidObj.value) : pidObj;
                            blockedIds.add(String(actualPid));
                            const isPOField = f.label.toUpperCase().includes('DUEÑO DE PRODUCTO') || f.label.toUpperCase().includes('PRODUCT OWNER');
                            if (isPOField) poIds.add(String(actualPid));
                        });
                    }
                });
            }

            schema.fields.forEach(f => {
                if (f.hideInCanvas) return;
                
                if (f.type === 'relation' && f.targetEntity === 'Persona') {
                    let personIds = [];
                    if (f.isTemporalGraph && f.graphEdgeType && window.Graph_Utils) {
                        const resolvedIds = window.Graph_Utils.resolveAllLinkedIds(recordId, f.graphEdgeType, this.taxonomiaId, false, f.relationType);
                        if (resolvedIds && resolvedIds.length > 0) {
                            personIds = resolvedIds;
                        } else if (record[f.name]) {
                            personIds = Array.isArray(record[f.name]) ? record[f.name] : [record[f.name]];
                        }
                    } else if (record[f.name]) {
                        personIds = Array.isArray(record[f.name]) ? record[f.name] : [record[f.name]];
                    }

                    const isPO = entityName === 'Equipo' && (f.label.toUpperCase().includes('DUEÑO DE PRODUCTO') || f.label.toUpperCase().includes('PRODUCT OWNER'));

                    if (personIds.length > 0) {
                        personIds.forEach(pidObj => {
                            let actualPid = (typeof pidObj === 'object' && pidObj !== null) ? (pidObj.id_registro || pidObj.id || pidObj.value) : pidObj;
                            
                            // Evitar duplicados: Si es Development Team, ocultar a quienes ya están en otros roles de liderazgo.
                            if (entityName === 'Equipo' && f.name === 'personas_asignadas' && blockedIds.has(String(actualPid))) {
                                return;
                            }

                            let personName = record['_' + f.name + '_label'];
                            let avatarUrl = '';
                            let personCargo = '';

                            if (window.FormEngine_Resolvers && typeof window.FormEngine_Resolvers.resolveEntityRecord === 'function') {
                                const personaRec = window.FormEngine_Resolvers.resolveEntityRecord('Persona', actualPid);
                                if (personaRec) {
                                    let hasRealName = personaRec.nombre && String(personaRec.nombre).trim() !== '' && personaRec.nombre !== actualPid;
                                    if (hasRealName) {
                                        personName = personaRec.nombre + (personaRec.apellidos && personaRec.apellidos !== '---' ? ' ' + personaRec.apellidos : '');
                                    } else {
                                        personName = personaRec.correo_corporativo || personaRec.email || personaRec.correo || personName;
                                    }
                                    
                                    avatarUrl = personaRec.avatar || personaRec.foto || personaRec.url_foto || '';
                                    
                                    // Resolver el Cargo (CARGO_PERSONA es un edge temporal en el Grafo)
                                    personCargo = personaRec._id_cargo_label || personaRec.id_cargo || '';
                                    if ((!personCargo || personCargo === '') && window.Graph_Utils && this.taxonomiaId) {
                                        const cargoIds = window.Graph_Utils.resolveAllLinkedIds(actualPid, 'CARGO_PERSONA', this.taxonomiaId, false, 'padre');
                                        if (cargoIds && cargoIds.length > 0) personCargo = cargoIds[0];
                                    }
                                    
                                    if (personCargo) {
                                        let cId = Array.isArray(personCargo) ? personCargo[0] : personCargo;
                                        cId = typeof cId === 'object' && cId !== null ? (cId.id || cId.id_registro || cId.value || '') : cId;
                                        
                                        if (cId && typeof cId === 'string' && window.FormEngine_Resolvers && window.FormEngine_Resolvers.resolveEntityRecord) {
                                            const cargoRec = window.FormEngine_Resolvers.resolveEntityRecord('Cargo', cId);
                                            if (cargoRec && cargoRec.nombre) {
                                                personCargo = cargoRec.nombre;
                                            } else if (cId === personCargo && !cId.includes(' ')) {
                                                personCargo = ''; // ID no resuelto, no mostrar
                                            }
                                        }
                                    }
                                }
                            }
                            personName = personName || actualPid;
                            
                            if (!personCargo || String(personCargo).trim() === '') {
                                personCargo = 'Por Asignar';
                            }
                            
                            if (personName) {
                                let avatarHtml = avatarUrl ? 
                                    `<img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,0.2);" onerror="this.style.display='none'" />` : 
                                    `<ion-icon name="person-circle-outline" style="font-size: 2rem; flex-shrink: 0; opacity: 0.9;"></ion-icon>`;
                                    
                                let chunk = `<div style="margin-top: 6px; padding: 6px 10px; background: rgba(0,0,0,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: flex-start; gap: 10px; width: 100%; box-sizing: border-box; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.25)'" onmouseout="this.style.background='rgba(0,0,0,0.15)'" onclick="event.stopPropagation(); if(window.openEditForm) window.openEditForm('${actualPid}', 'Persona', { taxonomiaContext: '${this.taxonomiaId}' });">
                                    ${avatarHtml}
                                    <div style="display: flex; flex-direction: column; overflow: hidden; width: 100%;">
                                        <span style="font-size: 0.65rem; text-transform: uppercase; opacity: 0.85; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${f.label}</span>
                                        <span style="font-size: 0.9rem; color: rgba(255,255,255,0.95); font-weight: 600; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${personName}</span>
                                        ${personCargo ? `<span style="font-size: 0.65rem; color: rgba(255,255,255,0.7); font-weight: 500; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-top: 1px;">${personCargo}</span>` : ''}
                                    </div>
                                </div>`;

                                if (entityName === 'Equipo' && isPO) {
                                    poRoleHtml += chunk;
                                } else {
                                    collapsibleRolesHtml += chunk;
                                    collapsibleCount++;
                                }
                            }
                        });
                    } else if (f.name !== 'personas_asignadas') {
                        let chunk = `<div class="tax-role-empty" style="margin-top: 6px; padding: 6px 10px; background: rgba(0,0,0,0.08); border: 1px dashed rgba(255,255,255,0.3); border-radius: 6px; display: flex; align-items: center; justify-content: flex-start; gap: 10px; width: 100%; box-sizing: border-box; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.15)'" onmouseout="this.style.background='rgba(0,0,0,0.08)'" title="Asignar ${f.label}">
                            <div style="width: 32px; height: 32px; min-width: 32px; min-height: 32px; flex-shrink: 0; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.1);">
                                <ion-icon name="add" style="font-size: 1.4rem; color: rgba(255,255,255,0.7);"></ion-icon>
                            </div>
                            <div style="display: flex; flex-direction: column; overflow: hidden; width: 100%;">
                                <span style="font-size: 0.65rem; text-transform: uppercase; opacity: 0.7; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${f.label}</span>
                                <span style="font-size: 0.85rem; color: rgba(255,255,255,0.6); font-style: italic;">Sin asignar</span>
                                <span style="font-size: 0.65rem; color: transparent; margin-top: 1px; user-select: none;">-</span>
                            </div>
                        </div>`;
                        
                        if (entityName === 'Equipo' && isPO) {
                            poRoleHtml += chunk;
                        } else {
                            collapsibleRolesHtml += chunk;
                        }
                    }
                }
            });

            if (poRoleHtml !== '') rolesHtml += poRoleHtml;
            if (collapsibleRolesHtml !== '') {
                const toggleId = 'col-eq-' + String(recordId).replace(/[^a-zA-Z0-9]/g, '');
                rolesHtml += `
                <div style="margin-top: 8px; width: 100%;">
                    <div onclick="const e = document.getElementById('${toggleId}'); const isH = e.style.display === 'none'; e.style.display = isH ? 'flex' : 'none'; this.querySelector('ion-icon').name = isH ? 'chevron-up-outline' : 'chevron-down-outline'; event.stopPropagation();" 
                         style="cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px; background: rgba(0,0,0,0.1); border-radius: 4px; font-size: 0.75rem; color: rgba(255,255,255,0.8); font-weight: 600; border: 1px solid rgba(255,255,255,0.1);">
                        <span>Ver Integrantes (${collapsibleCount})</span>
                        <ion-icon name="chevron-down-outline"></ion-icon>
                    </div>
                    <div id="${toggleId}" style="display: none; flex-direction: column; gap: 4px; margin-top: 4px; width: 100%;">
                        ${collapsibleRolesHtml}
                    </div>
                </div>`;
            }

            if(rolesHtml !== '') {
                rolesHtml = `<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 12px; width: 100%; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px;">${rolesHtml}</div>`;
            }
        }
        
        if (this.viewMode === 'ESTRUCTURA') {
            rolesHtml = '';
        }

        // DOM Interno
        const titleWrap = document.createElement('div');
        titleWrap.className = 'tax-node-title';
        titleWrap.style.display = 'flex';
        titleWrap.style.flexDirection = 'column';
        titleWrap.style.alignItems = 'flex-start';
        titleWrap.style.justifyContent = 'center';
        titleWrap.style.width = 'calc(100% - 30px)'; // leave space for add button
        
        titleWrap.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; width: 100%;">
                <ion-icon class="tax-node-icon" style="flex-shrink: 0; font-size: 1.8rem;" name="${iconName}"></ion-icon> 
                <div style="display: flex; flex-direction: column; overflow: hidden; width: 100%;">
                    <div style="display: flex; align-items: center; width: 100%;">
                        <span style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; font-weight: 800;">${displayEntityName}</span>
                        ${childCountText}
                    </div>
                    <span style="font-size: 1.05rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${titleText}</span>
                </div>
            </div>
            ${rolesHtml}
        `;
        node.appendChild(titleWrap);

        // Botón Add (Deshabilitado explícitamente para la entidad Equipo)
        if (entityName !== 'Equipo') {
            const btnAdd = document.createElement('button');
            btnAdd.className = 'tax-add-btn';
            btnAdd.title = addTitle;
            btnAdd.innerHTML = '+';
            btnAdd.onclick = (e) => {
                e.stopPropagation();
                this._handleNodeAdd(recordId, entityName, e);
            };
            node.appendChild(btnAdd);
        }

        // Bind empty roles click handlers
        const emptyRoles = node.querySelectorAll('.tax-role-empty');
        emptyRoles.forEach(el => {
            el.onclick = (e) => {
                e.stopPropagation();
                const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id';
                const allRecords = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData
                    ? window.UI_FormUtils.fetchContextualData(entityName, this.taxonomiaId)
                    : (window.DataStore ? window.DataStore.get(entityName) || [] : []);
                const recordData = allRecords.find(r => String(r[pkField]) === String(recordId));

                if (recordData && typeof window.renderForm === 'function') {
                    window.renderForm(entityName, recordData, (res) => {
                        this.refresh();
                    }, { taxonomiaContext: this.taxonomiaId }).then(() => {
                        if (window.FormEngine_Hydrator) {
                            const container = window.currentFormDrawer || document.getElementById('app-container');
                            window.FormEngine_Hydrator(container, recordData, entityName);
                        }
                    });
                }
            };
        });

        return node;
    },

    _handleNodeAdd: function(parentId, parentEntity, ev) {
        let childEntity = '';
        let edgeType = '';
        
        if (parentEntity === 'Root_Taxonomia') {
            childEntity = 'Unidad_Negocio';
            edgeType = 'TAXONOMIA_UNIDAD';
        } else if (parentEntity === 'Unidad_Negocio') {
            childEntity = 'Portafolio';
            edgeType = 'UNIDAD_NEGOCIO_PORTAFOLIO';
        } else if (parentEntity === 'Taxonomia') {
            childEntity = 'Portafolio';
            edgeType = 'UNIDAD_NEGOCIO_PORTAFOLIO';
        } else if (parentEntity === 'Portafolio') {
            childEntity = 'Value_Stream';
            edgeType = 'PORTAFOLIO_VALUE_STREAM';
        } else if (parentEntity === 'Value_Stream') {
            childEntity = 'Grupo_Productos';
            edgeType = 'VALUE_STREAM_GRUPO_PRODUCTO';
        } else if (parentEntity === 'Grupo_Productos') {
            childEntity = 'Producto';
            edgeType = 'GRUPO_PRODUCTO_PRODUCTO';
        } else if (parentEntity === 'Dominio') {
            childEntity = 'Equipo';
            edgeType = 'DOMINIO_EQUIPO';
        } else {
            // No action needed for leaf nodes
            return;
        }

        let targetEntityToOpen = parentEntity;
        if (parentEntity === 'Root_Taxonomia') {
            targetEntityToOpen = 'Taxonomia';
        } else if (parentEntity === 'Taxonomia') {
            targetEntityToOpen = 'Unidad_Negocio';
            // parentId must be the unidad_negocio ID!
            const mainInput = document.querySelector('[name="id_unidad_negocio"]');
            if (mainInput && mainInput.value) {
                parentId = mainInput.value;
            } else {
                const taxRec = window.DataStore.get('Taxonomia').find(t => String(t.id_taxonomia) === String(this.taxonomiaId));
                if (taxRec) parentId = taxRec.id_unidad_negocio;
            }
        }

        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(targetEntityToOpen) : 'id';
        const allRecords = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData
            ? window.UI_FormUtils.fetchContextualData(targetEntityToOpen, this.taxonomiaId)
            : (window.DataStore ? window.DataStore.get(targetEntityToOpen) || [] : []);
        const recordData = allRecords.find(r => String(r[pkField]) === String(parentId));

        if (recordData && typeof window.renderForm === 'function') {
            // S53.5 Homologous Contextual Drawers
            let targetSection = null;
            if (edgeType === 'TAXONOMIA_UNIDAD') targetSection = 'Seleccionar Unidad';
            if (edgeType === 'UNIDAD_NEGOCIO_PORTAFOLIO') targetSection = 'Portafolios Vinculados';
            if (edgeType === 'PORTAFOLIO_VALUE_STREAM') targetSection = 'Value Streams Vinculados';
            if (edgeType === 'VALUE_STREAM_GRUPO_PRODUCTO') targetSection = 'Grupos de Productos';
            if (edgeType === 'VALUE_STREAM_DOMINIO') targetSection = 'Dominios Vinculados';
            if (edgeType === 'GRUPO_PRODUCTO_PRODUCTO') targetSection = 'Productos';
            if (edgeType === 'DOMINIO_EQUIPO') targetSection = 'Equipos Asignados';

            // Se invoca el Drawer Nativo de la entidad padre y se inyecta el ID de Taxonomía
            // para que UI_FormSubmitter asigne el contexto a las nuevas aristas.
            window.renderForm(targetEntityToOpen, recordData, (res) => {
                // Al presionar Guardar en el Drawer, el evento InlinePersisted dispara el repintado
                this.refresh();
            }, { taxonomiaContext: this.taxonomiaId, initialStepName: targetSection }).then(() => {
                // S53.5 BugFix: renderForm only builds the DOM. We must call Hydrator to populate input values.
                if (window.FormEngine_Hydrator) {
                    const container = window.currentFormDrawer || document.getElementById('app-container');
                    window.FormEngine_Hydrator(container, recordData, targetEntityToOpen);
                }
            });
        } else {
            console.error(`Error S53.5: No se pudo abrir el Drawer para ${targetEntityToOpen} (ID: ${parentId})`);
        }
    }
};
