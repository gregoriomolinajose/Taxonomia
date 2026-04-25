/**
 * DataEngine_ETL.client.js
 * 
 * [S37.5] Módulo Puro de Extracción, Transformación y Carga (Data Parsing & Chunking).
 * Responsable de la carga asíncrona de CSV, sanitización, cruce con Esquemas y 
 * fragmentación segura para saltarse la cuota de timeout de Apps Script.
 */
(function(global) {

    const DataEngine_ETL = {
        /**
         * Parsea un archivo CSV usando API HTML5 y lo inyecta por Lotes.
         * 
         * @param {File} file El archivo plano CSV.
         * @param {string} entityName El nombre semántico de la Entidad.
         * @param {function} progressCallback Hook opcional para actualizar progreso UI (chunkIndex, totalChunks, isDone).
         * @returns {Promise<boolean>} Promesa de éxito/fallo.
         */
        processFile: function(file, entityName, progressCallback) {
            return new Promise((resolve, reject) => {
                if (!file || !file.name.toLowerCase().endsWith('.csv')) {
                    reject(new Error("Solo se permiten archivos .csv válidos."));
                    return;
                }

                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const csvText = e.target.result;
                        const parsedData = this._csvToJson(csvText, entityName);
                        
                        if (parsedData.length === 0) {
                            throw new Error("El archivo está vacío o los cabeceros no coinciden con ninguna propiedad válida del Modelo.");
                        }

                        // Delegar al Motor Core
                        await this._dispatchChunks(parsedData, entityName, progressCallback);
                        resolve(true);

                    } catch (error) {
                        console.error("[ETL Fatal Error]: ", error);
                        reject(error);
                    }
                };

                reader.onerror = () => {
                    reject(new Error("Falló la lectura nativa del sistema de archivos local."));
                };

                reader.readAsText(file, "UTF-8"); // Ojo: Acentos requieren UTF-8
            });
        },

        /**
         * Inyecta una matriz extraída nativamente de Cloud/Drive, sanitizando variables de auditoría.
         * 
         * @param {Array<Object>} rawPayload El resultado JSON plano extraído.
         * @param {string} entityName
         * @param {function} progressCallback
         * @returns {Promise<boolean>}
         */
        processPayload: async function(rawPayload, entityName, progressCallback) {
            if (!Array.isArray(rawPayload) || rawPayload.length === 0) {
                throw new Error("No hay data útil en la matriz proporcionada por la Hoja de Documento.");
            }

            // Omitir cabeceras transaccionales/auditoría
            const sanitized = rawPayload.map(row => {
                const cleanRow = {};
                for (const key in row) {
                    if (row.hasOwnProperty(key)) {
                        const lowKey = key.trim().toLowerCase();
                        if (lowKey.startsWith('sys_') || lowKey === 'avatar' || lowKey.startsWith('file_')) {
                            continue; // Ignorado táctico (S38.4 Tolerancia)
                        }
                        cleanRow[key] = row[key];
                    }
                }
                return cleanRow;
            });
            
            return await this._dispatchChunks(sanitized, entityName, progressCallback);
        },

        /**
         * Envía un arreglo JSON de registros en lotes síncronos hacia la Base de Datos.
         * (Resuelve el Timeout V8 Limit)
         * @private
         */
        _dispatchChunks: async function(parsedData, entityName, progressCallback) {
            const CHUNK_SIZE = 50; 
            const totalChunks = Math.ceil(parsedData.length / CHUNK_SIZE);
            
            let accumulatedFeedback = [];
            let metrics = { success: 0, duplicate: 0, error: 0 };
            let currentSheetId = null;
            
            for (let i = 0; i < totalChunks; i++) {
                const chunk = parsedData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                if (progressCallback) progressCallback(i + 1, totalChunks, false);
                console.log(`[ETL Chunker] Enviando Lote ${i + 1} de ${totalChunks} (${chunk.length} filas)...`);
                
                // Extraemos sheetId para el writeback (todas las filas de un lote provienen del mismo sheet)
                if (!currentSheetId && chunk.length > 0 && chunk[0]._sheetId) {
                    currentSheetId = chunk[0]._sheetId;
                }
                
                try {
                    const res = await window.DataAPI.call('bulkInsert', entityName, chunk);
                    
                    let detailsArray = null;
                    if (Array.isArray(res)) {
                        detailsArray = res;
                    } else if (res && Array.isArray(res.details)) {
                        detailsArray = res.details;
                    } else if (res && res.data && Array.isArray(res.data.details)) {
                        detailsArray = res.data.details;
                    } else if (res && Array.isArray(res.data)) {
                        detailsArray = res.data;
                    }
                    
                    if (detailsArray) {
                        detailsArray.forEach(detail => {
                            if (detail.status === 'success') metrics.success++;
                            else if (detail.status === 'duplicate') {
                                metrics.duplicate++;
                                accumulatedFeedback.push(detail);
                            } else if (detail.status === 'error') {
                                metrics.error++;
                                accumulatedFeedback.push(detail);
                            }
                        });
                    } else {
                        // Fallback si el backend es legacy
                        metrics.success += chunk.length;
                    }
                } catch(err) {
                    // Si un chunk falla categóricamente (ej. timeout de Apps Script), marcamos todos como error
                    metrics.error += chunk.length;
                    chunk.forEach(row => {
                        accumulatedFeedback.push({
                            status: 'error',
                            _rowIndex: row._rowIndex,
                            message: 'Fallo crítico de red o límite de ejecución.'
                        });
                    });
                }
            }

            if (accumulatedFeedback.length > 0 && currentSheetId) {
                console.log(`[ETL Feedback] Procesando writeback para ${accumulatedFeedback.length} registros problemáticos.`);
                try {
                    await window.DataAPI.call('etl_writeback_feedback', entityName, {
                        sheetId: currentSheetId,
                        feedback: accumulatedFeedback
                    });
                } catch(e) {
                    console.error('[ETL Feedback] No se pudo pintar la plantilla original.', e);
                }
            }

            // S44.17: Auto-Provisionamiento JIT Workspace Post-ETL (Solo Persona)
            if (entityName === 'Persona') {
                if (window.UI_ETL_Modal) {
                    const progressLabel = document.getElementById('etl-progress-label');
                    if (progressLabel) progressLabel.textContent = "Configurando Topología Workspace...";
                }
                console.log(`[ETL Workspace] Ingesta de Persona finalizada. Disparando Sync Job en lote paralelo...`);
                try {
                    // Ejecutamos silenciosamente el Sync. El Backend se encargará de crear los Cargos y las Aristas Topológicas.
                    await window.DataAPI.call('runWorkspaceSyncJob', { manual: true });
                    // Avisamos al sistema que la topología mutó, para que la UI recargue las relaciones en caliente
                    if (window.AppEventBus) window.AppEventBus.publish('CACHE::GRAPH_HYDRATED', { source: 'ETL_WorkspaceSync' });
                } catch(e) {
                    console.error("[ETL Workspace] Error aprovisionando cargos o topología:", e);
                }
            }

            if (progressCallback) progressCallback(totalChunks, totalChunks, true, metrics);
            return metrics;
        },

        /**
         * Convierte la Trama de Texto CSV a Payload JSON usando una táctica Resiliente
         * que sortea comas internas en strings (Regex "Lookaround").
         * @private
         */
        _csvToJson: function(csvString, entityName) {
            const lines = csvString.split(/\r?\n/).filter(l => l.trim() !== '');
            if (lines.length < 2) return [];

            // Regla Csv: Separador por coma, excepto las comas dentro de comillas
            const delimiterRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

            // Limpieza Defensiva de Cabezales (Minúsculas, sin espacios)
            const headers = lines[0].split(delimiterRegex).map(h => 
                h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/\s+/g, '_')
            );
            
            // Verificación Temprana (Fail-Fast): Al menos una columna debe coincidir con el schema
            const schema = (window.APP_SCHEMAS && window.APP_SCHEMAS[entityName]) 
                || (window.getAppSchema ? window.getAppSchema(entityName) : null);
                
            if (schema && schema.fields) {
                const schemaKeys = schema.fields.map(f => f.name.toLowerCase());
                const isValid = headers.some(h => schemaKeys.includes(h));
                if (!isValid) {
                    throw new Error("CSV Incompatible: Los encabezados no coinciden con la entidad " + entityName);
                }
            }

            // Recompilar Set de fechas para mapeo O(1) de parseo de fechas ISO
            const dateFields = new Set();
            if (schema && schema.fields) {
                schema.fields.forEach(f => {
                    if (f.type === 'date' || f.type === 'datetime') {
                        dateFields.add(f.name.toLowerCase());
                    }
                });
            }

            const jsonPayloads = [];

            for (let i = 1; i < lines.length; i++) {
                const filaStr = lines[i];
                const parts = filaStr.split(delimiterRegex);
                
                const obj = {};
                let hasData = false;
                
                for (let j = 0; j < headers.length; j++) {
                    const key = headers[j];
                    if (!key) continue; // Ignorar columnas vacuas
                    
                    let val = parts[j] || "";
                    // Purgar comillas de arropamiento
                    val = val.replace(/^"|"$/g, '').trim();
                    
                    if (val !== "") {
                        hasData = true;
                        
                        // Parseo ISO Robusto con Split de Local Time (DD/MM/YYYY)
                        if (dateFields.has(key)) {
                            let originalVal = val;
                            if (val.includes('/')) {
                                const splits = val.split('/');
                                if (splits.length === 3 && splits[2].length === 4) {
                                    val = `${splits[2]}-${splits[1].padStart(2, '0')}-${splits[0].padStart(2, '0')}T00:00:00.000Z`;
                                }
                            }
                            const d = new Date(val);
                            if (isNaN(d.getTime())) {
                                throw new Error(`[ETL Error] Fecha Invalida en columna '${key}': ${originalVal}`);
                            }
                            val = d.toISOString();
                        }
                    }
                    obj[key] = val;
                }
                
                if (hasData) {
                    // Validar Reglas Universales (Status default)
                    if (!obj['estado']) obj['estado'] = 'Activo';
                    jsonPayloads.push(obj);
                }
            }

            return jsonPayloads;
        }
    };

    global.DataEngine_ETL = DataEngine_ETL;

})(typeof window !== 'undefined' ? window : this);
