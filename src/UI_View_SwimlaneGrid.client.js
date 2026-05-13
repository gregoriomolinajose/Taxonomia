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
        const btnRefresh = this.container.querySelector('#tax-canvas-refresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.refresh());
        }
        
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
                        window.history.replaceState({viewType: 'taxonomia-canvas', recordId: newId}, '', '');
                        this.refresh();
                    }
                }
            });
            
            this._unsubGraph = window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', () => {
                this.refresh();
            });
        }
    },
    
    refresh: function() {
        const rootContainer = this.container.querySelector('#tax-canvas-root');
        if (!rootContainer) return;
        
        rootContainer.innerHTML = '<div style="padding:40px;text-align:center;"><ion-spinner></ion-spinner><p>Construyendo lienzo...</p></div>';
        
        setTimeout(() => {
            this._buildCanvas(rootContainer);
        }, 100); // Pequeño delay para permitir el render del spinner
    },
    
    _buildCanvas: function(rootContainer) {
        if (!window.DataStore) {
            rootContainer.innerHTML = '<div class="tax-canvas-empty"><ion-icon name="warning"></ion-icon><h3>Error de Estado</h3><p>DataStore no inicializado.</p></div>';
            return;
        }

        const edges = window.DataStore.get('Sys_Graph_Edges') || [];
        
        // 1. Encontrar la Unidad de Negocio Raíz (Arista TAXONOMIA_UNIDAD)
        const rootEdge = edges.find(e => 
            String(e.id_nodo_hijo) === String(this.taxonomiaId) && 
            e.tipo_relacion === 'TAXONOMIA_UNIDAD' &&
            String(e.es_version_actual) === 'true'
        );

        if (!rootEdge) {
            rootContainer.innerHTML = `
                <div class="tax-canvas-empty">
                    <ion-icon name="analytics-outline"></ion-icon>
                    <h3>Lienzo Vacío</h3>
                    <p>Comienza vinculando la Unidad de Negocio principal de esta taxonomía.</p>
                    <ion-button id="tax-add-root-btn" color="primary" style="margin-top: 16px;">
                        <ion-icon slot="start" name="add-outline"></ion-icon> Vincular Unidad de Negocio
                    </ion-button>
                </div>
            `;
            const addRootBtn = rootContainer.querySelector('#tax-add-root-btn');
            if (addRootBtn) {
                addRootBtn.addEventListener('click', (e) => {
                    this._handleNodeAdd(this.taxonomiaId, 'Root_Taxonomia', e);
                });
            }
            return;
        }

        const unidadNegocioId = rootEdge.id_nodo_padre;
        
        // 2. Extraer aristas contextuales de esta taxonomía
        const contextEdges = edges.filter(e => 
            e.contexto_id === this.taxonomiaId && 
            String(e.es_version_actual) === 'true'
        );

        // 3. Obtener portafolios hijos de la Unidad de Negocio
        const portafolioEdges = contextEdges.filter(e => 
            e.tipo_relacion === 'UNIDAD_NEGOCIO_PORTAFOLIO' && 
            e.id_nodo_padre === unidadNegocioId
        );
        
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
                
                vCol.appendChild(this._createNodeEl(portafolioId, 'Portafolio', 'Añadir Grupo de Producto'));

                // Nivel 3: Grupos de Productos
                const grupoEdges = contextEdges.filter(e => 
                    e.tipo_relacion === 'PORTAFOLIO_GRUPO_PRODUCTO' && 
                    e.id_nodo_padre === portafolioId
                );

                if (grupoEdges.length > 0) {
                    grupoEdges.forEach(gEdge => {
                        const grupoRow = document.createElement('div');
                        grupoRow.className = 'tax-swimlane-row';
                        grupoRow.appendChild(this._createNodeEl(gEdge.id_nodo_hijo, 'Grupo_Productos', 'Añadir Producto'));
                        vCol.appendChild(grupoRow);
                    });
                }

                hContainer.appendChild(vCol);
            });

            rowUnidad.appendChild(hContainer);
        }

        canvasDiv.appendChild(rowUnidad);
        rootContainer.appendChild(canvasDiv);
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
        const records = window.DataStore ? window.DataStore.get(entityName) || [] : [];
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id';
        const titleField = schema && schema.metadata ? schema.metadata.titleField : 'nombre';
        
        const record = records.find(r => String(r[pkField]) === String(recordId));
        if (record && record[titleField]) {
            titleText = record[titleField];
        }

        // DOM Interno
        const titleWrap = document.createElement('div');
        titleWrap.className = 'tax-node-title';
        titleWrap.innerHTML = `<ion-icon class="tax-node-icon" name="${iconName}"></ion-icon> <span>${titleText}</span>`;
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
            childEntity = 'Grupo_Productos';
            edgeType = 'PORTAFOLIO_GRUPO_PRODUCTO';
        } else {
            // No action needed for leaf nodes
            return;
        }

        let targetEntityToOpen = parentEntity;
        if (parentEntity === 'Root_Taxonomia') {
            targetEntityToOpen = 'Taxonomia';
        }

        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(targetEntityToOpen) : 'id';
        const allRecords = window.DataStore ? window.DataStore.get(targetEntityToOpen) || [] : [];
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
