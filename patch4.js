const fs = require('fs');
let content = fs.readFileSync('src/UI_DataGrid.client.js', 'utf8');

const startIdx = content.indexOf('_renderGridView: function() {');
if (startIdx !== -1) {
    const endMatch = content.slice(startIdx).match(/return frag;[\r\n\s]+},/);
    if (endMatch) {
        const endIdx = startIdx + endMatch.index + endMatch[0].length;
        
        const before = content.substring(0, startIdx);
        const after = content.substring(endIdx);
        
        const replacement = `_renderGridView: function() {
            const rows = this._getPageData();
            if (rows.length === 0) return this._renderEmpty();

            const meta = (window.ENTITY_META && window.ENTITY_META[this.cfg.entityName]) || { titleField: 'nombre', idField: 'id', fkField: null, iconName: 'cube', color: 'primary' };
            
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
                
                // 1. Top Bar
                const topBar = document.createElement('div');
                topBar.className = 'dv-card-top-bar';
                
                const badgeEl = document.createElement('ion-badge');
                if (meta.color) { badgeEl.setAttribute('color', meta.color); }
                badgeEl.className = 'dv-badge-circular';
                
                const baseIcon = meta.iconName ? meta.iconName.replace('-outline', '') : 'cube';
                const iconBadge = document.createElement('ion-icon');
                iconBadge.setAttribute('name', baseIcon);
                badgeEl.appendChild(iconBadge);
                topBar.appendChild(badgeEl);
                
                const topActions = document.createElement('div');
                topActions.className = 'dv-card-top-actions';
                
                const lexicalEl = document.createElement('span');
                lexicalEl.className = 'dv-card-lexical-id';
                lexicalEl.textContent = lexIdStr;
                topActions.appendChild(lexicalEl);
                
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
                    topActions.appendChild(btnDel);
                }
                
                topBar.appendChild(topActions);
                cardEl.appendChild(topBar);

                // 2. Hero Body
                const heroWrap = document.createElement('div');
                heroWrap.className = 'dv-card-hero';
                
                const h3Title = document.createElement('h3');
                h3Title.className = 'dv-card-hero-title';
                h3Title.textContent = titleStr;
                h3Title.title = titleStr;
                heroWrap.appendChild(h3Title);
                
                cardEl.appendChild(heroWrap);

                // 3. Footer (Graphs)
                let graphData = this._extractGraphMetadata(idStr, this.cfg.entityName);
                
                if (graphData.singleNodes.length > 0 || graphData.multiNodes.length > 0) {
                    const sep = document.createElement('hr');
                    sep.className = 'dv-card-graph-sep';
                    cardEl.appendChild(sep);
                }

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
                    ndLabel.textContent = nodeObj.label + ':';
                    
                    const ndVal = document.createElement('span');
                    ndVal.className = 'dv-node-value';
                    ndVal.textContent = String(nodeObj.value !== undefined ? nodeObj.value : nodeObj.count);
                    
                    ndTextWrap.appendChild(ndLabel);
                    ndTextWrap.appendChild(ndVal);
                    
                    rowNode.appendChild(ndIcon);
                    rowNode.appendChild(ndTextWrap);
                    return rowNode;
                };

                graphData.singleNodes.forEach(node => graphWrap.appendChild(buildNode(node)));
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
            frag.appendChild(grid);
            
            const footer = document.createElement('div');
            footer.className = 'dv-card-footer';
            footer.appendChild(this._renderPaginationNodes());
            frag.appendChild(footer);
            
            return frag;
        },`;

        content = before + replacement + after;
        console.log("RenderGrid replaced with Premium structure");
    } else {
        console.log("Could not match end for renderGrid");
    }
}

fs.writeFileSync('src/UI_DataGrid.client.js', content);
