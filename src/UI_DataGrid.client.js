/* ============================================================
       UI_DataGrid.html — Factoría Visual de Tablas y Cuadrículas
       Incluido via GAS: <?!= include('UI_DataGrid'); ?>
       
       Módulo V4 Puro: Devuelve exclusivamente DocumentFragments y Nodes.
       Totalmente aséptico contra XSS persistente.
       ============================================================ */

    window.UI_DataGrid = {
        
        /* ── Punto de Entrada Central de la Factoría ── */
        buildLayout: function(config) {
            this.cfg = config; 
            this._edgeMemo = null;   // Flush memo cache para Grafos (H9/AR)
            this._targetMemo = null; // Flush memo cache para Semántica (H9/AR)
            
            if (config.loading) return this._renderSkeleton();
            if (config.error) return this._renderErrorState(config.error);
            if (!config.filteredData || config.filteredData.length === 0) return this._renderEmpty();

            if (config.view === 'table') {
                return this._renderTableView();
            } else if (config.view === 'grid') {
                return this._renderGridView();
            } else {
                return this._renderEmpty();
            }
        },

        /* ── Helper de Invocación Config-Driven ── */
        _invoke: function(callbackStr, ...args) {
            if (!callbackStr) return;
            const parts = callbackStr.split('.');
            let context = window;
            for(let i=0; i<parts.length-1; i++) {
                if (parts[i] === 'window') continue;
                context = context[parts[i]];
                if (!context) return;
            }
            const funcName = parts[parts.length-1];
            if (context && typeof context[funcName] === 'function') {
                context[funcName].apply(context, args);
            }
        },

        /* ── Renderers Estructurales Estáticos ── */
        _renderSkeleton: function() {
            const tmpl = document.getElementById('tmpl-datagrid-skeleton');
            return tmpl ? tmpl.content.cloneNode(true) : document.createDocumentFragment();
        },

        _renderErrorState: function(error) {
            const tmpl = document.getElementById('tmpl-datagrid-error');
            if (!tmpl) return document.createDocumentFragment();
            const clone = tmpl.content.cloneNode(true);
            const errNode = clone.querySelector('[data-errormsg]');
            if (errNode) errNode.textContent = '(Detalle: ' + (error ? error.message : 'Error de red') + ')';
            return clone;
        },

        _renderEmpty: function() {
            const tmpl = document.getElementById('tmpl-datagrid-empty');
            return tmpl ? tmpl.content.cloneNode(true) : document.createDocumentFragment();
        },

        /* ── Renderers Nodales Dinámicos V4 ── */
        _renderTableView: function() {
            const visibleCols = this.cfg.columns.filter(c => c.visible);
            const rows = this._getPageData();
            
            if (visibleCols.length === 0 || rows.length === 0) return this._renderEmpty();

            const docFrag = document.createDocumentFragment();
            
            const card = document.createElement('div');
            card.className = 'dv-card';
            
            const tableWrap = document.createElement('div');
            tableWrap.className = 'dv-table-wrap';
            
            const table = document.createElement('table');
            table.className = 'dv-table';
            
            // Thead
            const thead = document.createElement('thead');
            const trHead = document.createElement('tr');
            
            const thCheck = document.createElement('th');
            thCheck.className = 'dv-th-check';
            const selectAll = document.createElement('input');
            selectAll.type = 'checkbox';
            
            const pkField = window.Schema_Utils.getPrimaryKey(this.cfg.entityName);
            const pageIds = rows.map(r => String(r[pkField] || ''));
            selectAll.checked = pageIds.length > 0 && pageIds.every(id => (this.cfg.selectedRows || []).includes(id));
            selectAll.addEventListener('change', (e) => {
                if (this.cfg.onSelectAll) this._invoke(this.cfg.onSelectAll, e.target.checked);
            });
            thCheck.appendChild(selectAll);
            trHead.appendChild(thCheck);

            const thNum = document.createElement('th');
            thNum.className = 'dv-th-num';
            thNum.textContent = '#';
            trHead.appendChild(thNum);
            
            visibleCols.forEach((col) => {
                const colIdx = this.cfg.columns.indexOf(col);
                const isSorted = this.cfg.sortCol === col.key;
                
                const th = document.createElement('th');
                if (isSorted) th.classList.add('sorted');
                th.dataset.colidx = colIdx;
                th.draggable = true;
                
                // Eventos Drag and Drop (Nativos DOM2)
                if (this.cfg.onDragStart) th.addEventListener('dragstart', (e) => this._invoke(this.cfg.onDragStart, colIdx, e));
                if (this.cfg.onDragOver) th.addEventListener('dragover', (e) => this._invoke(this.cfg.onDragOver, colIdx, e));
                if (this.cfg.onDragLeave) th.addEventListener('dragleave', (e) => this._invoke(this.cfg.onDragLeave, e));
                if (this.cfg.onDrop) th.addEventListener('drop', (e) => this._invoke(this.cfg.onDrop, colIdx, e));
                if (this.cfg.onDragEnd) th.addEventListener('dragend', (e) => this._invoke(this.cfg.onDragEnd, e));
                
                // Evento Click Sort
                if (this.cfg.onSort) th.addEventListener('click', () => this._invoke(this.cfg.onSort, col.key));
                
                th.appendChild(document.createTextNode(col.label + ' '));
                
                const arrow = document.createElement('span');
                arrow.className = isSorted ? 'dv-sort-icon active' : 'dv-sort-icon';
                arrow.textContent = isSorted ? (this.cfg.sortDir === 'asc' ? '↑' : '↓') : '↕';
                th.appendChild(arrow);
                
                th.appendChild(document.createTextNode(' '));
                
                const handle = document.createElement('span');
                handle.className = 'dv-drag-handle';
                handle.title = 'Arrastra para reordenar';
                handle.textContent = '⣿';
                th.appendChild(handle);
                
                trHead.appendChild(th);
            });
            
            let hideActionColumn = false;
            if (window.ABAC) {
                // S18.4 Fix (QR): Encapsulation Leak (Semantic Bug)
                hideActionColumn = !(window.ABAC.can('update', this.cfg.entityName) || window.ABAC.can('delete', this.cfg.entityName));
            }

            if (!hideActionColumn) {
                const thAction = document.createElement('th');
                thAction.className = 'dv-th-action';
                trHead.appendChild(thAction);
            }
            
            thead.appendChild(trHead);
            table.appendChild(thead);
            
            // Tbody
            const tbody = document.createElement('tbody');
            tbody.appendChild(this._renderTableBodyNodes(rows, visibleCols, hideActionColumn));
            table.appendChild(tbody);
            
            tableWrap.appendChild(table);
            card.appendChild(tableWrap);
            
            // Paginación
            card.appendChild(this._renderPaginationNodes());
            docFrag.appendChild(card);
            
            return docFrag;
        },

        _renderTableBodyNodes: function(rows, visibleCols, hideActionColumn) {
            const frag = document.createDocumentFragment();
            const startIdx = (this.cfg.page - 1) * this.cfg.pageSize;
            
            rows.forEach((row, idx) => {
                const tr = document.createElement('tr');
                
                const pkField = window.Schema_Utils.getPrimaryKey(this.cfg.entityName);
                const id = row[pkField] || '';
                
                // Bug fix: Row selection logic (S25.3) con captura proactiva de Unhandled Promises
                tr.addEventListener('click', (e) => {
                    // Evitar disparo si el evento vino de un boton (aunque tengan stopPropagation)
                    if (e.target.closest('button')) return;
                    if (id) {
                        try {
                            const result = this._invoke(this.cfg.onEdit, id);
                            if (result && typeof result.catch === 'function') {
                                result.catch(err => console.error('[UI_DataGrid] Async Error on row click:', err));
                            }
                        } catch (err) {
                            console.error('[UI_DataGrid] Sync Error on row click:', err);
                        }
                    }
                });
                
                const tdCheck = document.createElement('td');
                tdCheck.className = 'dv-td-check';
                const dragHandle = document.createElement('span');
                dragHandle.className = 'dv-row-drag-handle';
                dragHandle.textContent = '⣿ ';
                dragHandle.style.cursor = 'grab';
                dragHandle.style.color = 'var(--ion-color-medium)';
                const rowCheck = document.createElement('input');
                rowCheck.type = 'checkbox';
                rowCheck.className = 'dv-row-checkbox';
                rowCheck.value = id;
                rowCheck.checked = (this.cfg.selectedRows || []).includes(String(id));
                rowCheck.addEventListener('click', e => e.stopPropagation());
                rowCheck.addEventListener('change', e => {
                    if (this.cfg.onRowCheck) this._invoke(this.cfg.onRowCheck, id, e.target.checked);
                });
                tdCheck.appendChild(dragHandle);
                tdCheck.appendChild(rowCheck);
                tr.appendChild(tdCheck);
                
                if (rowCheck.checked) {
                    tr.style.backgroundColor = 'var(--ion-color-secondary)';
                }

                const tdNum = document.createElement('td');
                tdNum.className = 'dv-td-num';
                tdNum.textContent = String(startIdx + idx + 1);
                tr.appendChild(tdNum);
                
                visibleCols.forEach((col) => {
                    const td = document.createElement('td');
                    let rawVal = row[col.key];

                    // --- JIT Relation Resolver (Extracted) ---
                    rawVal = this._resolveLogicalValue(col.key, rawVal, id);
                    
                    const valStr = typeof rawVal !== "undefined" ? String(rawVal) : '';
                    td.title = valStr;
                    td.appendChild(this._formatValueNode(col.key, rawVal, col));
                    tr.appendChild(td);
                });
                
                // Meta and ID extracted above
                if (!hideActionColumn) {
                    const tdAction = document.createElement('td');
                    tdAction.className = 'dv-td-action';
                    
                    // S18.4 - Hiding Agresivo por Fila (Evaluación Record-Aware)
                    if (!window.ABAC || window.ABAC.can('delete', this.cfg.entityName, id)) {
                        const btnDel = document.createElement('button');
                        btnDel.className = 'dv-btn-icon dv-btn-danger';
                        btnDel.title = 'Eliminar';
                        btnDel.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this._invoke(this.cfg.onDelete, id);
                        });
                        
                        const iconDel = document.createElement('ion-icon');
                        iconDel.setAttribute('name', 'trash');
                        btnDel.appendChild(iconDel);
                        
                        tdAction.appendChild(btnDel);
                    }
                    tr.appendChild(tdAction);
                }
                
                /* Funcionalidad de Reordenamiento Suspendida temporalmente hasta contar con endpoint:
                if (window.DataView_DragDrop) {
                    tr.draggable = true;
                    tr.dataset.rowid = String(id);
                    tr.addEventListener('dragstart', e => window.DataView_DragDrop.onRowDragStart(id, e, tr));
                    tr.addEventListener('dragover', e => window.DataView_DragDrop.onRowDragOver(e));
                    tr.addEventListener('drop', e => window.DataView_DragDrop.onRowDrop(e, tr, this._invoke.bind(this), this.cfg.onRowOrderChange));
                    tr.addEventListener('dragend', e => window.DataView_DragDrop.onRowDragEnd(e, tr));
                }
                */
                
                frag.appendChild(tr);
            });
            
            return frag;
        },

        _renderGridView: function() {
            const rows = this._getPageData();
            if (rows.length === 0) return this._renderEmpty();

            const meta = (window.ENTITY_META && window.ENTITY_META[this.cfg.entityName]) || { titleField: 'nombre', idField: 'id', fkField: null };
            const schemaMeta = window.APP_SCHEMAS && window.APP_SCHEMAS[this.cfg.entityName];
            const MAX_ATTRS = (schemaMeta && schemaMeta.metadata && schemaMeta.metadata.maxListAttrs) || 5;

            const frag = document.createDocumentFragment();
            const grid = document.createElement('ion-grid');
            grid.className = 'dv-ionic-grid';
            const rowEl = document.createElement('ion-row');
            
            rows.forEach(row => {
                const pkField = window.Schema_Utils.getPrimaryKey(this.cfg.entityName);
                const titleStr = row[meta.titleField] || row[pkField] || '—';
                const idStr = String(row[pkField] || '');
                
                const colEl = document.createElement('ion-col');
                colEl.setAttribute('size', '12');
                colEl.setAttribute('size-sm', '6');
                colEl.setAttribute('size-md', '4');
                colEl.setAttribute('size-xl', '3');
                colEl.className = 'dv-grid-col';
                
                const cardEl = document.createElement('ion-card');
                cardEl.className = 'dv-ion-card';
                
                const headerEl = document.createElement('ion-card-header');
                headerEl.className = 'dv-card-header-flex';
                
                const headerTextWrap = document.createElement('div');
                
                const subtitle = document.createElement('ion-card-subtitle');
                subtitle.className = 'dv-code-link';
                subtitle.textContent = idStr;
                
                const title = document.createElement('ion-card-title');
                title.className = 'dv-card-title-clamp';
                title.title = titleStr;
                title.textContent = titleStr;
                
                headerTextWrap.appendChild(subtitle);
                headerTextWrap.appendChild(title);
                headerEl.appendChild(headerTextWrap);
                
                // S18.4 - Hiding Agresivo (Cards Grid)
                if (!window.ABAC || window.ABAC.can('delete', this.cfg.entityName, idStr)) {
                    const btnDel = document.createElement('button');
                    btnDel.className = 'dv-btn-icon dv-btn-danger-lite';
                    btnDel.title = 'Eliminar';
                    btnDel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this._invoke(this.cfg.onDelete, idStr);
                    });
                    const iconDel = document.createElement('ion-icon');
                    iconDel.setAttribute('name', 'trash');
                    btnDel.appendChild(iconDel);
                    headerEl.appendChild(btnDel);
                }
                cardEl.appendChild(headerEl);
                
                const contentEl = document.createElement('ion-card-content');
                const attrsWrap = document.createElement('div');
                attrsWrap.className = 'dv-card-item-attrs';
                // S24.8: Dynamic Mapping for Cards - Solo itera las expuestas como 'visible: true' por el Popover
                const visibleKeys = this.cfg.columns.filter(c => c.visible).map(c => c.key);
                
                const attrKeys = visibleKeys.filter(k => {
                    return k !== meta.titleField && k !== pkField &&
                           !(meta.fkField && k === meta.fkField.key);
                }).slice(0, MAX_ATTRS);
                
                attrKeys.forEach(k => {
                    const attrItem = document.createElement('div');
                    attrItem.className = 'dv-card-item-attr';
                    
                    const attrKey = document.createElement('span');
                    attrKey.className = 'dv-card-item-attr-key';
                    attrKey.textContent = this._labelFromKey(k);
                    
                    const attrVal = document.createElement('span');
                    attrVal.className = 'dv-card-item-attr-val';
                    
                    let rawVal = row[k];
                    // --- JIT Relation Resolver (Extracted) ---
                    rawVal = this._resolveLogicalValue(k, rawVal, idStr);

                    attrVal.appendChild(this._formatValueNode(k, rawVal, this.cfg.columns.find(c => c.key === k)));
                    
                    attrItem.appendChild(attrKey);
                    attrItem.appendChild(attrVal);
                    attrsWrap.appendChild(attrItem);
                });
                
                contentEl.appendChild(attrsWrap);
                
                if (meta.fkField && row[meta.fkField.key]) {
                    const badge = document.createElement('ion-badge');
                    badge.className = 'dv-fk-badge';
                    badge.textContent = `🔗 ${meta.fkField.label}: ${row[meta.fkField.key]}`;
                    contentEl.appendChild(badge);
                }
                
                cardEl.appendChild(contentEl);
                
                // Bug fix: Card entire body selection logic (S25.3)
                cardEl.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    if (idStr) {
                        try {
                            const result = this._invoke(this.cfg.onEdit, idStr);
                            if (result && typeof result.catch === 'function') {
                                result.catch(err => console.error('[UI_DataGrid] Async Error on card click:', err));
                            }
                        } catch (err) {
                            console.error('[UI_DataGrid] Sync Error on card click:', err);
                        }
                    }
                });

                colEl.appendChild(cardEl);
                rowEl.appendChild(colEl);
            });
            
            grid.appendChild(rowEl);
            frag.appendChild(grid);
            
            const footer = document.createElement('div');
            footer.className = 'dv-card-footer';
            footer.appendChild(this._renderPaginationNodes());
            frag.appendChild(footer);
            
            return frag;
        },

        _renderPaginationNodes: function() {
            const frag = document.createDocumentFragment();
            const total = this.cfg.filteredData.length;
            const start = total === 0 ? 0 : (this.cfg.page - 1) * this.cfg.pageSize + 1;
            const end = Math.min(this.cfg.page * this.cfg.pageSize, total);
            const tPages = Math.max(1, Math.ceil(total / this.cfg.pageSize));
            
            const wrapper = document.createElement('div');
            wrapper.className = 'dv-pagination';
            
            const flexGroup = document.createElement('div');
            flexGroup.className = 'dv-flex-group';
            
            const info = window.DOM.create('span', { class: 'dv-pagination-info' }, [
                'Mostrando ',
                window.DOM.create('strong', null, `${start}–${end}`),
                ' de ',
                window.DOM.create('strong', null, `${total}`)
            ]);
            flexGroup.appendChild(info);
            
            const select = document.createElement('select');
            select.className = 'dv-select-minimal';
            [10, 25, 50, 100].forEach(s => {
                const opt = document.createElement('option');
                opt.value = String(s);
                opt.textContent = String(s);
                if (s === this.cfg.pageSize) opt.selected = true;
                select.appendChild(opt);
            });
            select.addEventListener('change', (e) => this._invoke(this.cfg.onPageSize, e.target.value));
            flexGroup.appendChild(select);
            wrapper.appendChild(flexGroup);
            
            const controls = document.createElement('div');
            controls.className = 'dv-pagination-controls';
            
            const buildBtn = (title, text, targetPage, disabled) => {
                const btn = document.createElement('button');
                btn.className = 'dv-page-btn';
                btn.title = title;
                btn.textContent = text;
                if (disabled) btn.disabled = true;
                btn.addEventListener('click', () => this._invoke(this.cfg.onPage, targetPage));
                return btn;
            };
            
            controls.appendChild(buildBtn('Primera', '«', 1, this.cfg.page === 1));
            controls.appendChild(buildBtn('Anterior', '‹', this.cfg.page - 1, this.cfg.page === 1));
            
            const spanInfo = document.createElement('span');
            spanInfo.className = 'dv-page-info';
            spanInfo.textContent = `Pág. ${this.cfg.page} / ${tPages}`;
            controls.appendChild(spanInfo);
            
            controls.appendChild(buildBtn('Siguiente', '›', this.cfg.page + 1, this.cfg.page >= tPages));
            controls.appendChild(buildBtn('Última', '»', tPages, this.cfg.page >= tPages));
            
            wrapper.appendChild(controls);
            frag.appendChild(wrapper);
            return frag;
        },

        /* ── Helpers y Formateadores Nodales ── */
        _getPageData: function() {
            const start = (this.cfg.page - 1) * this.cfg.pageSize;
            return this.cfg.filteredData.slice(start, start + this.cfg.pageSize);
        },

        _slugify: function(str) {
            return (str || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        },

        _badgeClass: function(value) {
            const slug = this._slugify(String(value));
            const map = (window.APP_SCHEMAS && window.APP_SCHEMAS._UI_CONFIG && window.APP_SCHEMAS._UI_CONFIG.badgeMap) || {};
            return `dv-badge dv-badge-${map[slug] || 'default'}`;
        },

        _buildEdgeMemo: function() {
            if (this._edgeMemo) return this._edgeMemo;
            
            const allEdges = (window.DataStore && window.DataStore.get('Sys_Graph_Edges')) || [];
            const memo = { padreToHijo: {}, hijoToPadre: {} };
            
            for (let i = 0; i < allEdges.length; i++) {
                const e = allEdges[i];
                if (e.es_version_actual !== false && e.estado !== 'Eliminado' && e.estado !== 'eliminado') {
                    const edgeName = (e.tipo_relacion || '').toUpperCase();
                    const pKey = String(e.id_nodo_padre) + '_' + edgeName;
                    const hKey = String(e.id_nodo_hijo) + '_' + edgeName;
                    
                    if (!memo.padreToHijo[pKey]) memo.padreToHijo[pKey] = e.id_nodo_hijo;
                    if (!memo.hijoToPadre[hKey]) memo.hijoToPadre[hKey] = e.id_nodo_padre;
                }
            }
            this._edgeMemo = memo;
            return memo;
        },

        _buildTargetMemo: function(entityName, labelKey) {
            this._targetMemo = this._targetMemo || {};
            const memoKey = entityName + '_' + labelKey;
            if (this._targetMemo[memoKey]) return this._targetMemo[memoKey];
            
            const rows = (window.DataStore && window.DataStore.get(entityName)) || [];
            const memo = {};
            for(let i=0; i<rows.length; i++) {
                const r = rows[i];
                const vl = r[labelKey];
                if (vl) {
                    if (r.id_registro) memo[String(r.id_registro)] = vl;
                    if (r.lexical_id) memo[String(r.lexical_id)] = vl;
                }
            }
            this._targetMemo[memoKey] = memo;
            return memo;
        },

        _resolveLogicalValue: function(key, rawVal, currentPK) {
            if (!window.APP_SCHEMAS || !window.APP_SCHEMAS[this.cfg.entityName]) return rawVal;
            
            const schema = window.APP_SCHEMAS[this.cfg.entityName];
            const fieldMeta = (schema.fields || []).find(f => f.name === key);
            
            if (!fieldMeta || fieldMeta.type !== 'relation') return rawVal;
            
            let resolvedVal = rawVal;
            const isEmptyValue = (rawVal === undefined || rawVal === null || rawVal === '');

            // 1. Resolve Graph Edge pointer if it's a Temporal Graph edge AND physically empty
            if (isEmptyValue && fieldMeta.isTemporalGraph && window.DataStore && window.DataStore.get('Sys_Graph_Edges')) {
                const edgeMemo = this._buildEdgeMemo();
                const edgeName = (fieldMeta.graphEdgeType || fieldMeta.name).toUpperCase();
                const lookupKey = String(currentPK) + '_' + edgeName;
                
                if (fieldMeta.relationType === 'padre') {
                    // Yo soy el hijo, busco al padre (Match de hijoToPadre)
                    if (edgeMemo.hijoToPadre[lookupKey]) resolvedVal = edgeMemo.hijoToPadre[lookupKey];
                } else {
                    // Yo soy el padre, busco al hijo
                    if (edgeMemo.padreToHijo[lookupKey]) resolvedVal = edgeMemo.padreToHijo[lookupKey];
                }
            }
            
            // 2. Transmute the physical ID explicitly to the schema's labelField
            if (resolvedVal && window.DataStore && window.DataStore.get(fieldMeta.targetEntity)) {
                const trgLabelKey = fieldMeta.labelField || (window.ENTITY_META && window.ENTITY_META[fieldMeta.targetEntity] && window.ENTITY_META[fieldMeta.targetEntity].titleField) || 'nombre';
                const targetMemo = this._buildTargetMemo(fieldMeta.targetEntity, trgLabelKey);
                
                if (targetMemo[String(resolvedVal)]) {
                    resolvedVal = targetMemo[String(resolvedVal)];
                }
            }
            
            return resolvedVal;
        },

        _formatValueNode: function(key, value, explicitColConfig) {
    const makeEmpty = () => window.DOM.create('span', { class: 'dv-empty-text' }, '—');

    if (value === null || value === undefined || value === '') {
        return makeEmpty();
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return makeEmpty();
        const frag = document.createDocumentFragment();
        
        // OCP: Resolver labelField dinámicamente desde el Schema_Engine
        let dynLabel = null;
        if (this.cfg && this.cfg.entityName && window.APP_SCHEMAS) {
            const schema = window.APP_SCHEMAS[this.cfg.entityName];
            if (schema && schema.fields) {
                const f = schema.fields.find(field => field.name === key);
                if (f) {
                    if (f.labelField) {
                        dynLabel = f.labelField;
                    } else if (f.targetEntity && window.APP_SCHEMAS[f.targetEntity]) {
                        dynLabel = window.APP_SCHEMAS[f.targetEntity].titleField;
                    }
                }
            }
        }

        value.forEach(item => {
            let text = String(item);
            if (typeof item === 'object' && item !== null) {
                if (dynLabel && item[dynLabel] !== undefined) {
                    text = item[dynLabel];
                } else {
                    // Fallback Universal (Agnóstico, OCP)
                    text = item.title || item.name || item.label || Object.values(item).find(v => typeof v === 'string' && !String(v).startsWith('id_') && String(v).length > 0) || '—';
                }
            }
            frag.appendChild(window.DOM.create('span', { class: 'dv-chip' }, text));
            frag.appendChild(document.createTextNode(' '));
        });
        return frag;
    }

    const strVal = String(value);
    let uiType = explicitColConfig ? explicitColConfig.uiType : 'text';
    let isPrimaryKey = explicitColConfig ? explicitColConfig.primaryKey : false;

    // Fallback if colConfig wasn't directly provided
    if (!explicitColConfig && this.cfg && this.cfg.columns) {
        const col = this.cfg.columns.find(c => c.key === key);
        if (col) {
            uiType = col.uiType || 'text';
            isPrimaryKey = col.primaryKey || false;
        }
    }

    // Heuristic fallback
    if (key.startsWith('id_') && isPrimaryKey === false) isPrimaryKey = true;

    if (isPrimaryKey) {
        return window.DOM.create('code', { 
            class: 'dv-pk-code',
            onclick: () => this._invoke(this.cfg.onEdit, strVal)
        }, strVal);
    }

    if (window._LOOKUP_DATA && window._LOOKUP_DATA[key]) {
        const lookupArr = window._LOOKUP_DATA[key];
        const found = lookupArr.find(opt => String(opt.value) === strVal);
        if (found) return document.createTextNode(found.label);
    }

    if (uiType === 'badge') {
        return window.DOM.create('span', { class: this._badgeClass(strVal) }, strVal);
    }

    if (uiType === 'currency') {
        const num = parseFloat(strVal);
        if (!isNaN(num)) return document.createTextNode(`${num.toLocaleString('es-MX')}`);
    }

    if (uiType === 'percentage') {
        const num = parseFloat(strVal);
        if (!isNaN(num)) return document.createTextNode(`${num}%`);
    }

    const outStr = strVal.length > 60 ? `${strVal.substring(0, 58)}…` : strVal;
    return document.createTextNode(outStr);
        },

        _normalizeFields: function(entityName) {
            const schemaDef = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName];
            if (!schemaDef) return null;
            if (Array.isArray(schemaDef)) return schemaDef;
            if (schemaDef.fields) return schemaDef.fields;
            return Object.keys(schemaDef).map(k => Object.assign({ name: k }, schemaDef[k]));
        },

        _labelFromKey: function(key, entityName) {
            const ent = entityName || (this.cfg && this.cfg.entityName);
            const fields = this._normalizeFields(ent);
            if (fields) {
                const field = fields.find(f => f.name === key);
                if (field && field.label) return field.label;
            }
            return window.formatLabelString ? window.formatLabelString(key) : key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
    };