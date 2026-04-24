const fs = require('fs');
let content = fs.readFileSync('src/UI_DataGrid.client.js', 'utf8');

const buildEdgeStart = content.indexOf('_buildEdgeMemo: function() {');
const buildEdgeEnd = content.indexOf('return memo;\n        },', buildEdgeStart) + 'return memo;\n        },'.length;

const renderGridStart = content.indexOf('_renderGridView: function() {');
const renderGridEnd = content.indexOf('return frag;\n        },', renderGridStart) + 'return frag;\n        },'.length;

const startP1 = content.substring(0, renderGridStart);
const endP1 = content.substring(renderGridEnd);

const replacementRenderGrid = `_renderGridView: function() {
            const rows = this._getPageData();
            if (rows.length === 0) return this._renderEmpty();

            const meta = (window.ENTITY_META && window.ENTITY_META[this.cfg.entityName]) || { titleField: 'nombre', idField: 'id', fkField: null, iconName: 'folder-outline', color: 'primary' };
            
            const frag = document.createDocumentFragment();
            const grid = document.createElement('ion-grid');
            grid.className = 'dv-ionic-grid';
            const rowEl = document.createElement('ion-row');
            
            rows.forEach(row => {
                const pkField = window.Schema_Utils.getPrimaryKey(this.cfg.entityName);
                const titleStr = row[meta.titleField] || row[pkField] || '—';
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
                
                if (!window.ABAC || window.ABAC.can('delete', this.cfg.entityName, idStr)) {
                    const btnDel = document.createElement('button');
                    btnDel.className = 'dv-kebab-menu';
                    btnDel.title = 'Eliminar';
                    btnDel.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (typeof this.cfg.onDelete === 'function') this.cfg.onDelete(idStr);
                    });
                    const iconDel = document.createElement('ion-icon');
                    iconDel.setAttribute('name', 'ellipsis-vertical');
                    btnDel.appendChild(iconDel);
                    cardEl.appendChild(btnDel);
                }

                const heroWrap = document.createElement('div');
                heroWrap.className = 'dv-card-hero';
                
                const lexicalEl = document.createElement('span');
                lexicalEl.className = 'dv-card-lexical-id';
                lexicalEl.textContent = lexIdStr;
                heroWrap.appendChild(lexicalEl);
                
                const heroTitleWrap = document.createElement('div');
                heroTitleWrap.className = 'dv-card-entity-title';
                
                const badgeEl = document.createElement('ion-badge');
                // Use architecture tokens -> ion-badge uses color="" attr natively.
                if (meta.color) { badgeEl.setAttribute('color', meta.color); }
                badgeEl.className = 'dv-badge-circular';
                
                const baseIcon = meta.iconName ? meta.iconName.replace('-outline', '') : 'folder';
                const iconBadge = document.createElement('ion-icon');
                iconBadge.setAttribute('name', baseIcon);
                badgeEl.appendChild(iconBadge);
                
                const h3Title = document.createElement('h3');
                h3Title.textContent = titleStr;
                h3Title.title = titleStr;
                
                heroTitleWrap.appendChild(badgeEl);
                heroTitleWrap.appendChild(h3Title);
                
                heroWrap.appendChild(heroTitleWrap);
                cardEl.appendChild(heroWrap);

                let graphData = this._extractGraphMetadata(idStr, this.cfg.entityName);
                
                if (graphData.singleNodes.length > 0 || graphData.multiNodes.length > 0) {
                    const sep = document.createElement('hr');
                    sep.className = 'dv-card-graph-sep';
                    cardEl.appendChild(sep);
                }

                const graphWrap = document.createElement('div');
                graphWrap.className = 'dv-card-graph-nodes';
                
                graphData.singleNodes.forEach(node => {
                    const rowNode = document.createElement('div');
                    rowNode.className = 'dv-node-row';
                    
                    const ndIcon = document.createElement('ion-icon');
                    const oIcon = node.icon.includes('-outline') ? node.icon : node.icon + '-outline';
                    ndIcon.setAttribute('name', oIcon);
                    
                    const ndLabel = document.createElement('span');
                    ndLabel.className = 'dv-node-label';
                    ndLabel.textContent = node.label + ':';
                    
                    const ndVal = document.createElement('span');
                    ndVal.className = 'dv-node-value';
                    ndVal.textContent = node.value;
                    
                    rowNode.appendChild(ndIcon);
                    rowNode.appendChild(ndLabel);
                    rowNode.appendChild(ndVal);
                    graphWrap.appendChild(rowNode);
                });

                graphData.multiNodes.forEach(node => {
                    const rowNode = document.createElement('div');
                    rowNode.className = 'dv-node-row';
                    if (node.count === 0) rowNode.classList.add('dv-node-empty');
                    
                    const ndIcon = document.createElement('ion-icon');
                    const oIcon = node.icon.includes('-outline') ? node.icon : node.icon + '-outline';
                    ndIcon.setAttribute('name', oIcon);
                    
                    const ndLabel = document.createElement('span');
                    ndLabel.className = 'dv-node-label';
                    ndLabel.textContent = node.label + ':';
                    
                    const ndVal = document.createElement('span');
                    ndVal.className = 'dv-node-value';
                    ndVal.textContent = String(node.count);
                    
                    rowNode.appendChild(ndIcon);
                    rowNode.appendChild(ndLabel);
                    rowNode.appendChild(ndVal);
                    graphWrap.appendChild(rowNode);
                });

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
            frag.appendChild(grid);
            
            const footer = document.createElement('div');
            footer.className = 'dv-card-footer';
            footer.appendChild(this._renderPaginationNodes());
            frag.appendChild(footer);
            
            return frag;
        },`;

content = startP1 + replacementRenderGrid + endP1;

const buildEdgeStart2 = content.indexOf('_buildEdgeMemo: function() {');
const buildEdgeEnd2 = content.indexOf('return memo;\n        },', buildEdgeStart2) + 'return memo;\n        },'.length;

const startP2 = content.substring(0, buildEdgeStart2);
const endP2 = content.substring(buildEdgeEnd2);

const replacementBuildEdge = `_buildEdgeMemo: function() {
            if (this._edgeMemo) return this._edgeMemo;
            
            const allEdges = (window.DataStore && window.DataStore.get('Sys_Graph_Edges')) || [];
            const memo = { padreToHijo: {}, hijoToPadre: {}, padreToMultiHijos: {} };
            
            for (let i = 0; i < allEdges.length; i++) {
                const e = allEdges[i];
                if (e.es_version_actual !== false && e.estado !== 'Eliminado' && e.estado !== 'eliminado') {
                    const edgeName = (e.tipo_relacion || '').toUpperCase();
                    const pKey = String(e.id_nodo_padre) + '_' + edgeName;
                    const hKey = String(e.id_nodo_hijo) + '_' + edgeName;
                    
                    if (!memo.padreToHijo[pKey]) memo.padreToHijo[pKey] = e.id_nodo_hijo;
                    if (!memo.hijoToPadre[hKey]) memo.hijoToPadre[hKey] = e.id_nodo_padre;
                    
                    if (!memo.padreToMultiHijos[pKey]) memo.padreToMultiHijos[pKey] = [];
                    memo.padreToMultiHijos[pKey].push(e.id_nodo_hijo);
                }
            }
            this._edgeMemo = memo;
            return memo;
        },

        _extractGraphMetadata: function(rowId, entityName) {
            const schema = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName];
            if (!schema || !schema.fields) return { singleNodes: [], multiNodes: [] };

            const metaNodes = { singleNodes: [], multiNodes: [] };
            const edgeMemo = this._buildEdgeMemo();
            
            schema.fields.forEach(field => {
                if (!field.isTemporalGraph) return;
                
                const edgeName = (field.graphEdgeType || field.name).toUpperCase();
                const targetSchema = window.APP_SCHEMAS[field.targetEntity];
                const icon = targetSchema && targetSchema.metadata ? targetSchema.metadata.iconName : 'git-network-outline';
                const entityLabel = field.label || field.name;

                if (field.relationType === 'padre') {
                    const hKey = String(rowId) + '_' + edgeName;
                    let parentId = edgeMemo.hijoToPadre[hKey];
                    if (parentId) {
                        const trgLabelKey = field.labelField || (window.ENTITY_META && window.ENTITY_META[field.targetEntity] && window.ENTITY_META[field.targetEntity].titleField) || 'nombre';
                        const targetMemo = this._buildTargetMemo(field.targetEntity, trgLabelKey);
                        let parentName = targetMemo[String(parentId)] || parentId;
                        metaNodes.singleNodes.push({ label: entityLabel, value: parentName, icon: icon });
                    }
                } else if (field.relationType === 'hijo' && field.topologyCardinality === '1:N') {
                    const pKey = String(rowId) + '_' + edgeName;
                    const childrenArray = edgeMemo.padreToMultiHijos[pKey] || [];
                    metaNodes.multiNodes.push({ label: entityLabel, count: childrenArray.length, icon: icon });
                }
            });
            return metaNodes;
        },`;

content = startP2 + replacementBuildEdge + endP2;

fs.writeFileSync('src/UI_DataGrid.client.js', content);
console.log('Patched UI_DataGrid.client.js');
