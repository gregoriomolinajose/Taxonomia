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

            if (confirm(`Estás a punto de procesar y cargar un archivo por lotes a la entidad '${entityName}'. ¿Deseas continuar?`)) {
                if (window.DataEngine_ETL && window.DataEngine_ETL.processFile) {
                    let loadingUi;
                    
                    window.DataEngine_ETL.processFile(file, entityName, function onProgress(chunkIndex, totalChunks, isDone) {
                        if (chunkIndex === 1 && onLoadingStart) {
                            onLoadingStart(); 
                            loadingUi = document.getElementById('dv-import-loading');
                        }
                        if (loadingUi) {
                            requestAnimationFrame(() => {
                                loadingUi.message = `Procesando Lote ${chunkIndex} de ${totalChunks}...`;
                            });
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
        }
    };