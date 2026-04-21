const fs = require('fs');

let content = fs.readFileSync('src/UI_DataGrid.client.js', 'utf8');

// The file is currently corrupted between _buildEdgeMemo and _extractGraphMetadata mapping.
// Let's replace the whole region from `_buildEdgeMemo: function() {` down to `_buildTargetMemo: function`

const regex = /_buildEdgeMemo:\s*function\(\)\s*\{[\s\S]*?(?=_buildTargetMemo:\s*function)/;

const fixedFunctions = `_buildEdgeMemo: function() {
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

        _extractGraphMetadata: function(row, entityName) {
            const schema = window.APP_SCHEMAS && window.APP_SCHEMAS[entityName];
            if (!schema || !schema.fields) return { singleNodes: [], multiNodes: [] };

            const metaNodes = { singleNodes: [], multiNodes: [] };
            const edgeMemo = this._buildEdgeMemo();
            const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id_registro';
            const rowId = row[pkField];
            
            schema.fields.forEach(field => {
                if (!field.isTemporalGraph) return;
                
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
                    const hKey = String(rowId) + '_' + edgeName;
                    let parentId = edgeMemo.hijoToPadre[hKey];
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
                    const pKey = String(rowId) + '_' + edgeName;
                    const childrenArray = edgeMemo.padreToMultiHijos[pKey] || [];
                    metaNodes.multiNodes.push({ label: entityLabel, count: childrenArray.length, icon: icon });
                }
            });
            return metaNodes;
        },

        `;

content = content.replace(regex, fixedFunctions);

fs.writeFileSync('src/UI_DataGrid.client.js', content, 'utf8');
console.log("Restaurado y actualizado _extractGraphMetadata");
