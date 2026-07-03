/* ============================================================
   UI_View_ValueStreamCanvas.client.js
   Motor gráfico dedicado a renderizar el Value Stream Map
   utilizando nodos secuenciales en formato Chevron.
   ============================================================ */

window.UI_View_ValueStreamCanvas = {
    state: {
        contextId: null,
        explicitTaxonomiaContext: null,
        data: [] // Pasos del Value Stream
    },

    buildModal: async function(contextId, explicitTaxonomiaContext) {
        if (typeof window.UI_Factory === 'undefined') {
            console.error('UI_Factory not loaded');
        }

        const loading = document.createElement('ion-loading');
        loading.message = 'Cargando motor de lienzo...';
        document.body.appendChild(loading);
        await window.PresentSafe(loading);

        if (window.DrawerStackController && window.DrawerStackController.buildFullscreenCanvas) {
            const titleHtml = `<span style="font-weight: 600; color: var(--ion-color-step-800);"><ion-icon name="swap-horizontal" style="vertical-align: middle; margin-right: 8px; color: var(--ion-color-primary);"></ion-icon> Lienzo de Value Stream</span> <span style="font-size: 0.8rem; color: var(--ion-color-medium); font-weight: 400; margin-left: 8px;">(${contextId})</span>`;
            
            window.DrawerStackController.buildFullscreenCanvas(titleHtml, (contentEl, drawerNode) => {
                drawerNode.classList.add('canvas-drawer-vs'); // Add specific class
                
                const canvasContainer = document.createElement('div');
                canvasContainer.id = 'vs-canvas-container';
                canvasContainer.style.width = '100%';
                canvasContainer.style.height = '100%';
                canvasContainer.style.display = 'flex';
                canvasContainer.style.flexDirection = 'column';
                canvasContainer.style.overflow = 'hidden';
                canvasContainer.style.position = 'relative';
                
                this.buildCanvas(canvasContainer, contextId, explicitTaxonomiaContext);
                contentEl.appendChild(canvasContainer);
            });
        } else {
            console.error('DrawerStackController.buildFullscreenCanvas not found');
        }
        
        await loading.dismiss();
    },

    buildCanvas: function(container, contextId, explicitTaxonomiaContext) {
        this.state.contextId = contextId;
        this.state.explicitTaxonomiaContext = explicitTaxonomiaContext;
        
        // Barra de herramientas interna del Canvas
        const toolbar = document.createElement('div');
        toolbar.className = 'vs-canvas-toolbar';
        toolbar.style.cssText = `
            padding: 12px 24px;
            background: #fff;
            border-bottom: 1px solid var(--ion-color-step-150, #e2e8f0);
            display: flex;
            gap: 12px;
            align-items: center;
        `;
        
        const btnAddStep = document.createElement('button');
        btnAddStep.className = 'dv-btn-primary';
        btnAddStep.innerHTML = '<ion-icon name="add"></ion-icon> Añadir Paso';
        btnAddStep.onclick = () => this.addStep();
        
        toolbar.appendChild(btnAddStep);
        container.appendChild(toolbar);

        // Área de dibujo infinita (Viewport para Pan/Zoom)
        const viewportArea = document.createElement('div');
        viewportArea.className = 'vs-canvas-viewport';
        viewportArea.style.cssText = `
            flex: 1;
            width: 100%;
            height: 100%;
            overflow: hidden;
            position: relative;
            background-color: var(--color-bg-body, #f8fafc);
            background-image: radial-gradient(var(--ion-color-step-300, #cbd5e1) 1px, transparent 1px);
            background-size: 24px 24px;
            cursor: grab;
        `;

        const canvasArea = document.createElement('div');
        canvasArea.className = 'vs-canvas-area';
        canvasArea.style.cssText = `
            transform-origin: 0 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            padding: 100px;
        `;
        
        this.state.wrapper = canvasArea;
        viewportArea.appendChild(canvasArea);
        
        // Controles de zoom
        const zoomHtml = window.UI_PanZoomManager ? window.UI_PanZoomManager.createZoomControlHTML('vs') : '';
        viewportArea.insertAdjacentHTML('beforeend', zoomHtml);
        
        container.appendChild(viewportArea);

        // Estado inicial vacío
        this.state.data = [];

        this.initData();
        
        // Inicializar Pan & Zoom
        if (window.UI_PanZoomManager) {
            window.UI_PanZoomManager.bind(viewportArea, canvasArea, 'vs');
        }
        
        if (window.AppEventBus) {
            if (this._unsubGraph) this._unsubGraph();
            this._unsubGraph = window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', () => {
                this.initData();
            });
            
            if (this._unsubData) this._unsubData();
            this._unsubData = window.AppEventBus.subscribe('DATASTORE::CHANGED', (payload) => {
                if (payload && payload.entityName === 'Value_Stream_Step') {
                    this.initData();
                }
            });
        }
    },
    
    initData: function() {
        if (!window.DataStore) return;
        
        const allEdges = window.DataStore.get('Sys_Graph_Edges') || [];
        const allSteps = window.DataStore.get('Value_Stream_Step') || [];
        
        const getOrder = (metaStr) => {
            if (!metaStr) return 0;
            if (typeof metaStr !== 'string') return metaStr.order || 0;
            try { return JSON.parse(metaStr).order || 0; } catch(e) { return 0; }
        };
        
        let stepEdges = allEdges.filter(e => 
            String(e.id_nodo_padre) === String(this.state.contextId) && 
            e.tipo_relacion === 'VALUE_STREAM_PASO' &&
            e.estado === 'Activo'
        );
        
        stepEdges.sort((a,b) => getOrder(a.metadata_config) - getOrder(b.metadata_config));
        
        this.state.data = stepEdges.map(edge => {
            const stepRecord = allSteps.find(s => String(s.id_value_stream_step) === String(edge.id_nodo_hijo));
            return {
                id: stepRecord ? stepRecord.id_value_stream_step : edge.id_nodo_hijo,
                edgeId: edge.id_relacion,
                title: stepRecord ? stepRecord.nombre : 'Desconocido',
                status: 'active',
                edgeMeta: edge.metadata_config
            };
        });
        
        this.renderSequence();
    },

    renderSequence: function() {
        const wrapper = this.state.wrapper;
        wrapper.innerHTML = '';
        
        const sequenceContainer = document.createElement('div');
        sequenceContainer.className = 'vs-sequence-container';
        sequenceContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: min-content;
        `;
        
        this.state.data.forEach((step, index) => {
            const chevron = this.createChevronNode(step, index, this.state.data.length);
            sequenceContainer.appendChild(chevron);
        });
        
        wrapper.appendChild(sequenceContainer);
    },

    createChevronNode: function(stepData, index, totalLength) {
        if (!window.UI_CanvasNodeFactory || !window.UI_CanvasInteractions) {
            console.error('Canvas dependencies missing');
            return document.createElement('div');
        }

        const node = window.UI_CanvasNodeFactory.buildNode({
            type: 'chevron',
            id: stepData.id,
            title: stepData.title,
            isLast: index === totalLength - 1,
            onDelete: () => {
                if (window.DataAPI && stepData.edgeId) {
                    window.DataAPI.call('API_Universal_Router', 'delete', 'Sys_Graph_Edges', stepData.edgeId, { silent: true }).catch(console.error);
                    
                    // Optimistic DataStore Mutation
                    if (window.DataStore && window.DataStore.get('Sys_Graph_Edges')) {
                        const edges = window.DataStore.get('Sys_Graph_Edges');
                        const edgeIndex = edges.findIndex(e => String(e.id_relacion) === String(stepData.edgeId));
                        if (edgeIndex > -1) {
                            edges[edgeIndex].estado = 'Eliminado';
                            edges[edgeIndex].es_version_actual = false;
                        }
                        if (window.AppEventBus) window.AppEventBus.publish('CACHE::GRAPH_HYDRATED', {});
                    }
                }
            }
        });

        // Set visual state based on stepData
        const colorBase = stepData.status === 'done' ? 'var(--ion-color-success, #2dd36f)' : 
                          stepData.status === 'active' ? 'var(--ion-color-primary, #3880ff)' : 
                          'var(--ion-color-step-300, #cbd5e1)';
        const colorText = (stepData.status === 'done' || stepData.status === 'active') ? '#ffffff' : 'var(--ion-color-step-700, #444)';
        
        node.style.background = colorBase;
        node.style.color = colorText;
        const textSpan = node.querySelector('.node-text');
        if (textSpan) textSpan.style.color = colorText;

        // Make Draggable
        window.UI_CanvasInteractions.makeDraggable(node, { index: index }, (draggedCtx, targetCtx, insertBefore) => {
            const fromIndex = draggedCtx.index;
            const toIndex = targetCtx.index;
            
            if (fromIndex !== toIndex) {
                // Reorder logic local
                const item = this.state.data.splice(fromIndex, 1)[0];
                const adjustedToIndex = (fromIndex < toIndex) ? toIndex - 1 : toIndex;
                const finalIndex = insertBefore ? adjustedToIndex : adjustedToIndex + 1;
                this.state.data.splice(finalIndex, 0, item);
                this.renderSequence();
                
                // Persist new order
                if (window.DataAPI) {
                    let hasChanged = false;
                    this.state.data.forEach((step, idx) => {
                        if (!step.edgeId) return;
                        let meta = {};
                        try {
                            if (step.edgeMeta) meta = typeof step.edgeMeta === 'string' ? JSON.parse(step.edgeMeta) : step.edgeMeta;
                        } catch(e) {}
                        
                        if (meta.order !== (idx + 1)) {
                            meta.order = idx + 1;
                            step.edgeMeta = JSON.stringify(meta);
                            
                            window.DataAPI.call('API_Universal_Router', 'update', 'Sys_Graph_Edges', step.edgeId, {
                                metadata_config: step.edgeMeta
                            }, { skipToast: true, silent: true }).catch(console.error);
                            
                            // Local mutation
                            if (window.DataStore && window.DataStore.get('Sys_Graph_Edges')) {
                                const edges = window.DataStore.get('Sys_Graph_Edges');
                                const edgeIndex = edges.findIndex(e => String(e.id_relacion) === String(step.edgeId));
                                if (edgeIndex > -1) edges[edgeIndex].metadata_config = step.edgeMeta;
                                hasChanged = true;
                            }
                        }
                    });
                    if (hasChanged && window.AppEventBus) window.AppEventBus.publish('CACHE::GRAPH_HYDRATED', {});
                }
            }
        });

        // Make Inline Editable
        if (textSpan) {
            window.UI_CanvasInteractions.makeInlineEditable(node, textSpan, (newText) => {
                stepData.title = newText || 'Paso';
                if (window.DataAPI && stepData.id && String(stepData.id) !== 'undefined') {
                    window.DataAPI.call('API_Universal_Router', 'update', 'Value_Stream_Step', stepData.id, {
                        nombre: stepData.title
                    }, { skipToast: true, silent: true }).catch(console.error);
                    
                    // Local mutation
                    if (window.DataStore && window.DataStore.get('Value_Stream_Step')) {
                        const steps = window.DataStore.get('Value_Stream_Step');
                        const stepIndex = steps.findIndex(s => String(s.id_value_stream_step) === String(stepData.id));
                        if (stepIndex > -1) steps[stepIndex].nombre = stepData.title;
                        if (window.AppEventBus) window.AppEventBus.publish('DATASTORE::CHANGED', { entityName: 'Value_Stream_Step' });
                    }
                }
            });
        }

        return node;
    },

    addStep: function() {
        const targetEntityToOpen = 'Value_Stream';
        const parentId = this.state.contextId;
        
        const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(targetEntityToOpen) : 'id_value_stream';
        const allRecords = window.DataStore ? window.DataStore.get(targetEntityToOpen) || [] : [];
        const recordData = allRecords.find(r => String(r[pkField]) === String(parentId));
        
        if (recordData && typeof window.renderForm === 'function') {
            const ctxIdToPass = this.state.explicitTaxonomiaContext || this.state.contextId;
            window.renderForm(targetEntityToOpen, recordData, (res) => {
                // When form is saved, refresh the canvas data
                this.initData();
            }, { taxonomiaContext: ctxIdToPass, initialStepName: 'Pasos del Value Stream' }).then(() => {
                if (window.FormEngine_Hydrator) {
                    const container = window.currentFormDrawer || document.getElementById('app-container');
                    window.FormEngine_Hydrator(container, recordData, targetEntityToOpen);
                }
            });
        }
    }
};
