/* ============================================================
       DataEngine_UI.html — Motor Matemático y E/S Masiva (CSV)
       Incluido via GAS: <?!= include('DataEngine_UI'); ?>
       
       Módulo Puro: Contiene toda la heurística in-memory para procesar
       arreglos y transformar formatos (CSV) apartándola del DOM.
       ============================================================ */

    window.DataEngine = {

        /**
         * Aplica un filtro tipo "Open Text" a todo el registro.
         * @param {Array} data Arreglo de datos crudos.
         * @param {string} query Término de búsqueda.
         * @returns {Array} Arreglo filtrado inmutable.
         */
        applyFilter: function(data, query) {
            const arr = data || [];
            if (!query || !query.trim()) {
                return [...arr];
            }
            const q = query.trim().toLowerCase();
            return arr.filter(row =>
                row && Object.values(row).some(v => String(v).toLowerCase().includes(q))
            );
        },

        /**
         * Aplica ordenamiento dinámico a un arreglo.
         * @param {Array} data Arreglo de datos.
         * @param {string} colKey Llave de columna a ordenar.
         * @param {string} sortDir 'asc' o 'desc'.
         * @returns {Array} Arreglo ordenado mutado (sorter in-place nativo)
         */
        applySort: function(data, colKey, sortDir) {
            const arr = data || [];
            return arr.sort((a, b) => {
                const extractVal = (val) => {
                    if (Array.isArray(val) && val.length > 0) {
                        const item = val[0];
                        if (typeof item === 'object' && item !== null) {
                            return item.nombre || item.name || item.label || item.nombre_producto || '';
                        }
                    }
                    return String(val ?? '');
                };
                const av = extractVal(a[colKey]).toLowerCase();
                const bv = extractVal(b[colKey]).toLowerCase();
                const cmp = av.localeCompare(bv, 'es', { numeric: true });
                return sortDir === 'asc' ? cmp : -cmp;
            });
        },

        /**
         * Universal Sheet Exporter
         * @param {string} entityName
         * @param {Array} columns Arreglo de columnas [{key, label, visible}] 
         * @param {Array} rows Datos a exportar.
         */
        exportToSheet: async function(entityName, columns, rows) {
            if (!entityName || !columns || columns.length === 0) {
                if (window.showGlobalToast) window.showGlobalToast('No hay configuración de columnas.', 'warning');
                return;
            }
            
            // Remove existing loaders to prevent duplicates
            document.querySelectorAll('ion-loading.loader-export').forEach(el => el.remove());
            
            const loading = document.createElement('ion-loading');
            loading.className = 'loader-export';
            loading.message = 'Creando hoja de cálculo en Drive...';
            document.body.appendChild(loading);
            await loading.present();

            // S25.3 Fix: Hydrate logic graph fields into raw rows for export
            let exportRows = rows;
            if (window.APP_SCHEMAS && window.APP_SCHEMAS[entityName] && window.Graph_Utils && window.DataStore) {
                const schema = window.APP_SCHEMAS[entityName];
                const relFields = (schema.fields || []).filter(f => f.type === 'relation');
                
                if (relFields.length > 0) {
                    const pkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : 'id_registro';
                    exportRows = rows.map(r => {
                        const newR = { ...r };
                        relFields.forEach(f => {
                            if (f.isTemporalGraph) {
                                const edgeName = (f.graphEdgeType || f.name).toUpperCase();
                                const linkedIds = window.Graph_Utils.resolveAllLinkedIds(r[pkField], edgeName, null, false, f.relationType);
                                
                                if (linkedIds && linkedIds.length > 0) {
                                    const trgLabelKey = f.labelField || (window.ENTITY_META && window.ENTITY_META[f.targetEntity] && window.ENTITY_META[f.targetEntity].titleField) || 'nombre';
                                    const targetRows = window.DataStore.get(f.targetEntity) || [];
                                    const trgPkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(f.targetEntity) : 'id_registro';
                                    
                                    const labels = linkedIds.map(id => {
                                        const tRow = targetRows.find(tr => String(tr[trgPkField]) === String(id) || String(tr.lexical_id) === String(id) || String(tr.id_registro) === String(id));
                                        return tRow ? tRow[trgLabelKey] : id;
                                    });
                                    
                                    newR[f.name] = labels.join(', ');
                                } else {
                                    newR[f.name] = '';
                                }
                            } else if (newR[f.name]) {
                                // Normal FK Relation
                                const val = newR[f.name];
                                const trgLabelKey = f.labelField || (window.ENTITY_META && window.ENTITY_META[f.targetEntity] && window.ENTITY_META[f.targetEntity].titleField) || 'nombre';
                                const targetRows = window.DataStore.get(f.targetEntity) || [];
                                const trgPkField = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(f.targetEntity) : 'id_registro';
                                const tRow = targetRows.find(tr => String(tr[trgPkField]) === String(val) || String(tr.lexical_id) === String(val) || String(tr.id_registro) === String(val));
                                if (tRow) newR[f.name] = tRow[trgLabelKey];
                            }
                        });
                        return newR;
                    });
                }
            }

            window.DataAPI.call('API_Universal_Router', 'etl_export_sheet', entityName, { columns, rows: exportRows })
                .then(res => {
                    loading.dismiss();
                    if (res && res.data) {
                        const newWin = window.open(res.data, '_blank');
                        if (newWin) {
                            if (window.showGlobalToast) window.showGlobalToast('¡Exportación Creada en tu Drive!', 'success');
                        } else {
                            if (window.showGlobalToast) window.showGlobalToast('Exportación creada, pero tu navegador bloqueó la pestaña. Desactiva el bloqueador de pop-ups.', 'warning');
                        }
                    }
                })
                .catch(err => {
                    loading.dismiss();
                    if (window.showGlobalToast) window.showGlobalToast('Fallo crítico al exportar: ' + err.message, 'danger');
                });
        },

        /**
         * CSV Parser and Bulk Uploader
         * @param {Event} event Evento del <input type="file">
         * @param {string} entityName Entidad destino
         * @param {Function} onLoadingStart Callback inicio UI
         * @param {Function} onSuccess Callback finalización (Ej. refetch, render)
         * @param {Function} onError Callback en caso de falla
         */
        importCSV: function(event, entityName, onLoadingStart, onSuccess, onError) {
            const file = event.target.files[0];
            if (!file) return;

            if (confirm(`Estás a punto de procesar y cargar un archivo por lotes a la entidad '${entityName}'. ¿Deseas continuar?`)) {
                if (window.DataEngine_ETL && window.DataEngine_ETL.processFile) {
                    let loadingUi;
                    
                    window.DataEngine_ETL.processFile(file, entityName, function onProgress(chunkIndex, totalChunks, isDone) {
                        // Unificamos progreso en la barra visual del modal y omitimos blockeos innecesarios en pantalla (H10)
                        if (window.UI_ETL_Modal && window.UI_ETL_Modal.updateProgress) {
                            window.UI_ETL_Modal.updateProgress(chunkIndex, totalChunks);
                        }
                        if (chunkIndex === 1 && onLoadingStart) {
                            onLoadingStart(); 
                        }
                    }).then(() => {
                        event.target.value = ''; // Reset input
                        if (window.DataStore) window.DataStore.set(entityName, null);
                        if (onSuccess) onSuccess('múltiples'); 
                    }).catch(err => {
                        event.target.value = ''; // Reset input
                        if (onError) onError(err.message || 'Error de procesamiento');
                    });
                } else {
                    if (onError) onError('DataEngine_ETL no está disponible en el entorno.');
                }
            } else {
                event.target.value = '';
            }
        },

        /**
         * Transforma un arreglo plano de registros (Persona) en un árbol anidado para ApexTree.
         * @param {Array} records Arreglo de registros planos.
         * @returns {Object} Nodo raíz jerárquico.
         */
        buildHierarchyTree: function(records, entityName = 'Persona', perNodeOptions = null) {
            if (!records || !Array.isArray(records)) return null;

            // [Workaround finalizado]: Ya no descartamos niveles inferiores en la carga inicial, el filtro ahora ocurre en la asignación de raíces para no mostrar huérfanos
            // if (entityName === 'Dominio') { ... }

            // Determinar la llave primaria dinámica de la entidad
            const pkCol = window.Schema_Utils ? window.Schema_Utils.getPrimaryKey(entityName) : ('id_' + entityName.toLowerCase());
            let parentCol = entityName === 'Persona' ? 'lider_directo' : 'id_dominio_padre'; 
            let edgeType = entityName === 'Persona' ? 'PERSONA_LIDER_DIRECTO' : 'CAPACIDAD_HIJO';
            
            if (window.APP_SCHEMAS && window.APP_SCHEMAS[entityName]) {
                const schema = window.APP_SCHEMAS[entityName];
                if (schema && schema.fields) {
                    const parentField = schema.fields.find(f => f.type === 'relation' && f.relationType === 'padre' && f.targetEntity === entityName);
                    if (parentField) {
                        parentCol = parentField.name;
                        if (parentField.graphEdgeType) edgeType = parentField.graphEdgeType;
                        else edgeType = parentField.name.toUpperCase();
                    }
                }
            }

            // Construir mapa de aristas de grafo temporal (Sys_Graph_Edges) para resolver relaciones no físicas
            const hijoToPadre = {};
            if (window.DataStore && window.DataStore.get) {
                const allEdges = window.DataStore.get('Sys_Graph_Edges') || [];
                allEdges.forEach(e => {
                    if (e.es_version_actual !== false && e.estado !== 'Eliminado' && e.estado !== 'eliminado' && e.tipo_relacion === edgeType) {
                        hijoToPadre[String(e.id_nodo_hijo).trim()] = String(e.id_nodo_padre).trim();
                    }
                });
            }

            const map = {};
            const roots = [];

            // 1. Inicializar el mapa de nodos compatibles con ApexTree
            records.forEach(r => {
                map[String(r[pkCol])] = {
                    id: String(r[pkCol]),
                    data: { ...r },
                    options: perNodeOptions || undefined,
                    children: []
                };
            });

            // 2. Anidar hijos en padres
            records.forEach(r => {
                const node = map[String(r[pkCol])];
                
                // Resolver el ID del padre (primero intentar físicamente, luego mediante el grafo)
                let phys = r[parentCol];
                if (phys === "undefined" || phys === "null" || phys === "") phys = null;
                if (typeof phys === 'string' && phys.startsWith('[') && phys.endsWith(']')) {
                    try { phys = JSON.parse(phys); } catch (e) {}
                }
                if (Array.isArray(phys) && phys.length === 0) phys = null;
                
                let parentId = phys || hijoToPadre[String(r[pkCol]).trim()];
                
                if (typeof parentId === 'string' && parentId.startsWith('[') && parentId.endsWith(']')) {
                    try { parentId = JSON.parse(parentId); } catch (e) {}
                }
                
                // Si el Líder viene resuelto como array de objetos relacionales, extraer ID
                if (Array.isArray(parentId) && parentId.length > 0) {
                    parentId = parentId[0].id || parentId[0][pkCol] || parentId[0];
                }

                // FALLBACK: Auto-inferir por orden_path si no hay arista en el grafo (útil para CSVs)
                if ((!parentId || String(parentId).trim() === '') && (entityName === 'Dominio' || entityName === 'Capacidad') && r.orden_path) {
                    if (window.Math_Engine && window.Math_Engine.inferParentIdFromOrdenPath) {
                        parentId = window.Math_Engine.inferParentIdFromOrdenPath(r.orden_path, entityName, records, pkCol) ?? parentId;
                    }
                }

                if (parentId && String(parentId).trim() !== '' && map[String(parentId)] && String(parentId) !== node.id) {
                    map[String(parentId)].children.push(node);
                    node._hasParent = true;
                } else {
                    roots.push(node);
                }
            });

            // Reconstrucción estricta de roots para ECharts (limpiar falsos roots)
            const trueRoots = [];
            Object.values(map).forEach(n => {
                if (!n._hasParent) {
                    if ((entityName === 'Dominio' || entityName === 'Capacidad') && n.data.nivel_tipo !== undefined && n.data.nivel_tipo !== null && String(n.data.nivel_tipo).trim() !== '') {
                        const nivel = parseInt(n.data.nivel_tipo, 10);
                        if (nivel > 0) return; // Se descarta como root porque pertenece a un nivel inferior (es un huérfano)
                    }
                    trueRoots.push(n);
                }
            });

            if (trueRoots.length === 1) {
                return trueRoots[0];
            } else if (trueRoots.length > 1) {
                let rootNombre = 'Empresa';
                if (entityName === 'Capacidad') rootNombre = 'Taxonomía de Capacidades';
                if (entityName === 'Dominio') rootNombre = 'Taxonomía de Dominios';
                
                return {
                    id: 'root-company',
                    data: {
                        nombre: rootNombre,
                        departamento: 'Global',
                        cargo: 'Organización'
                    },
                    options: (entityName === 'Capacidad' || entityName === 'Dominio') ? {
                        nodeTemplate: () => `<div class="org-node-card" style="border-left: 5px solid #333; padding: 10px; background: white; border-radius: 6px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);"><div style="font-weight:bold;">Taxonomía Global</div></div>`
                    } : undefined,
                    children: trueRoots
                };
            }
            return null;
        }
    };