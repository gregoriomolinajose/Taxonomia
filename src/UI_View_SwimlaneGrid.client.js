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
            e.id_nodo_padre === this.taxonomiaId && 
            e.tipo_arista === 'TAXONOMIA_UNIDAD' &&
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

        const unidadNegocioId = rootEdge.id_nodo_hijo;
        
        // 2. Extraer aristas contextuales de esta taxonomía
        const contextEdges = edges.filter(e => 
            e.contexto_id === this.taxonomiaId && 
            String(e.es_version_actual) === 'true'
        );

        // 3. Obtener portafolios hijos de la Unidad de Negocio
        const portafolioEdges = contextEdges.filter(e => 
            e.tipo_arista === 'UNIDAD_NEGOCIO_PORTAFOLIO' && 
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
                    e.tipo_arista === 'PORTAFOLIO_GRUPO_PRODUCTO' && 
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

        const schema = window.APP_SCHEMAS && window.APP_SCHEMAS[childEntity];
        const titleField = schema && schema.metadata ? schema.metadata.titleField : 'nombre';
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(childEntity) : 'id';
        
        // 1. Obtener registros válidos (excluyendo los ya vinculados a la Taxonomía bajo el mismo padre)
        const allRecords = window.DataStore ? window.DataStore.get(childEntity) || [] : [];
        const edges = window.DataStore ? window.DataStore.get('Sys_Graph_Edges') || [] : [];
        
        const linkedIds = edges
            .filter(e => e.contexto_id === this.taxonomiaId && e.tipo_arista === edgeType && e.id_nodo_padre === parentId && String(e.es_version_actual) === 'true')
            .map(e => e.id_nodo_hijo);
            
        const availableRecords = allRecords.filter(r => !linkedIds.includes(String(r[pkField])));

        // 2. Crear Drawer Panel
        const drawerNode = document.createElement('div');
        drawerNode.className = 'drawer-panel-form';
        drawerNode.style.cssText = 'display: flex; flex-direction: column; height: 100%; background: var(--color-bg-body, #ffffff);';
        
        drawerNode.innerHTML = `
            <ion-header class="ion-no-border" style="border-bottom: 1px solid var(--color-border, #e0e0e0);">
                <ion-toolbar color="light">
                    <ion-title>Vincular ${schema ? schema.metadata.label : childEntity}</ion-title>
                    <ion-buttons slot="end">
                        <ion-button id="tax-drawer-close" color="dark">
                            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                        </ion-button>
                    </ion-buttons>
                </ion-toolbar>
            </ion-header>
            <ion-content class="ion-padding" style="--background: var(--color-bg-body, #ffffff);">
                <div style="margin-bottom: 24px;">
                    <h3 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 8px;">Selecciona los registros</h3>
                    <p style="color: var(--ion-color-medium); font-size: 0.9rem; margin-top: 0;">Puedes seleccionar múltiples ${schema ? schema.metadata.label : childEntity} para vincularlos simultáneamente al lienzo.</p>
                </div>
                <div id="tax-searchable-mount"></div>
            </ion-content>
            <div class="drawer-footer" style="padding: 16px; border-top: 1px solid var(--color-border, #e0e0e0); background: var(--color-bg-body, #ffffff);">
                <ion-button id="tax-drawer-confirm" expand="block" color="primary" disabled>
                    <ion-icon slot="start" name="link-outline"></ion-icon> Vincular
                </ion-button>
            </div>
        `;

        // 3. Montar TXSearchable
        const mountPoint = drawerNode.querySelector('#tax-searchable-mount');
        const fieldDef = {
            name: 'temp_link_field',
            label: childEntity,
            targetEntity: childEntity,
            valueField: pkField,
            labelField: titleField
        };
        const metadataToken = (window.APP_SCHEMAS && window.APP_SCHEMAS[childEntity] && window.APP_SCHEMAS[childEntity].metadata) || {};
        const configParams = { iconName: metadataToken.iconName, color: metadataToken.color, contextId: this.taxonomiaId };
        
        const txSearchableNode = window.UI_Factory.buildSearchableMulti(fieldDef, availableRecords, [], null, configParams);
        mountPoint.appendChild(txSearchableNode);

        // 4. Lógica de Interacción
        const btnClose = drawerNode.querySelector('#tax-drawer-close');
        const btnConfirm = drawerNode.querySelector('#tax-drawer-confirm');
        let selectedIds = new Set();

        txSearchableNode.addEventListener('txChange', (e) => {
            const vals = e.detail.value || [];
            selectedIds = new Set(Array.isArray(vals) ? vals : [vals]);
            btnConfirm.disabled = selectedIds.size === 0;
        });

        const dismissDrawer = () => {
            if (window.DrawerStackController) {
                window.DrawerStackController.closeTop();
            } else {
                drawerNode.remove();
            }
        };

        btnClose.addEventListener('click', dismissDrawer);

        btnConfirm.addEventListener('click', () => {
            if (selectedIds.size === 0) return;
            
            btnConfirm.disabled = true;
            btnConfirm.innerHTML = '<ion-spinner name="crescent"></ion-spinner>';
            
            const payload = Array.from(selectedIds).map(childId => ({
                id_nodo_padre: parentId,
                id_nodo_hijo: childId,
                tipo_arista: edgeType,
                contexto_id: this.taxonomiaId,
                es_version_actual: true,
                metadata: { created_via: "taxonomia_canvas" }
            }));
            
            if (typeof google !== 'undefined' && google.script && google.script.run) {
                google.script.run
                    .withSuccessHandler((response) => {
                        dismissDrawer();
                        if (response.success) {
                            // Optimistic update
                            const currentEdges = window.DataStore.get('Sys_Graph_Edges') || [];
                            payload.forEach(p => {
                                p.id = 'arista-' + Math.random().toString(36).substring(2, 10);
                                currentEdges.push(p);
                            });
                            this.refresh();
                        } else {
                            console.error("Error saving edges:", response);
                        }
                    })
                    .withFailureHandler((err) => {
                        console.error("API Error:", err);
                        btnConfirm.disabled = false;
                        btnConfirm.innerHTML = '<ion-icon slot="start" name="link-outline"></ion-icon> Vincular';
                    })
                    .API_Universal_Router('commitEdges', 'Sys_Graph_Edges', payload);
            } else {
                console.warn("Entorno local detectado, simulando guardado optimista.");
                const currentEdges = window.DataStore.get('Sys_Graph_Edges') || [];
                payload.forEach(p => {
                    p.id = 'arista-stub-' + Date.now() + Math.random();
                    currentEdges.push(p);
                });
                setTimeout(() => {
                    dismissDrawer();
                    this.refresh();
                }, 500);
            }
        });

        if (window.DrawerStackController) {
            window.DrawerStackController.push(drawerNode);
        } else {
            document.body.appendChild(drawerNode); // Fallback safe
        }
    }
};
