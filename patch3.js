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
                if (meta.color) { badgeEl.setAttribute('color', meta.color); }
                badgeEl.className = 'dv-badge-circular';
                
                const baseIcon = meta.iconName ? meta.iconName.replace('-outline', '') : 'cube';
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

        content = before + replacement + after;
        console.log("RenderGrid replaced");
    } else {
        console.log("Could not match end for renderGrid");
    }
}

fs.writeFileSync('src/UI_DataGrid.client.js', content);
