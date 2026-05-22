/**
 * UI_View_SwimlaneGrid.client.js
 * 
 * Orquestador Visual: Matriz de Swimlanes para Taxonomía.
 * Lee desde el DataStore en memoria y construye un DOM de CSS Flexbox.
 */

window.UI_View_SwimlaneGrid = {
    render: function(containerElement, taxonomiaId) {
        this.container = containerElement;
        this.taxonomiaId = taxonomiaId;
        
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
            { component: 'equipos_asignados', parentField: 'id_grupo_producto', edgeType: 'GRUPO_PRODUCTO_EQUIPO' }
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
                        // Crear un Drawer nativo usando los componentes de la plataforma (UI_Factory)
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
                                    <p style="color: var(--ion-color-medium); font-size: 0.875rem;">Utilice el buscador para vincular una unidad de negocio a esta taxonomía.</p>
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

                            // FOOTER REMOVED AS REQUESTED

                            window.DrawerStackController.push(drawerNode);

                            setTimeout(() => {
                                const tempTx = drawerNode.querySelector('tx-searchable');
                                if(tempTx) {
                                    // Cargar la fuente de datos (lista de unidades de negocio)
                                    if (window.DataStore) {
                                        const ds = window.DataStore.get('Unidad_Negocio') || [];
                                        tempTx.dataSource = ds.filter(d => d.estado !== 'Eliminado');
                                    }

                                    tempTx.addEventListener('txChange', (ev) => {
                                        ev.stopPropagation(); // Prevenir propagación al stepper principal
                                        const selectedId = ev.detail ? ev.detail.value : null;
                                        if(selectedId) {
                                            // Sincronizar silenciosamente el campo de la taxonomía con la selección
                                            // Fallback robusto a nivel documento por si el id del form cambia
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
                                                    mainInput.value = selectedId;
                                                    mainInput.dispatchEvent(new Event('ionChange', { bubbles: true }));
                                                    mainInput.dispatchEvent(new Event('change', { bubbles: true }));
                                                }
                                                // Forzar el repintado del canvas
                                                if (typeof window.UI_View_SwimlaneGrid !== 'undefined' && typeof window.UI_View_SwimlaneGrid.refresh === 'function') {
                                                    window.UI_View_SwimlaneGrid.refresh();
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
                        vsCol.style.flex = '1';
                        vsCol.style.minWidth = '280px';
                        
                        vsCol.appendChild(this._createNodeEl(vsId, 'Value_Stream', 'Añadir Grupo de Producto'));

                        // Nivel 4: Grupos de Productos
                        const grupoEdges = contextEdges.filter(e => 
                            e.tipo_relacion === 'VALUE_STREAM_GRUPO_PRODUCTO' && 
                            String(e.id_nodo_padre).trim() === String(vsId).trim()
                        );

                        if (grupoEdges.length > 0) {
                            const gpContainer = document.createElement('div');
                            gpContainer.className = 'tax-swimlane-grupo-productos';

                            grupoEdges.forEach(gEdge => {
                                const gpNodeId = gEdge.id_nodo_hijo;
                                const gpWrapper = document.createElement('div');
                                gpWrapper.style.display = 'flex';
                                gpWrapper.style.flexDirection = 'column';
                                gpWrapper.style.gap = '8px';
                                gpWrapper.style.width = '100%';

                                gpWrapper.appendChild(this._createNodeEl(gpNodeId, 'Grupo_Productos', 'Añadir Equipo'));

                                // Nivel 5: Equipos
                                const equipoEdges = contextEdges.filter(e => 
                                    e.tipo_relacion === 'GRUPO_PRODUCTO_EQUIPO' && 
                                    String(e.id_nodo_padre).trim() === String(gpNodeId).trim()
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
                                    gpWrapper.appendChild(eqContainer);
                                } else {
                                    // Empty State Onboarding para Equipos
                                    const emptyState = document.createElement('div');
                                    emptyState.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 1.5rem 1rem; margin-top: 8px; margin-left: 20px; width: calc(100% - 20px); border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden;';
                                    
                                    emptyState.innerHTML = `
                                        <svg width="80" height="60" viewBox="0 0 80 60" style="position: absolute; right: 5px; top: -5px; opacity: 0.6; pointer-events: none;">
                                            <path d="M 5 50 Q 30 50, 65 15" fill="none" stroke="var(--ion-color-success, #2dd36f)" stroke-width="2.5" stroke-dasharray="4,4" stroke-linecap="round"/>
                                            <polygon points="60,21 67,11 72,21" fill="var(--ion-color-success, #2dd36f)" transform="rotate(25 67 11)" />
                                        </svg>

                                        <div style="width: 80px; height: 45px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; margin-bottom: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                                            <ion-icon name="people-outline" style="font-size: 24px; color: var(--ion-color-step-400, #aaa); margin-bottom: 4px;"></ion-icon>
                                            <div style="width: 40%; height: 4px; background: var(--ion-color-step-200, #ddd); border-radius: 2px;"></div>
                                        </div>
                                        
                                        <h3 style="color: var(--ion-color-dark); margin: 0 0 4px 0; font-weight: 600; font-size: 0.9rem; letter-spacing: -0.01em; text-align: center;">Sin Equipos</h3>
                                        <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 180px; margin: 0; font-size: 0.8rem; line-height: 1.3;">
                                            Haz clic en <strong style="color: var(--ion-color-success); font-size: 1.1em;">+</strong> arriba para agregar un equipo.
                                        </p>
                                    `;
                                    
                                    gpWrapper.appendChild(emptyState);
                                }

                                gpContainer.appendChild(gpWrapper);
                            });
                            vsCol.appendChild(gpContainer);
                        } else {
                            // Empty State Onboarding para Grupo de Productos
                            const emptyState = document.createElement('div');
                            emptyState.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; margin-top: 12px; margin-left: 20px; width: calc(100% - 20px); border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden;';
                            
                            emptyState.innerHTML = `
                                <svg width="100" height="80" viewBox="0 0 100 80" style="position: absolute; right: 10px; top: -10px; opacity: 0.6; pointer-events: none;">
                                    <path d="M 10 70 Q 50 70, 85 25" fill="none" stroke="var(--ion-color-dark, #222428)" stroke-width="2.5" stroke-dasharray="6,5" stroke-linecap="round"/>
                                    <polygon points="78,33 87,20 93,33" fill="var(--ion-color-dark, #222428)" transform="rotate(20 87 20)" />
                                </svg>

                                <div style="width: 110px; height: 60px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                                    <ion-icon name="layers-outline" style="font-size: 28px; color: var(--ion-color-step-400, #aaa); margin-bottom: 6px;"></ion-icon>
                                    <div style="width: 50%; height: 5px; background: var(--ion-color-step-200, #ddd); border-radius: 3px;"></div>
                                </div>
                                
                                <h3 style="color: var(--ion-color-dark); margin: 0 0 6px 0; font-weight: 600; font-size: 1rem; letter-spacing: -0.01em; text-align: center;">Sin Grupos de Producto</h3>
                                <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 220px; margin: 0; font-size: 0.85rem; line-height: 1.4;">
                                    Haz clic en <strong style="color: var(--ion-color-dark); font-size: 1.1em;">+</strong> arriba para agregar un grupo.
                                </p>
                            `;
                            
                            vsCol.appendChild(emptyState);
                        }

                        vsHorizontalContainer.appendChild(vsCol);
                    });
                    vCol.appendChild(vsHorizontalContainer);
                } else {
                    // Empty State Onboarding para Value Streams
                    const emptyState = document.createElement('div');
                    emptyState.style.cssText = 'position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1rem; margin-top: 0.5rem; width: 100%; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 8px; background: rgba(0,0,0,0.02); overflow: hidden;';
                    
                    emptyState.innerHTML = `
                        <svg width="120" height="100" viewBox="0 0 120 100" style="position: absolute; right: 10px; top: -10px; opacity: 0.7; pointer-events: none;">
                            <path d="M 10 90 Q 70 90, 105 30" fill="none" stroke="var(--ion-color-tertiary, #5260ff)" stroke-width="2.5" stroke-dasharray="6,5" stroke-linecap="round"/>
                            <polygon points="98,38 107,24 113,38" fill="var(--ion-color-tertiary, #5260ff)" transform="rotate(15 107 24)" />
                        </svg>

                        <div style="width: 140px; height: 80px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                            <ion-icon name="swap-horizontal-outline" style="font-size: 32px; color: var(--ion-color-step-400, #aaa); margin-bottom: 8px;"></ion-icon>
                            <div style="width: 50%; height: 6px; background: var(--ion-color-step-200, #ddd); border-radius: 3px;"></div>
                        </div>
                        
                        <h3 style="color: var(--ion-color-dark); margin: 0 0 8px 0; font-weight: 600; font-size: 1.15rem; letter-spacing: -0.01em;">Siguiente paso: Agrega un Value Stream</h3>
                        <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 300px; margin: 0; font-size: 0.95rem; line-height: 1.45;">
                            Haz clic en el botón <strong style="color: var(--ion-color-tertiary); font-size: 1.1em;">+</strong> del Portafolio para desglosarlo en flujos de valor.
                        </p>
                    `;
                    
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
                <svg width="120" height="100" viewBox="0 0 120 100" style="position: absolute; right: 20px; top: -10px; opacity: 0.7; pointer-events: none;">
                    <!-- Línea curva en onda -->
                    <path d="M 10 90 Q 70 90, 105 30" fill="none" stroke="var(--ion-color-primary, #3880ff)" stroke-width="2.5" stroke-dasharray="6,5" stroke-linecap="round"/>
                    <!-- Punta de flecha apuntando hacia arriba-derecha -->
                    <polygon points="98,38 107,24 113,38" fill="var(--ion-color-primary, #3880ff)" transform="rotate(15 107 24)" />
                </svg>

                <div style="width: 140px; height: 80px; border: 2px dashed var(--ion-color-step-300, #ccc); border-radius: 12px; margin-bottom: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.02);">
                    <ion-icon name="briefcase-outline" style="font-size: 32px; color: var(--ion-color-step-400, #aaa); margin-bottom: 8px;"></ion-icon>
                    <div style="width: 50%; height: 6px; background: var(--ion-color-step-200, #ddd); border-radius: 3px;"></div>
                </div>
                
                <h3 style="color: var(--ion-color-dark); margin: 0 0 8px 0; font-weight: 600; font-size: 1.15rem; letter-spacing: -0.01em;">Siguiente paso: Agrega un Portafolio</h3>
                <p style="color: var(--ion-color-medium, #666); text-align: center; max-width: 340px; margin: 0; font-size: 0.95rem; line-height: 1.45;">
                    Haz clic en el botón <strong style="color: var(--ion-color-primary); font-size: 1.1em;">+</strong> de la barra superior derecha para desglosar esta Unidad de Negocio.
                </p>
            `;
            
            rowUnidad.appendChild(emptyState);
        }

        canvasDiv.appendChild(rowUnidad);
        rootContainer.appendChild(canvasDiv);

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
        };
        
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
            
            const zoomSensitivity = 0.001;
            
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
            
            if (this._applyTransform) this._applyTransform();
        }, { passive: false });
    },

    _createNodeEl: function(recordId, entityName, addTitle) {
        const node = document.createElement('div');
        node.className = 'tax-node';
        
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
        const records = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData 
            ? window.UI_FormUtils.fetchContextualData(entityName, this.taxonomiaId)
            : (window.DataStore ? window.DataStore.get(entityName) || [] : []);
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id';
        const titleField = schema && schema.metadata ? schema.metadata.titleField : 'nombre';
        
        const record = records.find(r => String(r[pkField]) === String(recordId));
        if (record && record[titleField]) {
            titleText = record[titleField];
        }

        // 1. Entity Label (Singularized if possible)
        const rawLabel = schema && schema.metadata ? schema.metadata.label : entityName;
        const displayEntityName = (rawLabel || '').replace(/s$/, '').replace(/es$/, '').replace(/_/g, ' ');

        // 2. Roles
        let rolesHtml = '';
        if (schema && schema.fields && record) {
            schema.fields.forEach(f => {
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

                    if (personIds.length > 0) {
                        personIds.forEach(pidObj => {
                            let actualPid = (typeof pidObj === 'object' && pidObj !== null) ? (pidObj.id_registro || pidObj.id || pidObj.value) : pidObj;
                            let personName = record['_' + f.name + '_label'];
                            let avatarUrl = '';
                            if (window.FormEngine_Resolvers && typeof window.FormEngine_Resolvers.resolveEntityRecord === 'function') {
                                const personaRec = window.FormEngine_Resolvers.resolveEntityRecord('Persona', actualPid);
                                if (personaRec) {
                                    personName = personaRec.nombre + (personaRec.apellidos && personaRec.apellidos !== '---' ? ' ' + personaRec.apellidos : '');
                                    avatarUrl = personaRec.avatar || personaRec.foto || personaRec.url_foto || '';
                                }
                            }
                            personName = personName || actualPid;
                            
                            if (personName) {
                                let avatarHtml = avatarUrl ? 
                                    `<img src="${avatarUrl}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; flex-shrink: 0; background: rgba(255,255,255,0.2);" onerror="this.style.display='none'" />` : 
                                    `<ion-icon name="person-circle-outline" style="font-size: 2rem; flex-shrink: 0; opacity: 0.9;"></ion-icon>`;
                                    
                                rolesHtml += `<div style="margin-top: 6px; padding: 6px 10px; background: rgba(0,0,0,0.15); border-radius: 6px; display: flex; align-items: center; justify-content: flex-start; gap: 10px; width: 100%; box-sizing: border-box;">
                                    ${avatarHtml}
                                    <div style="display: flex; flex-direction: column; overflow: hidden; width: 100%;">
                                        <span style="font-size: 0.65rem; text-transform: uppercase; opacity: 0.85; font-weight: 700; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${f.label}</span>
                                        <span style="font-size: 0.9rem; color: rgba(255,255,255,0.95); font-weight: 600; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">${personName}</span>
                                    </div>
                                </div>`;
                            }
                        });
                    }
                }
            });
            if(rolesHtml !== '') {
                rolesHtml = `<div style="display: flex; flex-direction: column; gap: 4px; margin-top: 12px; width: 100%; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px;">${rolesHtml}</div>`;
            }
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
                    <span style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9; font-weight: 800;">${displayEntityName}</span>
                    <span style="font-size: 1.05rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${titleText}</span>
                </div>
            </div>
            ${rolesHtml}
        `;
        node.appendChild(titleWrap);

        // Botón Add
        const btnAdd = document.createElement('button');
        btnAdd.className = 'tax-add-btn';
        btnAdd.title = addTitle;
        btnAdd.innerHTML = '+';
        btnAdd.onclick = (e) => {
            e.stopPropagation();
            this._handleNodeAdd(recordId, entityName, e);
        };
        node.appendChild(btnAdd);

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
        } else if (parentEntity === 'Portafolio') {
            childEntity = 'Value_Stream';
            edgeType = 'PORTAFOLIO_VALUE_STREAM';
        } else if (parentEntity === 'Value_Stream') {
            childEntity = 'Grupo_Productos';
            edgeType = 'VALUE_STREAM_GRUPO_PRODUCTO';
        } else if (parentEntity === 'Grupo_Productos') {
            childEntity = 'Equipo';
            edgeType = 'GRUPO_PRODUCTO_EQUIPO';
        } else {
            // No action needed for leaf nodes
            return;
        }

        let targetEntityToOpen = parentEntity;
        if (parentEntity === 'Root_Taxonomia') {
            targetEntityToOpen = 'Taxonomia';
        }

        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(targetEntityToOpen) : 'id';
        const allRecords = window.UI_FormUtils && window.UI_FormUtils.fetchContextualData
            ? window.UI_FormUtils.fetchContextualData(targetEntityToOpen, this.taxonomiaId)
            : (window.DataStore ? window.DataStore.get(targetEntityToOpen) || [] : []);
        const recordData = allRecords.find(r => String(r[pkField]) === String(parentId));

        if (recordData && typeof window.renderForm === 'function') {
            // S53.5 Homologous Contextual Drawers
            // Se invoca el Drawer Nativo de la entidad padre y se inyecta el ID de Taxonomía
            // para que UI_FormSubmitter asigne el contexto a las nuevas aristas.
            window.renderForm(targetEntityToOpen, recordData, (res) => {
                // Al presionar Guardar en el Drawer, el evento InlinePersisted dispara el repintado
                this.refresh();
            }, { taxonomiaContext: this.taxonomiaId }).then(() => {
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
