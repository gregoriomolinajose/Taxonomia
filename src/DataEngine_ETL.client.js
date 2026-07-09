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

            // S45.6 Fast-fail: Validar la existencia de la columna requerida antes de iterar
            if (entityName === 'Persona') {
                const firstRow = rawPayload[0];
                const hasEmailColumn = Object.keys(firstRow).some(k => k.trim().toLowerCase() === 'correo' || k.trim().toLowerCase() === 'email' || k.trim().toLowerCase() === 'correo corporativo');
                if (!hasEmailColumn) {
                    throw new Error("El archivo no contiene la columna correo");
                }
            }

            // S47.4 Proactive Detection: Ensure the file actually matches the entity
            const fileHeadersSet = new Set();
            rawPayload.forEach(row => {
                Object.keys(row).forEach(k => {
                    if (!k.startsWith('_')) fileHeadersSet.add(k);
                });
            });
            
            const fileHeaders = Array.from(fileHeadersSet).map(k => {
                let lowKey = window.Schema_Utils.getFieldNameFromLabel(entityName, k);
                if (entityName === 'Dominio') {
                    if (lowKey === 'nivel subdominio') lowKey = 'nivel_tipo';
                    else if (lowKey === 'orden. subdominio' || lowKey === 'orden subdominio' || lowKey === 'orden') lowKey = 'orden_path';
                    else if (lowKey === 'subdominio') lowKey = 'nombre_ingles';
                    else if (lowKey === 'nombre español' || lowKey === 'nombre espanol') lowKey = 'nombre';
                    else if (lowKey === 'definición' || lowKey === 'definicion') lowKey = 'descripcion';
                    else if (lowKey === 'abreviación (nombre servicio)' || lowKey === 'abreviacion (nombre servicio)') lowKey = 'abreviacion';
                    else if (lowKey === 'abreviación (path servicio)' || lowKey === 'abreviacion (path servicio)') lowKey = 'path_completo_es';
                }
                
                return lowKey;
            });
            
            if (window.APP_SCHEMAS && window.APP_SCHEMAS[entityName]) {
                const schemaFields = window.APP_SCHEMAS[entityName].fields.map(f => String(f.name).toLowerCase());
                let matchCount = 0;
                fileHeaders.forEach(h => {
                    if (schemaFields.includes(h) || h === 'id' || h.startsWith('sys_') || h.startsWith('file_')) {
                        matchCount++;
                    }
                });
                
                // If less than 15% of the columns match our schema, it's definitively the wrong file
                // We use 30% to ensure enough confidence in matching the entity schema
                const overlapRatio = matchCount / fileHeaders.length;
                if (overlapRatio < 0.30 && fileHeaders.length > 0) {
                    throw new Error(`El archivo no parece corresponder a la entidad '${entityName}'. Por favor verifica que estás subiendo el documento correcto.`);
                }
            }

            // Omitir cabeceras transaccionales/auditoría y aplicar mapeo de alias
            const sanitized = rawPayload.map(row => {
                const cleanRow = {};
                for (let originalKey in row) {
                    if (row.hasOwnProperty(originalKey)) {
                        let key = originalKey;
                        let value = row[originalKey];
                        
                        // Preserve metadata fields like _sheetId and _rowIndex
                        if (key.startsWith('_')) {
                            cleanRow[key] = value;
                            continue;
                        }
                        
                        let lowKey = window.Schema_Utils.getFieldNameFromLabel(entityName, key);
                        key = lowKey; // Mantenemos coherencia con el motor
                        
                        // S47: Resolución de alias visuales para Dominios
                        if (entityName === 'Dominio') {
                            if (lowKey === 'nivel subdominio') key = 'nivel_tipo';
                            else if (lowKey === 'orden. subdominio' || lowKey === 'orden subdominio' || lowKey === 'orden') key = 'orden_path';
                            else if (lowKey === 'subdominio') key = 'nombre_ingles';
                            else if (lowKey === 'nombre español' || lowKey === 'nombre espanol') key = 'nombre';
                            else if (lowKey === 'definición' || lowKey === 'definicion') key = 'descripcion';
                            else if (lowKey === 'abreviación (nombre servicio)' || lowKey === 'abreviacion (nombre servicio)') key = 'abreviacion';
                            else if (lowKey === 'abreviación (path servicio)' || lowKey === 'abreviacion (path servicio)') key = 'path_completo_es';
                            lowKey = key.toLowerCase();
                        }

                        if (lowKey.startsWith('sys_') || lowKey === 'avatar' || lowKey.startsWith('file_')) {
                            continue; // Ignorado táctico (S38.4 Tolerancia)
                        }
                        
                        // S47.8: Sanitización Global (Neutralizar trailing whitespaces de Google Sheets)
                        if (typeof value === 'string') {
                            value = value.trim();
                        }
                        
                        cleanRow[key] = value;
                    }
                }
                
                return cleanRow;
            });
            
            // Topología dinámica para Dominio
            if (entityName === 'Dominio') {
                sanitized.forEach(r => {
                    // Normalize Nivel (e.g. "Nivel 3" -> 3)
                    if (r.nivel_tipo && typeof r.nivel_tipo === 'string' && r.nivel_tipo.toLowerCase().includes('nivel')) {
                        const parsed = parseInt(r.nivel_tipo.toLowerCase().replace('nivel', '').trim(), 10);
                        if (!isNaN(parsed)) r.nivel_tipo = parsed;
                    }
                    if (!r.id_dominio) {
                        r.id_dominio = ('DOM-' + Math.random().toString(36).substr(2, 9)).toUpperCase();
                    }
                });

                // Sort by orden_path to ensure parents are processed before children
                sanitized.sort((a, b) => (a.orden_path || '').localeCompare(b.orden_path || ''));

                const pathMap = {};
                sanitized.forEach(r => {
                    const orden = (r.orden_path || '').trim();
                    if (!orden) return;
                    
                    pathMap[orden] = r;
                    
                    const parts = orden.split('.');
                    if (parts.length > 1) {
                        parts.pop();
                        const parentOrden = parts.join('.');
                        const parent = pathMap[parentOrden];
                        if (parent) {
                            r.relaciones_padre = parent.id_dominio;
                        }
                    }
                });
                
                // Generar Path Completo utilizando el Math_Engine (Fuente Única de Verdad)
                const fastCache = { isFastCache: true, nodesById: new Map() };
                sanitized.forEach(r => fastCache.nodesById.set(r.id_dominio, r));
                
                const MathParams = {
                    entity: 'Dominio',
                    parentField: 'relaciones_padre',
                    nameField: 'nombre',
                    pathField: 'path_completo_es',
                    pkField: 'id_dominio'
                };

                sanitized.forEach(r => {
                    r.path_completo_es = window.Math_Engine.buildPathName(r, MathParams, fastCache);
                });
            }

            return await this._dispatchChunks(sanitized, entityName, progressCallback);
        },

        /**
         * Orchestrator class to manage continuous UX progress from 0 to 100
         */
        _createProgressOrchestrator: function(entityName, totalChunks, progressCallback) {
            const isPersona = (entityName === 'Persona');
            const wIngest = isPersona ? 50 : 90;
            const wSync = isPersona ? 40 : 0;
            
            let currentPhase = 'ingest';
            let syncIteration = 1;
            let totalSyncEstimated = 1;
            
            return {
                reportIngest: (currentChunk) => {
                    if (!progressCallback) return;
                    const pc = totalChunks > 0 ? Math.round((currentChunk / totalChunks) * wIngest) : wIngest;
                    progressCallback(pc, 100, false, null, `Analizando y guardando lote ${currentChunk} de ${totalChunks}...`);
                },
                startSync: () => {
                    if (!progressCallback) return;
                    currentPhase = 'sync';
                    progressCallback(wIngest, 100, false, null, "Preparando Sincronización con Google Workspace...");
                },
                reportSyncIteration: (remainingItems) => {
                    if (!progressCallback) return;
                    if (syncIteration === 1) {
                        totalSyncEstimated = Math.ceil((remainingItems + 50) / 50);
                    }
                    const syncPercent = Math.round(wIngest + ((syncIteration / totalSyncEstimated) * wSync));
                    const safePercent = Math.min(syncPercent, 89);
                    progressCallback(safePercent, 100, false, null, `Sincronizando cuentas con Google Workspace (Lote ${syncIteration})...`);
                    syncIteration++;
                },
                finishSync: () => {
                    if (!progressCallback) return;
                    progressCallback(wIngest + wSync, 100, false, null, `Sincronización con Workspace completada.`);
                },
                reportRefresh: () => {
                    if (!progressCallback) return;
                    progressCallback(95, 100, false, null, `Refrescando grafo relacional y topología...`);
                },
                reportComplete: (metrics, feedback) => {
                    if (!progressCallback) return;
                    progressCallback(100, 100, true, metrics, `Ingesta completada satisfactoriamente.`, feedback);
                }
            };
        },

        /**
         * Envía un arreglo JSON de registros en lotes síncronos hacia la Base de Datos.
         * (Resuelve el Timeout V8 Limit)
         * @private
         */
        _dispatchChunks: async function(parsedData, entityName, progressCallback) {
            let accumulatedFeedback = [];
            let metrics = { success: 0, duplicate: 0, error: 0 };
            
            // Extract sheetId and sheetName universally from the first record if it exists
            let currentSheetId = (parsedData.length > 0 && parsedData[0]._sheetId) ? parsedData[0]._sheetId : null;
            let currentSheetName = (parsedData.length > 0 && parsedData[0]._sheetName) ? parsedData[0]._sheetName : null;

            // S45.6 Validación Pre-Vuelo Estricta (Solo Persona)
            let validData = [];
            if (entityName === 'Persona') {
                // [E6-S64] Dominios desde ENV_CONFIG inyectado por server, o [] si no configurado (falla explícita).
                const allowedDomains = (window.ENV_CONFIG && window.ENV_CONFIG.ALLOWED_DOMAINS && window.ENV_CONFIG.ALLOWED_DOMAINS.length > 0)
                    ? window.ENV_CONFIG.ALLOWED_DOMAINS
                    : [];
                
                parsedData.forEach((row, index) => {
                    // Buscar la llave "correo" o "email" ignorando mayúsculas
                    const emailKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'correo' || k.trim().toLowerCase() === 'email' || k.trim().toLowerCase() === 'correo corporativo');
                    const email = (emailKey && row[emailKey] ? String(row[emailKey]) : "").trim().toLowerCase();
                    
                    if (!email) {
                        metrics.error++;
                        accumulatedFeedback.push({
                            status: 'error',
                            _rowIndex: row._rowIndex || (index + 2), // Fallback to assumed CSV line if no sheet index
                            message: 'El correo es necesario para realizar un registro'
                        });
                        return;
                    }
                    
                    // Validar formato de correo básico
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email)) {
                        metrics.error++;
                        accumulatedFeedback.push({
                            status: 'error',
                            _rowIndex: row._rowIndex || (index + 2),
                            message: 'El formato del correo no es valido'
                        });
                        return;
                    }
                    
                    // Validar dominio solo si hay dominios configurados
                    if (allowedDomains.length > 0) {
                        const domainMatch = allowedDomains.some(d => email.endsWith(d.toLowerCase()));
                        if (!domainMatch) {
                            metrics.error++;
                            accumulatedFeedback.push({
                                status: 'error',
                                _rowIndex: row._rowIndex || (index + 2),
                                message: 'El dominio del correo no es valido'
                            });
                            return;
                        }
                    }
                    
                    validData.push(row);
                });
            } else {
                validData = parsedData;
            }

            const CHUNK_SIZE = 50; 
            const totalChunks = Math.ceil(validData.length / CHUNK_SIZE);
            
            const orchestrator = this._createProgressOrchestrator(entityName, totalChunks, progressCallback);
            
            for (let i = 0; i < totalChunks; i++) {
                const chunk = validData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                orchestrator.reportIngest(i + 1);
                console.log(`[ETL Chunker] Enviando Lote ${i + 1} de ${totalChunks} (${chunk.length} filas)...`);
                
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
                            if (detail.status === 'success') {
                                metrics.success++;
                                accumulatedFeedback.push(detail);
                            } else if (detail.status === 'duplicate') {
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
                        sheetName: currentSheetName,
                        feedback: accumulatedFeedback
                    });
                } catch(e) {
                    console.error('[ETL Feedback] No se pudo pintar la plantilla original.', e);
                }
            }

            // S44.17: Auto-Provisionamiento JIT Workspace Post-ETL (Solo Persona)
            if (entityName === 'Persona') {
                orchestrator.startSync();
                console.log(`[ETL Workspace] Ingesta de Persona finalizada. Disparando Sync Job en lote paralelo...`);
                try {
                    // Ejecutamos el Sync en bucle hasta que no queden pendientes (ya que el backend procesa de a 50)
                    let syncDone = false;

                    while (!syncDone) {
                        const syncRes = await window.DataAPI.call('runWorkspaceSyncJob', { manual: false });
                        if (syncRes && syncRes.status === 'OK' && syncRes.remaining > 0) {
                            orchestrator.reportSyncIteration(syncRes.remaining);
                            console.log(`[ETL Workspace] Quedan ${syncRes.remaining} personas por sincronizar. Siguiente lote...`);
                        } else {
                            syncDone = true;
                            orchestrator.finishSync();
                        }
                    }
                    
                    // Re-hidratar el caché topológico (JIT Cache Refresh) antes de devolver el control a la UI
                    orchestrator.reportRefresh();
                    
                    if (window.DataStore && window.DataAPI) {
                        const payloads = await Promise.all([
                            window.DataAPI.call('getInitialPayload', 'Cargo'),
                            window.DataAPI.call('getInitialPayload', 'Sys_Graph_Edges')
                        ]);
                        
                        ['Cargo', 'Sys_Graph_Edges'].forEach((ent, idx) => {
                            const raw = payloads[idx];
                            const res = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            if (res && res.status === 'success') {
                                const rows = window.Schema_Utils.inflateTuples(res.data);
                                window.DataStore.set(ent, rows);
                            }
                        });
                    }
                    
                    // Avisamos al sistema que la topología mutó, para que la UI recargue las relaciones en caliente
                    if (window.AppEventBus) window.AppEventBus.publish('CACHE::GRAPH_HYDRATED', { source: 'ETL_WorkspaceSync' });
                } catch(e) {
                    console.error("[ETL Workspace] Error aprovisionando cargos o topología:", e);
                    metrics.error++;
                }
            }

            metrics._feedback = accumulatedFeedback;
            orchestrator.reportComplete(metrics, accumulatedFeedback);
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
            const headers = lines[0].split(delimiterRegex).map(h => {
                let clean = h.replace(/^"|"$/g, '').trim().toLowerCase().replace(/\s+/g, '_');
                
                // S47: Alias de Mapeo CSV para Dominios
                if (entityName === 'Dominio') {
                    if (clean === 'nivel_subdominio') clean = 'nivel_tipo';
                    else if (clean === 'orden._subdominio' || clean === 'orden_subdominio') clean = 'orden_path';
                    else if (clean === 'subdominio') clean = 'nombre_ingles';
                    else if (clean === 'nombre_español' || clean === 'nombre_espanol') clean = 'nombre';
                    else if (clean === 'definición' || clean === 'definicion') clean = 'descripcion';
                    else if (clean === 'abreviación_(nombre_servicio)' || clean === 'abreviacion_(nombre_servicio)') clean = 'abreviacion';
                    else if (clean === 'abreviación_(path_servicio)' || clean === 'abreviacion_(path_servicio)') clean = 'path_completo_es';
                }
                
                return clean;
            });
            
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
