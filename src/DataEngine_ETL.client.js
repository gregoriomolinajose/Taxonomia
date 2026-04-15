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

                        // Lotes de 50 para mitigar Timeout (OOM V8 Limit)
                        const CHUNK_SIZE = 50; 
                        const totalChunks = Math.ceil(parsedData.length / CHUNK_SIZE);
                        
                        for (let i = 0; i < totalChunks; i++) {
                            const chunk = parsedData.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                            
                            // Emitir Progreso Activo
                            if (progressCallback) progressCallback(i + 1, totalChunks, false);
                            
                            // Bloquear invocando llamada recursiva a la RED
                            console.log(`[ETL] Enviando Lote ${i + 1} de ${totalChunks} (${chunk.length} filas)...`);
                            await window.DataAPI.call('bulkInsert', entityName, chunk);
                        }

                        // Completado
                        if (progressCallback) progressCallback(totalChunks, totalChunks, true);
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
                    
                    if (val !== "") hasData = true;
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
