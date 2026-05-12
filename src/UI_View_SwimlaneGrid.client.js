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
        const btnBack = this.container.querySelector('#tax-canvas-back');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                window.AppEventBus.publish('NAV::CHANGE', {viewType: 'dataview', payload: 'Taxonomia'});
            });
        }
        
        const btnRefresh = this.container.querySelector('#tax-canvas-refresh');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.refresh());
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
            rootContainer.innerHTML = '<div class="tax-canvas-empty"><ion-icon name="analytics-outline"></ion-icon><h3>Lienzo Vacío</h3><p>La Taxonomía no tiene una Unidad de Negocio asignada. Edítala primero.</p></div>';
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
        
        if (parentEntity === 'Unidad_Negocio') {
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

        // 2. Crear Popover
        const popover = document.createElement('ion-popover');
        popover.event = ev;
        popover.cssClass = 'tax-custom-popover';
        
        // Plantilla
        const tmpl = document.getElementById('tmpl-tax-popover');
        if (!tmpl) {
            console.error("No se encontró tmpl-tax-popover");
            return;
        }
        const contentNode = tmpl.content.cloneNode(true);
        const titleEl = contentNode.querySelector('#tax-pop-title');
        const searchEl = contentNode.querySelector('#tax-pop-search');
        const listEl = contentNode.querySelector('#tax-pop-list');
        const btnCancel = contentNode.querySelector('#tax-pop-cancel');
        const btnConfirm = contentNode.querySelector('#tax-pop-confirm');
        
        titleEl.textContent = `Vincular ${schema ? schema.metadata.label : childEntity}`;
        
        const selectedIds = new Set();
        
        const renderList = (filterText = '') => {
            listEl.innerHTML = '';
            const filtered = availableRecords.filter(r => {
                const text = String(r[titleField] || r[pkField]).toLowerCase();
                return text.includes(filterText.toLowerCase());
            });
            
            if (filtered.length === 0) {
                listEl.innerHTML = `<div class="tax-popover-empty">No hay elementos disponibles.</div>`;
                return;
            }
            
            filtered.forEach(r => {
                const idVal = String(r[pkField]);
                const item = document.createElement('ion-item');
                item.button = true;
                item.detail = false;
                
                const checkbox = document.createElement('ion-checkbox');
                checkbox.slot = 'start';
                checkbox.checked = selectedIds.has(idVal);
                checkbox.addEventListener('ionChange', (e) => {
                    if (e.detail.checked) selectedIds.add(idVal);
                    else selectedIds.delete(idVal);
                    btnConfirm.disabled = selectedIds.size === 0;
                });
                
                const label = document.createElement('ion-label');
                label.textContent = r[titleField] || idVal;
                
                item.appendChild(checkbox);
                item.appendChild(label);
                
                // Allow clicking anywhere on the item to toggle
                item.addEventListener('click', (e) => {
                    if(e.target !== checkbox) checkbox.checked = !checkbox.checked;
                });
                
                listEl.appendChild(item);
            });
        };
        
        renderList('');
        
        searchEl.addEventListener('ionInput', (e) => {
            renderList(e.target.value);
        });
        
        btnCancel.addEventListener('click', () => popover.dismiss());
        
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
                        popover.dismiss();
                        if (response.success) {
                            // Optimistic update
                            const currentEdges = window.DataStore.get('Sys_Graph_Edges') || [];
                            payload.forEach(p => {
                                // Provide a dummy stub ID
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
                        btnConfirm.textContent = 'Vincular';
                    })
                    .API_Universal({
                        action: 'commitEdges',
                        entityName: 'Sys_Graph_Edges',
                        payload: payload
                    });
            } else {
                console.warn("Entorno local detectado, simulando guardado optimista.");
                const currentEdges = window.DataStore.get('Sys_Graph_Edges') || [];
                payload.forEach(p => {
                    p.id = 'arista-stub-' + Date.now() + Math.random();
                    currentEdges.push(p);
                });
                setTimeout(() => {
                    popover.dismiss();
                    this.refresh();
                }, 500);
            }
        });
        
        popover.appendChild(contentNode);
        document.body.appendChild(popover);
        window.PresentSafe(popover);
    }
};
