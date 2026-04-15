/* ============================================================
       window.DataViewEngine
       ============================================================ */
    window.DataViewEngine = (function () {

        /* ── Configuración de entidades (íconos, labels, campos FK) ── */
        const ENTITY_META = window.ENTITY_META || {};

        /* ── Columnas excluidas de la tabla (Movido a UI_DataGrid) ── */
        const VIRTUAL_TYPES = ['divider', 'header', 'spacer', 'alert', 'markup'];

        /* ── Campos estatus para badges de color ── */
        const STATUS_FIELDS = ['estado', 'nivel_criticalidad', 'modelo_negocio'];

        /* ── Mock data por entidad (Eliminado en refactorización JIT S2.2) ── */

        /* ────────────────────────────────────────────
           Estado interno por entidad
        ───────────────────────────────────────────── */
        let _state = {
            entityName: '',
            data: [],   // todos los registros (sin filtro)
            filtered: [],   // tras búsqueda
            page: 1,
            pageSize: 25,
            sortCol: '',
            sortDir: 'asc',
            view: 'table',  // 'table' | 'grid'
            columns: [],   // { key, label, visible, sortable }
            selectedRows: [], // IDs for Bulk Actions
            containerId: ''
        };

        /* Îndice de columna en arrastre (-1 = ninguno) */
        let _dragSrcIdx = -1;

        /* Datos de lookup cacheados desde el servidor */
        window._LOOKUP_DATA = {};

        /* ────────────────────────────────────────────
           Helpers
        ───────────────────────────────────────────── */
        /* ────────────────────────────────────────────
           Helpers (Movidos a UI_DataGrid.html en S12.2)
        ───────────────────────────────────────────── */

        /* ────────────────────────────────────────────
           Derivar columnas desde schema o datos
        ───────────────────────────────────────────── */
        function _buildColumns(entityName, rows) {
            const fields = window.UI_DataGrid && window.UI_DataGrid._normalizeFields ? window.UI_DataGrid._normalizeFields(entityName) : null;
            // Migrado a arquitectura global (Index.html -> window.CORE_SYS_FIELDS) para consistencia (CSV y DataGrid)
            const SYS_COLS = window.CORE_SYS_FIELDS || ['created_at', 'create_by', 'created_by', 'updated_at', 'update_at', 'update_by', 'deleted_at', 'deleted_by', 'version', '_version'];
            let keys = [];

            if (fields) {
                keys = fields.filter(f => !f.isVirtual && !VIRTUAL_TYPES.includes(f.type)).map(f => f.name);
                // agregar claves presentes en datos pero no en schema (ej. created_at)
                if (rows && rows.length > 0) {
                    Object.keys(rows[0]).forEach(k => { if (!keys.includes(k)) keys.push(k); });
                }
            } else if (rows && rows.length > 0) {
                keys = Object.keys(rows[0]);
            }

            // S37.2: Asegurar convenciones de UX (Lexical ID primero, Nombre/Título segundo)
            const meta = window.ENTITY_META ? window.ENTITY_META[entityName] : null;
            
            const fallbackTitleKey = (meta && meta.titleField) ? meta.titleField : 'nombre';
            const idKey = keys.includes('lexical_id') ? 'lexical_id' : (window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : null);

            if (idKey && keys.includes(idKey)) {
                keys = keys.filter(k => k !== idKey);
                keys.unshift(idKey);
            }
            
            if (fallbackTitleKey && keys.includes(fallbackTitleKey)) {
                keys = keys.filter(k => k !== fallbackTitleKey);
                if (keys.length > 0 && keys[0] === idKey) {
                    keys.splice(1, 0, fallbackTitleKey);
                } else {
                    keys.unshift(fallbackTitleKey);
                }
            }

            return keys.map(key => {
    let isHidden = false;
    let isPrimaryKey = false;
    let uiType = 'text';

    if (fields) {
        const f = fields.find(field => field.name === key);
        if (f) {
            if (f.primaryKey) isPrimaryKey = true;
            // [S32 Fix] Campos hidden nun ca se muestran en la tabla (incluyendo PKs como id_unidad_negocio)
            if (f.type === 'hidden') isHidden = true;
            if (f.showInList !== undefined) isHidden = !f.showInList;
            uiType = f.uiDisplay || f.type || 'text';
        } else {
            if (SYS_COLS.includes(key)) isHidden = true;
        }
    } else {
        if (SYS_COLS.includes(key)) isHidden = true;
    }

    if (key.startsWith('id_')) {
        isPrimaryKey = true;
    }
    
    return {
        key,
        label: window.UI_DataGrid && window.UI_DataGrid._labelFromKey ? window.UI_DataGrid._labelFromKey(key, entityName) : key,
        // [S32 Fix] NO forzamos true para PK. isHidden domina (generalmente los PK son hidden)
        visible: !isHidden,
        sortable: true,
        uiType: uiType
    };
});
        }

        /* ────────────────────────────────────────────
           Estados Visuales de Carga y Error
        ───────────────────────────────────────────── */
        function _showLoadingState() {
            const zone = document.getElementById('dv-data-zone');
            if (zone && window.UI_DataGrid) {
                zone.innerHTML = '';
                zone.appendChild(window.UI_DataGrid.buildLayout({ loading: true }));
            }
        }

        function _showErrorState(error) {
            const zone = document.getElementById('dv-data-zone');
            if (zone && window.UI_DataGrid) {
                zone.innerHTML = '';
                zone.appendChild(window.UI_DataGrid.buildLayout({ error: error }));
            }
        }

        /* ────────────────────────────────────────────
           Fetch data (GAS o Mock)
        ───────────────────────────────────────────── */
        async function _fetchData(entityName, cb) {
            _showLoadingState();
            // Check Frontend Cache first (Directiva Arquitectónica: 0.0s latency)
            if (window.DataStore && window.DataStore.get(entityName)) {
                console.log(`[Cache Frontend] HIT para ${entityName}. Renderizado instantáneo.`);
                const cachedData = window.DataStore.get(entityName);
                const activeRows = window.DataStore.getActive ? window.DataStore.getActive(entityName) : cachedData.filter(r => r.estado !== 'Eliminado' && r.estado !== 'eliminado');
                cb(null, activeRows);
                return;
            }

            try {
                console.time('[Perf] Single RPC Hydration');
                const rawResponse = await window.DataAPI.call('getInitialPayload', entityName);
                console.timeEnd('[Perf] Single RPC Hydration');
                
                const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
                
                if (response && response.status === 'success') {
                    // Guardar lookups para el formateador
                    window._LOOKUP_DATA = response.lookups || {};
                    
                    // Inflar Tuplas a Objetos (Data Compression) si vienen en formato tupla
                    let rows = [];
                    if (response.data && response.data.headers && response.data.rows) {
                        const headers = response.data.headers;
                        rows = response.data.rows.map(tuple => {
                            const obj = {};
                            headers.forEach((h, i) => obj[h] = tuple[i]);
                            return obj;
                        });
                    } else if (response.data && Array.isArray(response.data)) {
                        rows = response.data;
                    }

                    // Store in Frontend Cache for 0.0s subsequent transitions
                    if (window.DataStore) {
                        window.DataStore.set(entityName, rows);
                    }

                    const activeRows = window.DataStore && window.DataStore.getActive ? window.DataStore.getActive(entityName) : rows.filter(r => r.estado !== 'Eliminado' && r.estado !== 'eliminado');
                    cb(null, activeRows);
                } else {
                    cb(new Error(response ? response.message : 'Error desconocido'));
                }
            } catch (err) {
                cb(err || new Error('Error de comunicación con el servidor'));
            }
        }

        /* ────────────────────────────────────────────
           Búsqueda y Ordenación
        ───────────────────────────────────────────── */
        /* ────────────────────────────────────────────
           Búsqueda y Ordenación (Delegadas a DataEngine)
        ───────────────────────────────────────────── */
        function _applyFilter(query) {
            let baseData = _state.data;
            if (_state.payload && _state.payload.strictFilter && _state.payload.strictFilter.key) {
                const sKey = _state.payload.strictFilter.key;
                const sVal = String(_state.payload.strictFilter.value);
                
                const escapeRegExp = function(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
                const sRegex = new RegExp('(^|\\W)' + escapeRegExp(sVal) + '(\\W|$)');

                // NEW: Resolve Graph edges JIT for filter (H8/S34 QA)
                let fMeta = null;
                if (window.APP_SCHEMAS && window.APP_SCHEMAS[_state.entityName]) {
                    fMeta = (window.APP_SCHEMAS[_state.entityName].fields || []).find(f => f.name === sKey);
                }
                const activeEdges = (fMeta && fMeta.isTemporalGraph && window.DataStore && window.DataStore.get('Sys_Graph_Edges')) ? window.DataStore.get('Sys_Graph_Edges') : null;
                const edgeName = fMeta ? (fMeta.graphEdgeType || fMeta.name).toUpperCase() : null;
                const pkCol = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(_state.entityName) : 'id_registro';

                baseData = baseData.filter(function(r) {
                    let val = r[sKey];

                    // Graph Fallback: Si no hay FK física, buscala en la topología (Orphan Prevention)
                    const isEmptyValue = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
                    if (fMeta && fMeta.isTemporalGraph && activeEdges && isEmptyValue) {
                        const currentPK = r[pkCol];
                        if (fMeta.relationType === 'padre') {
                            const match = activeEdges.find(e => String(e.id_nodo_hijo) === String(currentPK) && e.tipo_relacion === edgeName && e.es_version_actual !== false && e.estado !== 'Eliminado');
                            if (match) val = match.id_nodo_padre;
                        } else {
                            const match = activeEdges.find(e => String(e.id_nodo_padre) === String(currentPK) && e.tipo_relacion === edgeName && e.es_version_actual !== false && e.estado !== 'Eliminado');
                            if (match) val = match.id_nodo_hijo; 
                        }
                    }
                    // Unwraps Graph/Relation Array [{id: "EQ-1"}] checking ANY object property or flat value
                    if (Array.isArray(val)) {
                        return val.some(function(item) {
                            if (typeof item === 'object' && item !== null) {
                                return Object.values(item).some(function(innerVal) {
                                    return String(innerVal) === sVal || sRegex.test(String(innerVal));
                                });
                            }
                            return String(item) === sVal || sRegex.test(String(item));
                        });
                    }
                    return String(val) === sVal || sRegex.test(String(val));
                });
            }
            _state.filtered = window.DataEngine.applyFilter(baseData, query);
            _state.page = 1;
            _rerenderData(); // Solo datos — el toolbar/search box NO se toca
        }

        function _applySort(colKey) {
            if (_state.sortCol === colKey) {
                _state.sortDir = _state.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                _state.sortCol = colKey;
                _state.sortDir = 'asc';
            }
            _state.filtered = window.DataEngine.applySort(_state.filtered, colKey, _state.sortDir);
            _rerenderData();
        }

        /* ────────────────────────────────────────────
           Renderers HTML (Movidos a UI_DataGrid.html en S12.2)
        ───────────────────────────────────────────── */        /* ────────────────────────────────────────────
           ion-popover nativo: gestor de columnas visibles
           — Renderiza un <ion-popover> en el body para garantizar que
             Ionic lo posicione sin desbordamiento en móvil ni en desktop.
        ───────────────────────────────────────────── */
        function _ensureColPopover() {
            if (window.UI_DataView_Toolbar) {
                window.UI_DataView_Toolbar.ensureColPopover(_state.columns, _onColToggle);
            }
        }

        function _buildToolbarHTML() {
            if (window.UI_DataView_Toolbar) {
                return window.UI_DataView_Toolbar.buildToolbarHTML(_state.view, _state.entityName, _onViewToggle);
            }
            return document.createElement('div');
        }

        /* Adjunta el listener ionInput al ion-searchbar tras cada re-render del toolbar.
           ionInput es el evento nativo de Ionic Web Components (no 'oninput' HTML estándar). */
        function _attachSearchHandler() {
            const sb = document.getElementById('dv-search-input');
            if (sb) {
                sb.addEventListener('ionInput', function (e) {
                    window.DataViewEngine._onSearch(e.detail.value || '');
                });
            }
        }

        function _buildHeader() {
            if (window.UI_DataView_Toolbar) {
                const canCreate = !window.ABAC || window.ABAC.can('create', _state.entityName);
                const onAddClick = () => renderForm(_state.entityName);
                const headerDiv = window.UI_DataView_Toolbar.buildHeader(
                    _state.entityName, 
                    _state.filtered.length, 
                    canCreate, 
                    _exportCSV, 
                    function(e) { window.DataViewEngine._importCSV(e); }, 
                    onAddClick
                );

                if (_state.payload && _state.payload.strictFilter && _state.payload.strictFilter.key) {
                    const leftDiv = headerDiv.querySelector('.dv-header-left');
                    if (leftDiv) {
                        const chip = document.createElement('ion-chip');
                        chip.setAttribute('color', 'primary');
                        chip.style.marginLeft = '1rem';
                        chip.style.marginTop = '0.5rem';
                        const displayVal = _state.payload.strictFilter.label || _state.payload.strictFilter.value;
                        chip.innerHTML = `<ion-icon name="filter"></ion-icon><ion-label>Filtrado: ${displayVal}</ion-label>`;
                        const closeIcon = document.createElement('ion-icon');
                        closeIcon.name = 'close-circle';
                        closeIcon.onclick = function() {
                            _state.payload.strictFilter = null;
                            _applyFilter(document.getElementById('dv-search-input') ? document.getElementById('dv-search-input').value : '');
                            _rerenderData();
                            const hd = document.getElementById('dv-header-zone');
                            if (hd) { window.DOM.clear(hd); hd.appendChild(_buildHeader()); }
                        };
                        chip.appendChild(closeIcon);
                        leftDiv.appendChild(chip);
                    }
                }
                return headerDiv;
            }
            return document.createElement('div');
        }

        /* ────────────────────────────────────────────
           Re-render: sólo zona de datos (tabla/grid + paginación)
           El toolbar (#dv-toolbar-zone) NUNCA se toca aquí — preserva el foco del input.
        ───────────────────────────────────────────── */
        function _rerenderData() {
            const dataZone = document.getElementById('dv-data-zone');
            if (!dataZone) return;

            if (_state.view === 'map') {
                if (window.renderDomainMap) {
                    window.renderDomainMap(dataZone);
                } else {
                    const errNode = document.createElement('div');
                    errNode.className = 'dv-empty';
                    errNode.textContent = 'Motor de Mapa no disponible.';
                    dataZone.appendChild(errNode);
                }
            } else if (window.UI_DataGrid) {
                window.DOM.clear(dataZone);
                dataZone.appendChild(window.UI_DataGrid.buildLayout({
                    entityName: _state.entityName,
                    containerId: _state.containerId,
                    page: _state.page,
                    pageSize: _state.pageSize,
                    sortCol: _state.sortCol,
                    sortDir: _state.sortDir,
                    view: _state.view,
                    columns: _state.columns,
                    filteredData: _state.filtered,
                    selectedRows: _state.selectedRows,
                    loading: false,
                    onSort: 'window.DataViewEngine._onSort',
                    onDragStart: 'window.DataView_DragDrop.onDragStart',
                    onDragOver: 'window.DataView_DragDrop.onDragOver',
                    onDragLeave: 'window.DataView_DragDrop.onDragLeave',
                    onDrop: 'window.DataView_DragDrop.onDrop',
                    onDragEnd: 'window.DataView_DragDrop.onDragEnd',
                    onDelete: 'window.DataViewEngine._confirmDelete',
                    onRowCheck: 'window.DataViewEngine._onRowCheck',
                    onSelectAll: 'window.DataViewEngine._onSelectAll',
                    onRowOrderChange: 'window.DataViewEngine._onRowOrderChange',
                    onPageSize: 'window.DataViewEngine._onPageSize',
                    onPage: 'window.DataViewEngine._onPage',
                    onEdit: 'window.openEditForm'
                }));
            }
        }

        // Alias para compatibilidad interna (sort, page)
        function _rerender() { _rerenderData(); }

        /* Re-render sólo el toolbar (toggle de columnas / vista) */
        function _rerenderToolbar() {
            const zone = document.getElementById('dv-toolbar-zone');
            if (zone) { window.DOM.clear(zone); zone.appendChild(_buildToolbarHTML()); }
            // ion-searchbar: adjuntar ionInput tras re-render
            _attachSearchHandler();
            // Sincronizar ion-popover con el nuevo estado de columnas
            _ensureColPopover();
        }

        /* ────────────────────────────────────────────
           Render principal (entrada pública)
        ───────────────────────────────────────────── */
        function render(entityName, containerId, payload) {
            // Mobile-first: grid por defecto en móvil (<768px), tabla en desktop
            const defaultView = (window.innerWidth < 768) ? 'grid' : 'table';

            _state = {
                entityName, containerId,
                data: [], filtered: [], selectedRows: [],
                page: 1, pageSize: 25,
                sortCol: '', sortDir: 'asc',
                view: defaultView, columns: [], payload: payload || null
            };

            // Limpiar ion-popover de la entidad anterior (si existe)
            const oldPop = document.getElementById('dv-col-ion-popover');
            if (oldPop) oldPop.remove();

            const container = document.getElementById(containerId);
            if (!container) return;
            
            // Garantizar que ion-content master no interfiera aislando app-container a sus limites fijos
            if (containerId === 'app-container') {
                container.classList.add('dv-fullscreen-lock');
            }
            
            // Inicializar handler central de reordenamiento de DataView_DragDrop
            if (window.DataView_DragDrop) {
                window.DataView_DragDrop.init(_reorderColumns);
            }

            // Estructura inicial: header + toolbar (permanente) + skeleton de datos
            // #dv-toolbar-zone: NUNCA se destruye durante búsqueda/sort/pagina
            // #dv-data-zone:    se reemplaza en cada operación de datos
            window.DOM.clear(container);
            const root = document.createElement('div');
            root.className = 'dv-root'; root.id = 'dv-root';
            const hZone = document.createElement('div'); hZone.id = 'dv-header-zone';
            hZone.appendChild(_buildHeader());
            const tZone = document.createElement('div'); tZone.id = 'dv-toolbar-zone';
            const dZone = document.createElement('div'); dZone.id = 'dv-data-zone';
            root.appendChild(hZone); root.appendChild(tZone); root.appendChild(dZone);
            container.appendChild(root);

            // Inyectar Safely el skeleton estático convertido a fragmento
            const dataZone = document.getElementById('dv-data-zone');
            if (dataZone && window.UI_DataGrid) {
                dataZone.appendChild(window.UI_DataGrid.buildLayout({ loading: true }));
            }

            // Actualizar título global del header de Ionic solo si estamos en la vista raíz
            const headerTitle = document.getElementById('main-header-title');
            if (headerTitle && containerId === 'app-container') {
                const meta = ENTITY_META[entityName] || { label: window.formatEntityName(entityName) };
                headerTitle.textContent = meta.label;
            }
            const backBtn = document.getElementById('global-back-btn');
            if (backBtn && containerId === 'app-container') backBtn.classList.add('ion-hide'); // Vista raíz del módulo: ocultar botón atrás

            // Fetch
            _fetchData(entityName, function (err, rows) {
                if (err) {
                    _showErrorState(err);
                    return;
                }

                _state.data = rows;
                _state.filtered = [...rows];
                _state.columns = _buildColumns(entityName, rows);

                // Actualizar header con total real
                const headerZone = document.getElementById('dv-header-zone');
                if (headerZone) { window.DOM.clear(headerZone); headerZone.appendChild(_buildHeader()); }

                // Renderizar toolbar (una sola vez; luego _rerenderToolbar lo actualiza)
                const toolbarZone = document.getElementById('dv-toolbar-zone');
                if (toolbarZone) { window.DOM.clear(toolbarZone); toolbarZone.appendChild(_buildToolbarHTML()); }

                // ion-searchbar: adjuntar listener ionInput
                _attachSearchHandler();

                // Crear ion-popover nativo en el body (fuera del contenedor, sin desbordamiento)
                _ensureColPopover();

                // Actualizar sidebar con navegación de entidades (Directiva 1)
                if (window.UI_Router && typeof window.UI_Router.showListSidebar === 'function') {
                    window.UI_Router.showListSidebar(entityName);
                }

                _rerenderData();

                // El Filtro visual del Searchbar ya no se inyecta con IDs para evitar colisiones.
                // Se procesa de forma transpartente en _applyFilter utilizando payload.strictFilter
                _applyFilter('');
            });
        }

        /* ────────────────────────────────────────────
           CSV Export
        ───────────────────────────────────────────── */
        function _exportCSV() {
            const visibleCols = _state.columns.filter(c => c.visible);
            const header = visibleCols.map(c => `"${c.label}"`).join(',');
            const bodyRows = _state.filtered.map(row =>
                visibleCols.map(col => {
                    const v = String(row[col.key] ?? '').replace(/"/g, '""');
                    return `"${v}"`;
                }).join(',')
            ).join('\n');

            const csv = '\uFEFF' + header + '\n' + bodyRows; // BOM para Excel/UTF-8
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${_state.entityName}_${new Date().toISOString().slice(0, 10)}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }

        /* ────────────────────────────────────────────
           Event handlers (accesibles desde HTML inline)
        ───────────────────────────────────────────── */
        var _onDebouncedFilter = null;
        function _onSearch(query) { 
            if (!_onDebouncedFilter) {
                // Instanciar lazy-load del S21.2 Debounce (Z-Blocking) 300ms
                _onDebouncedFilter = (window.debounce || function(f){return f;})(function(q) {
                    _applyFilter(q);
                }, 300);
            }
            _onDebouncedFilter(query);
        }

        function _onSort(colKey) { _applySort(colKey); }

        function _onPage(p) {
            const tp = Math.max(1, Math.ceil(_state.filtered.length / _state.pageSize));
            _state.page = Math.max(1, Math.min(p, tp));
            _rerender();
        }

        function _onPageSize(size) {
            _state.pageSize = parseInt(size, 10);
            _state.page = 1;
            _rerender();
        }

        function _onColToggle(idx, visible) {
            _state.columns[idx].visible = visible;
            // Actualizar solo el contenido del ion-popover (sin cerrarlo ni destruir el toolbar)
            const pop = document.getElementById('dv-col-ion-popover');
            if (pop && window.UI_DataView_Toolbar) {
                window.DOM.clear(pop);
                pop.appendChild(window.UI_DataView_Toolbar.buildColPopoverContentHTML(_state.columns));
                pop.querySelectorAll('ion-checkbox').forEach(function (cb) {
                    const i = parseInt(cb.getAttribute('data-colidx'), 10);
                    cb.addEventListener('ionChange', function (e) {
                        window.DataViewEngine._onColToggle(i, e.detail.checked);
                    });
                });
            }
            // Actualizar botones de view toggle (no destruye el search input)
            _rerenderToolbar();
            _rerenderData();
        }

        function _onRowCheck(id, isChecked) {
            const strId = String(id);
            if (isChecked) {
                if (!_state.selectedRows.includes(strId)) _state.selectedRows.push(strId);
            } else {
                _state.selectedRows = _state.selectedRows.filter(r => String(r) !== strId);
            }
        }

        function _onSelectAll(checked) {
            const pkField = window.Schema_Utils.getPrimaryKey(_state.entityName);
            const pageIds = window.UI_DataGrid._getPageData ? window.UI_DataGrid._getPageData().map(r => String(r[pkField] || '')) : [];
            const dataToIterate = pageIds.length > 0 ? pageIds : _state.filteredData.slice((_state.page - 1) * _state.pageSize, _state.page * _state.pageSize).map(r => String(r[pkField] || ''));
            
            if (checked) {
                dataToIterate.forEach(id => {
                    if (id && !_state.selectedRows.includes(id)) _state.selectedRows.push(id);
                });
            } else {
                _state.selectedRows = _state.selectedRows.filter(r => !dataToIterate.includes(String(r)));
            }
            _rerenderData();
        }

        function _onRowOrderChange(srcId, targetId) {
            const pkField = window.Schema_Utils.getPrimaryKey(_state.entityName);
            const srcIdx = _state.filteredData.findIndex(r => String(r[pkField]) === String(srcId));
            const targetIdx = _state.filteredData.findIndex(r => String(r[pkField]) === String(targetId));
            
            if(srcIdx > -1 && targetIdx > -1) {
                const item = _state.filteredData.splice(srcIdx, 1)[0];
                _state.filteredData.splice(targetIdx, 0, item);
            }
        }

        function _toggleColPopover() { /* no-op: Ionic maneja apertura via trigger */ }

        function _onViewToggle(view) {
            _state.view = view;
            _rerenderToolbar(); // actualiza clases active en botones lista/grid
            _rerenderData();
        }

        /* ────────────────────────────────────────────
           Drag & Drop — reordenar columnas (HTML5 nativo, sin librerías)
        ───────────────────────────────────────────── */
        function _reorderColumns(srcIdx, targetIdx) {
            const cols = _state.columns;
            const [moved] = cols.splice(srcIdx, 1);
            cols.splice(targetIdx, 0, moved);
            _rerenderToolbar();
            _rerenderData();
        }

        /* Cerrar popover al hacer click fuera */
        document.addEventListener('click', function (e) {
            const wrap = document.querySelector('.dv-popover-wrap');
            if (wrap && !wrap.contains(e.target)) {
                const pop = document.getElementById('dv-col-popover');
                if (pop) pop.classList.remove('open');
            }
        });

        /* ────────────────────────────────────────────
           Soft Delete Flow
        ───────────────────────────────────────────── */
        function _confirmDelete(id) {
            const alert = document.createElement('ion-alert');
            alert.header = 'Confirmar Borrado';
            alert.message = '¿Estás seguro de que deseas borrar este registro de manera definitiva?';
            alert.buttons = [
                { text: 'Cancelar', role: 'cancel' },
                {
                    text: 'Borrar',
                    role: 'confirm',
                    handler: () => {
                        _executeSoftDelete(id);
                    }
                }
            ];
            document.body.appendChild(alert);
            return window.PresentSafe(alert);
        }

        async function _executeSoftDelete(id) {
            // Optimistic UI update (Local state)
            const idField = window.Schema_Utils.getPrimaryKey(_state.entityName);
            _state.data = _state.data.filter(r => r[idField] !== id);
            _applyFilter(document.getElementById('dv-search-input') ? document.getElementById('dv-search-input').value || '' : '');

            // Global Cache sync (Prevent Re-render Desync)
            if (window.DataStore && window.DataStore.get(_state.entityName)) {
                window.DataStore.set(_state.entityName, window.DataStore.get(_state.entityName).filter(r => r[idField] !== id));
                console.log(`[Cache] Registro eliminado de caché global: ${id}`);
            }

            const loading = document.createElement('ion-loading');
            loading.message = 'Borrando...';
            document.body.appendChild(loading);
            window.PresentSafe(loading);

            try {
                const rawResponse = await window.DataAPI.call('API_Universal_Router', 'delete', _state.entityName, id);
                const response = typeof rawResponse === 'string' ? JSON.parse(rawResponse) : rawResponse;
                loading.dismiss();
                
                if (response && response.status === 'success') {
                    // Purgar de la RAM local
                    if (window.DataStore && window.DataStore.get(_state.entityName)) {
                        const pkField = window.Schema_Utils.getPrimaryKey(_state.entityName);
                        window.DataStore.set(_state.entityName, window.DataStore.get(_state.entityName).filter(row => row[pkField] !== id));
                    }

                    // Forzar re-renderización de la vista actual desde el caché actualizado
                    _rerenderData();

                    _showToast('Registro borrado con éxito.', 'success');
                } else {
                    _showToast('Error al borrar: ' + (response ? response.message : ''), 'danger');
                    render(_state.entityName, _state.containerId);
                }
            } catch (err) {
                loading.dismiss();
                _showToast('Error de red al borrar', 'danger');
                render(_state.entityName, _state.containerId);
            }
        }

        function _showToast(message, color) {
            const toast = document.createElement('ion-toast');
            toast.message = message;
            toast.duration = 2500;
            toast.color = color || 'success';
            document.body.appendChild(toast);
            return window.PresentSafe(toast);
        }

        /* ────────────────────────────────────────────
           Universal Bulk Data Engine (Delegado a DataEngine_UI)
        ───────────────────────────────────────────── */
        function _exportCSV() {
            window.DataEngine.exportCSV(_state.entityName, _state.columns, _state.filtered);
        }

        function _importCSV(event) {
            window.DataEngine.importCSV(
                event,
                _state.entityName,
                function onLoadingStart() {
                    const loading = document.createElement('ion-loading');
                    loading.message = 'Importando masivamente...';
                    loading.id = 'dv-import-loading';
                    document.body.appendChild(loading);
                    window.PresentSafe(loading);
                },
                function onSuccess(insertedCount) {
                    const loading = document.getElementById('dv-import-loading');
                    if (loading) loading.dismiss();
                    _showToast(`Se importaron ${insertedCount} registros con éxito.`, 'success');
                    render(_state.entityName, _state.containerId);
                },
                function onError(errMsg) {
                    const loading = document.getElementById('dv-import-loading');
                    if (loading) loading.dismiss();
                    _showToast(`Error en carga masiva: ${errMsg}`, 'danger');
                }
            );
        }

        /* ────────────────────────────────────────────
           Event Bus Subscribers
        ───────────────────────────────────────────── */
        let _redrawRAF = null;
        function _queueRedraw() {
            if (_redrawRAF) cancelAnimationFrame(_redrawRAF);
            _redrawRAF = requestAnimationFrame(() => {
                _rerenderData();
                _redrawRAF = null;
            });
        }

        if (typeof window !== 'undefined' && window.AppEventBus) {
            window.AppEventBus.subscribe('CACHE::GRAPH_HYDRATED', function(payload) {
                if (payload && _state && _state.entityName) {
                    console.log(`[DataViewEngine] Graph hydrated, forzando silent re-render para actualizar columnas de relaciones en ${_state.entityName}`);
                    _queueRedraw();
                }
            });

            window.AppEventBus.subscribe('DATA::UPDATED', function(payload) {
                if (payload && _state && payload.entityKey === _state.entityName) {
                    console.log(`[DataViewEngine] Datos mutados nativamente, reintegrando de DataStore y repintando.`);
                    if (window.DataStore && window.DataEngine) {
                        _state.data = window.DataStore.getActive ? window.DataStore.getActive(_state.entityName) : (window.DataStore.get(_state.entityName) || []).filter(r => r.estado !== 'Eliminado' && r.estado !== 'eliminado');
                        
                        // Re-aplicar filtro actual al nuevo set de datos preservando UX
                        const searchInput = document.getElementById('dv-search-input');
                        const query = searchInput ? searchInput.value || '' : '';
                        _state.filtered = window.DataEngine.applyFilter(_state.data, query);
                        
                        // Re-aplicar ordenamiento actual preservando UX
                        if (_state.sortCol) {
                             _state.filtered = window.DataEngine.applySort(_state.filtered, _state.sortCol, _state.sortDir);
                        }
                        
                        _queueRedraw();
                    }
                }
            });

        }

        /* API pública */
        return {
            render,
            _getState: function () {
                return {
                    ..._state,
                    entityMeta: ENTITY_META[_state.entityName]
                };
            },
            _exportCSV, _importCSV,
            _onSearch, _onSort, _onPage, _onPageSize,
            _onRowCheck, _onSelectAll, _onRowOrderChange,
            _onColToggle, _toggleColPopover, _onViewToggle,
            _confirmDelete
        };
    })();