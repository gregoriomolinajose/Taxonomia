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

        /* ── Helper de Invocación Config-Driven [REMOVIDO S37.7: Ahora usa IoC puro] ── */

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
            
            const pkField = window.Schema_Utils.getPrimaryKey(this.cfg.entityName);
            
            // S40.5: Inyección dinámica controlada por schema gobernado (gridOrder)
            visibleCols.forEach((col) => {
                const colIdx = this.cfg.columns.indexOf(col);

                if (col.uiType === 'system-checkbox') {
                    const thCheck = document.createElement('th');
                    thCheck.className = 'dv-th-check';
                    const selectAll = document.createElement('input');
                    selectAll.type = 'checkbox';
                    const pageIds = rows.map(r => String(r[pkField] || ''));
                    selectAll.checked = pageIds.length > 0 && pageIds.every(id => (this.cfg.selectedRows || []).includes(id));
                    selectAll.addEventListener('change', (e) => {
                        if (typeof this.cfg.onSelectAll === 'function') this.cfg.onSelectAll(e.target.checked);
                    });
                    thCheck.appendChild(selectAll);
                    trHead.appendChild(thCheck);
                    return;
                }

                if (col.uiType === 'system-num') {
                    const thNum = document.createElement('th');
                    thNum.className = 'dv-th-num';
                    thNum.textContent = '#';
                    trHead.appendChild(thNum);
                    return;
                }
                const isSorted = this.cfg.sortCol === col.key;
                
                const th = document.createElement('th');
                if (col.key === 'lexical_id') th.className = 'dv-th-lexical';
                if (isSorted) th.classList.add('sorted');
                th.dataset.colidx = colIdx;
                th.draggable = true;
                
                // Eventos Drag and Drop (Nativos DOM2)
                if (typeof this.cfg.onDragStart === 'function') th.addEventListener('dragstart', (e) => this.cfg.onDragStart(colIdx, e));
                if (typeof this.cfg.onDragOver === 'function') th.addEventListener('dragover', (e) => this.cfg.onDragOver(colIdx, e));
                if (typeof this.cfg.onDragLeave === 'function') th.addEventListener('dragleave', (e) => this.cfg.onDragLeave(e));
                if (typeof this.cfg.onDrop === 'function') th.addEventListener('drop', (e) => this.cfg.onDrop(colIdx, e));
                if (typeof this.cfg.onDragEnd === 'function') th.addEventListener('dragend', (e) => this.cfg.onDragEnd(e));
                
                // Evento Click Sort
                if (typeof this.cfg.onSort === 'function') th.addEventListener('click', () => this.cfg.onSort(col.key));
                
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
                            const result = (typeof this.cfg.onEdit === 'function') ? this.cfg.onEdit(id) : null;
                            if (result && typeof result.catch === 'function') {
                                result.catch(err => console.error('[UI_DataGrid] Async Error on row click:', err));
                            }
                        } catch (err) {
                            console.error('[UI_DataGrid] Sync Error on row click:', err);
                        }
                    }
                });
                
                visibleCols.forEach((col) => {
                    if (col.uiType === 'system-checkbox') {
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
                            if (typeof this.cfg.onRowCheck === 'function') this.cfg.onRowCheck(id, e.target.checked);
                        });
                        tdCheck.appendChild(dragHandle);
                        tdCheck.appendChild(rowCheck);
                        tr.appendChild(tdCheck);
                        if (rowCheck.checked) {
                            tr.style.backgroundColor = 'var(--ion-color-secondary)';
                        }
                        return;
                    }

                    if (col.uiType === 'system-num') {
                        const tdNum = document.createElement('td');
                        tdNum.className = 'dv-td-num';
                        tdNum.textContent = String(startIdx + idx + 1);
                        tr.appendChild(tdNum);
                        return;
                    }

                    const td = document.createElement('td');
                    if (col.key === 'lexical_id') td.className = 'dv-td-lexical';
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
                    
                    if (this.cfg.entityName === 'Taxonomia') {
                        const btnDesign = document.createElement('button');
                        btnDesign.className = 'dv-btn-icon dv-btn-primary';
                        btnDesign.style.marginRight = 'var(--spacing-1)';
                        btnDesign.title = 'Diseñar Jerarquía';
                        btnDesign.addEventListener('click', (e) => {
                            e.stopPropagation();
                            window.AppEventBus.publish('NAV::CHANGE', {viewType: 'taxonomia-canvas', recordId: id});
                        });
                        const iconDesign = document.createElement('ion-icon');
                        iconDesign.setAttribute('name', 'color-wand');
                        btnDesign.appendChild(iconDesign);
                        tdAction.appendChild(btnDesign);
                    }
                    
                    // S18.4 - Hiding Agresivo por Fila (Evaluación Record-Aware)
                    if (!window.ABAC || window.ABAC.can('delete', this.cfg.entityName, id)) {
                        const btnDel = document.createElement('button');
                        btnDel.className = 'dv-btn-icon dv-btn-danger';
                        btnDel.title = 'Eliminar';
                        btnDel.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (typeof this.cfg.onDelete === 'function') this.cfg.onDelete(id);
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

            const meta = (window.ENTITY_META && window.ENTITY_META[this.cfg.entityName]) || { titleField: 'nombre', idField: 'id', fkField: null, iconName: 'cube', color: 'primary' };
            const schemaDef = window.APP_SCHEMAS && window.APP_SCHEMAS[this.cfg.entityName];
            const dCard = (schemaDef && schemaDef.uiConfig && schemaDef.uiConfig.dashboardCard) ? schemaDef.uiConfig.dashboardCard : null;
            
            const frag = document.createDocumentFragment();
            const grid = document.createElement('ion-grid');
            grid.className = 'dv-ionic-grid';
            const rowEl = document.createElement('ion-row');
            
            rows.forEach(row => {
                const pkField = window.Schema_Utils.getPrimaryKey(this.cfg.entityName);
                const titleStr = row[meta.titleField] || row[pkField] || '--';
                const idStr = String(row[pkField] || '');
                const lexIdStr = row['lexical_id'] || idStr;
                
                const colEl = document.createElement('ion-col');
                colEl.setAttribute('size', '12');
                colEl.setAttribute('size-sm', '6');
                colEl.setAttribute('size-md', '4');
                colEl.setAttribute('size-xl', '3');
                colEl.className = 'dv-grid-col';
                
                const cardEl = document.createElement('ion-card');
                cardEl.className = 'dv-ion-card dv-card-grid-modern';
                
                // --- S43.4 Redesigned Card Layout ---
                // Row 1: Top Bar (Lexical ID + Status + Actions)
                const cardTopRow = document.createElement('div');
                cardTopRow.className = 'dv-card-top-row';
                
                const topLeft = document.createElement('div');
                topLeft.className = 'dv-card-top-left';
                
                const lexicalEl = document.createElement('span');
                lexicalEl.className = 'dv-card-lexical-id';
                lexicalEl.textContent = lexIdStr;
                topLeft.appendChild(lexicalEl);
                
                const estadoVal = row.estado || row.status || (row.metadata ? row.metadata.estado : null);
                if (estadoVal) {
                    const statusWrap = document.createElement('div');
                    statusWrap.className = 'dv-card-status-wrap';
                    const isInactive = String(estadoVal).toLowerCase().includes('inactiv');
                    statusWrap.classList.add(isInactive ? 'dv-status--inactive' : 'dv-status--active');
                    
                    const statusDot = document.createElement('div');
                    statusDot.className = 'dv-card-status-dot';
                    const statusText = document.createElement('span');
                    statusText.className = 'dv-card-status-text';
                    statusText.textContent = estadoVal;
                    
                    statusWrap.appendChild(statusDot);
                    statusWrap.appendChild(statusText);
                    topLeft.appendChild(statusWrap);
                }
                cardTopRow.appendChild(topLeft);
                
                const topRight = document.createElement('div');
                topRight.className = 'dv-card-top-right';
                
                if (this.cfg.entityName === 'Taxonomia') {
                    const btnDesign = document.createElement('button');
                    btnDesign.className = 'dv-btn-primary-lite';
                    btnDesign.title = 'Diseñar Jerarquía';
                    btnDesign.style.padding = '4px 6px';
                    btnDesign.style.borderRadius = '4px';
                    btnDesign.style.marginRight = '4px';
                    btnDesign.addEventListener('click', (e) => {
                        e.stopPropagation();
                        window.AppEventBus.publish('NAV::CHANGE', {viewType: 'taxonomia-canvas', recordId: idStr});
                    });
                    const iconDesign = document.createElement('ion-icon');
                    iconDesign.setAttribute('name', 'color-wand');
                    btnDesign.appendChild(iconDesign);
                    topRight.appendChild(btnDesign);
                }
                
                if (!window.ABAC || window.ABAC.can('delete', this.cfg.entityName, idStr)) {
                    const btnDel = document.createElement('button');
                    btnDel.className = 'dv-btn-danger-lite';
                    btnDel.title = 'Eliminar';
                    btnDel.style.padding = '4px 6px';
                    btnDel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (typeof this.cfg.onDelete === 'function') this.cfg.onDelete(idStr);
                    });
                    const iconDel = document.createElement('ion-icon');
                    iconDel.setAttribute('name', 'trash');
                    btnDel.appendChild(iconDel);
                    topRight.appendChild(btnDel);
                }
                cardTopRow.appendChild(topRight);
                cardEl.appendChild(cardTopRow);

                // Row 2: Profile (Avatar + Title + First Subtitle)
                const profileRow = document.createElement('div');
                profileRow.className = 'dv-card-profile-row';
                
                const badgeEl = document.createElement('div');
                if (meta.color) { 
                    badgeEl.style.setProperty('--dv-primary', `var(--ion-color-${meta.color}, ${meta.color})`);
                    badgeEl.style.setProperty('--dv-primary-light', `rgba(var(--ion-color-${meta.color}-rgb, 28, 66, 232), 0.15)`);
                }
                badgeEl.className = 'dv-badge-circular dv-badge-lg';
                
                const baseIcon = meta.iconName ? meta.iconName.replace('-outline', '') : 'cube';
                const avatarVal = (dCard && dCard.avatarField) ? row[dCard.avatarField] : null;
                
                if (avatarVal && String(avatarVal).startsWith('http')) {
                    const imgAvatar = document.createElement('img');
                    imgAvatar.src = avatarVal;
                    imgAvatar.style.width = '100%';
                    imgAvatar.style.height = '100%';
                    imgAvatar.style.borderRadius = '50%';
                    imgAvatar.style.objectFit = 'cover';
                    badgeEl.appendChild(imgAvatar);
                    badgeEl.style.background = 'transparent';
                    badgeEl.style.boxShadow = 'var(--dv-elevation-1)';
                } else {
                    const iconBadge = document.createElement('ion-icon');
                    iconBadge.setAttribute('name', baseIcon);
                    badgeEl.appendChild(iconBadge);
                }
                profileRow.appendChild(badgeEl);
                
                const profileInfo = document.createElement('div');
                profileInfo.className = 'dv-card-profile-info';
                
                const h3Title = document.createElement('h3');
                h3Title.className = 'dv-card-hero-title dv-title-2-lines';
                h3Title.textContent = titleStr;
                h3Title.title = titleStr;
                profileInfo.appendChild(h3Title);
                
                profileRow.appendChild(profileInfo);
                cardEl.appendChild(profileRow);
                
                // Row 3 & 4: Subtitles (Email, Departamento)
                if (dCard && dCard.subtitleFields && dCard.subtitleFields.length > 0) {
                    dCard.subtitleFields.forEach((subItem, index) => {
                        if (row[subItem.field]) {
                            const subWrap = document.createElement('div');
                            // First subtitle (Email) 1-line, others 2-lines
                            const lineClass = index === 0 ? 'dv-title-1-line' : 'dv-title-2-lines';
                            subWrap.className = `dv-card-department ${lineClass}`;
                            
                            if (subItem.icon) {
                                const sIcon = document.createElement('ion-icon');
                                sIcon.setAttribute('name', subItem.icon);
                                subWrap.appendChild(sIcon);
                            }
                            subWrap.appendChild(document.createTextNode(row[subItem.field]));
                            cardEl.appendChild(subWrap);
                        }
                    });
                }
                
                // Extract Graphs
                let graphData = this._extractGraphMetadata(row, this.cfg.entityName);
                let cargoNodes = [];
                let otherSingleNodes = [];
                
                graphData.singleNodes.forEach(node => {
                    const l = node.label ? String(node.label).toLowerCase() : '';
                    if (l.includes('cargo')) cargoNodes.push(node);
                    else otherSingleNodes.push(node);
                });
                
                // Row 4: Cargo
                cargoNodes.forEach(cNode => {
                    const cargoWrap = document.createElement('div');
                    cargoWrap.className = 'dv-card-cargo dv-title-1-line';
                    const sIcon = document.createElement('ion-icon');
                    sIcon.setAttribute('name', cNode.icon.includes('-outline') ? cNode.icon : cNode.icon + '-outline');
                    cargoWrap.appendChild(sIcon);
                    
                    const cargoVal = String(cNode.value !== undefined ? cNode.value : cNode.count);
                    cargoWrap.appendChild(document.createTextNode(cargoVal));
                    cardEl.appendChild(cargoWrap);
                });
                
                // Row 5: Division
                if (otherSingleNodes.length > 0 || graphData.multiNodes.length > 0) {
                    const sep = document.createElement('hr');
                    sep.className = 'dv-card-graph-sep';
                    cardEl.appendChild(sep);
                }
                
                // Row 6 & 7: Graph Pills
                const graphWrap = document.createElement('div');
                graphWrap.className = 'dv-card-graph-nodes';
                
                const buildNode = (nodeObj) => {
                    const rowNode = document.createElement('div');
                    rowNode.className = 'dv-node-pill';
                    if (nodeObj.count === 0) rowNode.classList.add('dv-node-empty');
                    
                    const ndIcon = document.createElement('ion-icon');
                    const oIcon = nodeObj.icon.includes('-outline') ? nodeObj.icon : nodeObj.icon + '-outline';
                    ndIcon.setAttribute('name', oIcon);
                    
                    const ndTextWrap = document.createElement('span');
                    ndTextWrap.className = 'dv-node-text-wrap';
                    
                    const ndLabel = document.createElement('span');
                    ndLabel.className = 'dv-node-label';
                    const fullLabel = nodeObj.label || '';
                    ndLabel.textContent = fullLabel.split(' ')[0];
                    
                    const ndVal = document.createElement('span');
                    ndVal.className = 'dv-node-value';
                    ndVal.textContent = String(nodeObj.value !== undefined ? nodeObj.value : nodeObj.count);
                    
                    ndTextWrap.appendChild(ndLabel);
                    ndTextWrap.appendChild(ndVal);
                    
                    rowNode.appendChild(ndIcon);
                    rowNode.appendChild(ndTextWrap);
                    return rowNode;
                };

                otherSingleNodes.forEach(node => graphWrap.appendChild(buildNode(node)));
                graphData.multiNodes.forEach(node => graphWrap.appendChild(buildNode(node)));
                
                if (graphWrap.childNodes.length > 0) {
                    cardEl.appendChild(graphWrap);
                }
                
                cardEl.addEventListener('click', (e) => {
                    if (e.target.closest('button')) return;
                    if (idStr) {
                        try {
                            const result = (typeof this.cfg.onEdit === 'function') ? this.cfg.onEdit(idStr) : null;
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
            
            // Fix: Wrap grid to enable Y-axis scrolling in flex layout
            const gridScrollWrap = document.createElement('div');
            gridScrollWrap.className = 'dv-grid-scroll-wrap';
            gridScrollWrap.style.flex = '1';
            gridScrollWrap.style.overflowY = 'auto';
            gridScrollWrap.style.overflowX = 'hidden';
            
            // S42.3 FAB Button (Local per render to avoid stale closures)
            const fabTopBtn = document.createElement('button');
            fabTopBtn.className = 'dv-fab-top';
            fabTopBtn.innerHTML = '<ion-icon name="chevron-up"></ion-icon>';
            fabTopBtn.addEventListener('click', () => {
                gridScrollWrap.scrollTo({ top: 0, behavior: 'smooth' });
            });
            
            // S42.2: Implementación de Scroll Infinito
            gridScrollWrap.addEventListener('scroll', (e) => {
                const target = e.target;
                
                if (target.scrollTop > 300) {
                    fabTopBtn.classList.add('active');
                } else {
                    fabTopBtn.classList.remove('active');
                }
                
                if (typeof this.cfg.onGridScroll === 'function') {
                    this.cfg.onGridScroll(target.scrollTop);
                }
                
                if (target.scrollHeight - target.scrollTop - target.clientHeight < 150) {
                    if (this._scrollIsFetching) return;
                    if (this.cfg.filteredData && this.cfg.pageSize < this.cfg.filteredData.length) {
                        this._scrollIsFetching = true; // Lock recursión
                        if (typeof this.cfg.onPageSize === 'function') {
                            this.cfg.onPageSize(this.cfg.pageSize + 25);
                        }
                    }
                }
            }, { passive: true });

            // Restore scroll momentum
            if (this.cfg.lastGridScroll !== undefined) {
                setTimeout(() => { 
                    gridScrollWrap.scrollTop = this.cfg.lastGridScroll; 
                    if (this.cfg.lastGridScroll > 300) fabTopBtn.classList.add('active');
                    this._scrollIsFetching = false; 
                }, 0);
            }
            
            gridScrollWrap.appendChild(grid);
            
            // Wrapper temporal en el fragmento
            const wrapperZone = document.createElement('div');
            wrapperZone.style.display = 'flex';
            wrapperZone.style.flexDirection = 'column';
            wrapperZone.style.flex = '1';
            wrapperZone.style.position = 'relative'; 
            wrapperZone.style.minHeight = '0';
            
            wrapperZone.appendChild(fabTopBtn);
            wrapperZone.appendChild(gridScrollWrap);
            
            frag.appendChild(wrapperZone);
            
            // Paginación física eliminada en favor del Lazy Load (S42.2)
            
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
            select.addEventListener('change', (e) => {
                if (typeof this.cfg.onPageSize === 'function') this.cfg.onPageSize(e.target.value);
            });
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
                btn.addEventListener('click', () => {
                    if (typeof this.cfg.onPage === 'function') this.cfg.onPage(targetPage);
                });
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
            // [S49.14] Deprecated in favor of centralized window.Graph_Utils index.
            // Keeping stub to avoid crashes if external plugins call this.
            return null;
        },

        _extractGraphMetadata: function(row, entityName) {
            const schema = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName];
            if (!schema || !schema.fields) return { singleNodes: [], multiNodes: [] };

            const metaNodes = { singleNodes: [], multiNodes: [] };
            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id_registro';
            const rowId = row[pkField];
            
            schema.fields.forEach(field => {
                if (!field.isTemporalGraph || !window.Graph_Utils) return;
                
                const edgeName = (field.graphEdgeType || field.name).toUpperCase();
                const targetSchema = window.APP_SCHEMAS[field.targetEntity];
                const icon = targetSchema && targetSchema.metadata ? targetSchema.metadata.iconName : 'git-network-outline';
                const entityLabel = field.label || field.name;

                // Attempt to extract joined label preemptively from row[field.name]
                let joinedLabel = null;
                const rowVal = row[field.name];
                if (rowVal) {
                    if (Array.isArray(rowVal) && rowVal.length > 0) {
                        joinedLabel = rowVal[0].nombre || rowVal[0].title || rowVal[0].label || rowVal[0].lexical_id || null;
                    } else if (typeof rowVal === 'object' && rowVal !== null) {
                        joinedLabel = rowVal.nombre || rowVal.title || rowVal.label || rowVal.lexical_id || null;
                    } else if (typeof rowVal === 'string' && !rowVal.startsWith('id_') && !rowVal.match(/^[0-9A-F]{8}-[0-9A-F]{4}/i)) {
                        joinedLabel = rowVal;
                    }
                }

                if (field.relationType === 'padre') {
                    let parentId = window.Graph_Utils.resolveLinkedId(rowId, edgeName);
                    if (parentId || joinedLabel) {
                        const trgLabelKey = field.labelField || (window.ENTITY_META && window.ENTITY_META[field.targetEntity] && window.ENTITY_META[field.targetEntity].titleField) || 'nombre';
                        const targetMemo = this._buildTargetMemo(field.targetEntity, trgLabelKey);
                        
                        let parentName = joinedLabel;
                        if (!parentName) {
                            if (parentId && targetMemo[String(parentId)]) parentName = targetMemo[String(parentId)];
                            else if (rowVal && typeof rowVal === 'string' && targetMemo[rowVal]) parentName = targetMemo[rowVal];
                            else parentName = parentId || rowVal;
                        }
                        
                        metaNodes.singleNodes.push({ label: entityLabel, value: parentName, icon: icon });
                    }
                } else if (field.relationType === 'hijo' && field.topologyCardinality === '1:N') {
                    const childrenArray = window.Graph_Utils.resolveAllLinkedIds(rowId, edgeName);
                    metaNodes.multiNodes.push({ label: entityLabel, count: childrenArray.length, icon: icon });
                }
            });
            return metaNodes;
        },

        _buildTargetMemo: function(entityName, labelKey) {
            this._targetMemo = this._targetMemo || {};
            const memoKey = entityName + '_' + labelKey;
            if (this._targetMemo[memoKey]) return this._targetMemo[memoKey];
            
            const rows = (window.DataStore && window.DataStore.get(entityName)) || [];
            const memo = {};
            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id_registro';
            
            for(let i=0; i<rows.length; i++) {
                const r = rows[i];
                const vl = r[labelKey];
                if (vl) {
                    if (r.id_registro) memo[String(r.id_registro)] = vl;
                    if (r.lexical_id) memo[String(r.lexical_id)] = vl;
                    if (r[pkField]) memo[String(r[pkField])] = vl;
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
            if (isEmptyValue && fieldMeta.isTemporalGraph && window.Graph_Utils) {
                const edgeName = (fieldMeta.graphEdgeType || fieldMeta.name).toUpperCase();
                resolvedVal = window.Graph_Utils.resolveLinkedId(currentPK, edgeName);
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
            if (window.formatLabelString) return window.formatLabelString(key);
            return key.replace(/_/g, ' ').split(' ').map(function(w) { return w ? w.charAt(0).toUpperCase() + w.slice(1) : ''; }).join(' ');
        }
    };