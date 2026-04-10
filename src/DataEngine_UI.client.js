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
         * Universal CSV Exporter (Construcción del Texto UTF-8 BOM)
         * @param {string} entityName
         * @param {Array} columns Arreglo de columnas [{key, label, visible}] 
         * @param {Array} rows Datos a exportar.
         */
        exportCSV: function(entityName, columns, rows) {
            if (!entityName || !rows || rows.length === 0) {
                if (window.showGlobalToast) window.showGlobalToast('No hay datos para exportar.', 'warning');
                return;
            }
            
            const SYS_COLS = window.CORE_SYS_FIELDS || [];
            // Omitir campos de sistema explícitamente para asegurar que la descarga sirva como "Plantilla Limpia"
            const visibleCols = columns.filter(c => c.visible && !SYS_COLS.includes(c.key || c.name));
            
            // Si el objeto col no viene con key (sino con .name como normaliceFields), usar fallback
            const exportHeaders = visibleCols.map(c => c.key || c.name);
            const exportLabels = visibleCols.map(c => `"${c.label}"`);
            
            let csvContent = exportLabels.join(',') + '\n';
            
            rows.forEach(row => {
                const rowArray = exportHeaders.map(header => {
                    let val = row[header] === undefined || row[header] === null ? '' : String(row[header]);
                    // Escapar comillas dobles y envolver en comillas si hay comas, comillas o saltos de línea
                    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                        val = '"' + val.replace(/"/g, '""') + '"';
                    }
                    return val;
                });
                csvContent += rowArray.join(',') + '\n';
            });
            
            // Descarga
            const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for UTF-8 Excel
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `${entityName}_Export.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Asumimos existencia de showGlobalToast o inyectamos uno
            if (window.showGlobalToast) {
                window.showGlobalToast('Exportación iniciada.', 'success');
            } else {
                console.log('Exportación iniciada para ' + entityName);
            }
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

            const reader = new FileReader();
            reader.onload = async function(e) {
                const text = e.target.result;
                
                // Parser robusto con Regex para comillas
                const regex = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\s\S][^'\\]*)*)'|"([^"\\]*(?:\\[\s\S][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
                
                const rawRows = text.split(/\r?\n/).filter(r => r.trim() !== '');
                if (rawRows.length < 2) {
                    if (onError) onError('El CSV está vacío o no tiene datos (Solo cabeceras).');
                    event.target.value = '';
                    return;
                }

                const parsedRows = rawRows.map(rowStr => {
                    let row = [];
                    let match;
                    regex.lastIndex = 0; // Reset
                    while ((match = regex.exec(rowStr)) !== null) {
                        let val = match[1] || match[2] || match[3] || '';
                        if (match[2]) val = val.replace(/""/g, '"');
                        row.push(val);
                        if (match[0] === '' || !match[0].endsWith(',')) break;
                    }
                    if (row.length === 0) row = rowStr.split(',').map(s => s.trim());
                    return row;
                });

                const headers = parsedRows.shift();
                
                const jsonArray = parsedRows.filter(r => r.length > 0).map(row => {
                    let obj = {};
                    headers.forEach((h, i) => {
                        obj[h.trim()] = row[i] !== undefined ? row[i] : '';
                    });
                    return obj;
                });

                // Middleware de Cálculo Pre-Inserción (Declarativo / Config-Driven)
                const rules = (window.APP_SCHEMAS && window.APP_SCHEMAS[entityName] && window.APP_SCHEMAS[entityName].businessRules) || [];
                rules.forEach(rule => {
                    if (rule.action === 'sumPrefix') {
                        jsonArray.forEach(row => {
                            let total = 0;
                            Object.keys(row).forEach(key => {
                                if (key.startsWith(rule.prefix) && !isNaN(parseInt(row[key], 10))) {
                                    total += parseInt(row[key], 10);
                                }
                            });
                            row[rule.target] = total;
                        });
                    }
                });

                if (confirm(`Se encontraron ${jsonArray.length} registros. ¿Deseas importarlos a la entidad '${entityName}'?`)) {
                    if (onLoadingStart) onLoadingStart();

                    try {
                        const response = await window.DataAPI.call('bulkInsert', entityName, jsonArray);
                        if (response && response.status === 'success') {
                            if (window.DataStore) window.DataStore.set(entityName, null);
                            if (onSuccess) onSuccess(response.insertedCount || jsonArray.length);
                        } else {
                            if (onError) onError((response && response.message) ? response.message : 'Respuesta desconocida');
                        }
                    } catch (err) {
                        if (onError) onError(err.message || 'Error de red');
                    }
                }
                event.target.value = ''; // Reset input
            };
            reader.readAsText(file);
        }
    };