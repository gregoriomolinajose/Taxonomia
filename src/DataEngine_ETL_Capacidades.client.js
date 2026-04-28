/* ============================================================
   DataEngine_ETL_Capacidades.client.js — Specialized XLSX Parser
   Story S47.1: UI File Interception & Offset Parser
   ============================================================ */

window.DataEngine_ETL_Capacidades = (function() {

    function processFile(entityName, file, options = {}) {
        return new Promise((resolve, reject) => {
            const updateProgress = options.progressCallback || function(){};
            const showResults = options.completionCallback || function(){};

            if (!window.XLSX) {
                const err = 'SheetJS (XLSX) library is missing from the environment.';
                console.error(err);
                showResults({ success: 0, duplicate: 0, error: 1 });
                return reject(new Error(err));
            }

            console.log("Modo Capacidades Activado - Parseando Modelo 2.0");
            
            updateProgress(0, 1, false, null, 'Leyendo XLSX...');

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    const jsonRaw = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    _processMatrix(entityName, jsonRaw, options)
                        .then(resolve)
                        .catch(reject);
                } catch (err) {
                    console.error("Error parseando XLSX:", err);
                    showResults({ success: 0, duplicate: 0, error: 1 });
                    reject(err);
                }
            };
            
            reader.onerror = function(err) {
                console.error("FileReader Error:", err);
                showResults({ success: 0, duplicate: 0, error: 1 });
                reject(err);
            }

            reader.readAsArrayBuffer(file);
        });
    }

    function _processMatrix(entityName, jsonRaw, options = {}) {
        return new Promise((resolve, reject) => {
            const updateProgress = options.progressCallback || function(){};
            const showResults = options.completionCallback || function(){};

            if (jsonRaw.length < 6) {
                const err = new Error('El archivo no tiene suficientes filas para ser un Modelo de Capacidades 2.0');
                showResults({ success: 0, duplicate: 0, error: 1 });
                return reject(err);
            }
            
            const payloads = [];
            
            let lastMacro = '';
            let lastCapacidad = '';
            let lastSubcapacidad = '';

            for (let i = 6; i < jsonRaw.length; i++) {
                const row = jsonRaw[i];
                if (!row || row.length === 0) continue;
                
                const isRowEmpty = row.every(cell => cell === undefined || cell === null || String(cell).trim() === '');
                if (isRowEmpty) continue;

                let rawMacro = row[0];
                let rawCap = row[1];
                let rawDescCap = row[2];
                let rawSubcap = row[3];
                let rawDescSubcap = row[4];
                let rawComp = row[5];
                let rawDescComp = row[6];

                if (rawMacro !== undefined && rawMacro !== null && String(rawMacro).trim() !== '') {
                    lastMacro = String(rawMacro).trim();
                    lastCapacidad = '';
                    lastSubcapacidad = '';
                }
                
                if (rawCap !== undefined && rawCap !== null && String(rawCap).trim() !== '') {
                    lastCapacidad = String(rawCap).trim();
                    lastSubcapacidad = '';
                }
                
                if (rawSubcap !== undefined && rawSubcap !== null && String(rawSubcap).trim() !== '') {
                    lastSubcapacidad = String(rawSubcap).trim();
                }
                
                let safeComp = (rawComp !== undefined && rawComp !== null) ? String(rawComp).trim() : '';

                payloads.push({
                    "Macrocapacidad": lastMacro,
                    "Capacidad": lastCapacidad,
                    "Subcapacidad": lastSubcapacidad,
                    "Componente": safeComp,
                    "Descripción de la capacidad": rawDescCap,
                    "Descripción de la Subcapacidad": rawDescSubcap,
                    "Descripción del componente": rawDescComp
                });
            }
            
            const fastCache = {
                isFastCache: true,
                nodesById: new Map(),
                childrenCount: new Map()
            };
            
            const nodesMap = new Map();
            
            const MathParams = {
                entity: 'Capacidades',
                levelField: 'nivel_tipo',
                parentField: 'id_dominio_padre',
                pkField: 'id_capacidad',
                orderField: 'orden_path',
                nameField: 'nombre',
                pathField: 'path_completo_es'
            };

            const createNode = (id, nombre, desc, etiqueta, nivel, idPadre) => {
                if (nodesMap.has(id) || !nombre) return id;
                
                const nodo = {
                    id_capacidad: id,
                    nombre: nombre,
                    descripcion: desc || '',
                    nivel_tipo: nivel,
                    id_dominio_padre: idPadre || null
                };
                
                if (window.Math_Engine) {
                    nodo.orden_path = window.Math_Engine.buildOrdenPath(nodo, MathParams, fastCache);
                    nodo.path_completo_es = window.Math_Engine.buildPathName(nodo, MathParams, fastCache);
                } else {
                    nodo.orden_path = '';
                    nodo.path_completo_es = nombre;
                }
                
                fastCache.nodesById.set(id, nodo);
                const parentKey = idPadre || 'ROOT';
                const currentCount = fastCache.childrenCount.get(parentKey) || 0;
                fastCache.childrenCount.set(parentKey, currentCount + 1);
                
                nodesMap.set(id, nodo);
                return id;
            };

            payloads.forEach(record => {
                const mName = record["Macrocapacidad"];
                const cName = record["Capacidad"];
                const sName = record["Subcapacidad"];
                const compName = record["Componente"];

                let idMacro = mName ? `M|||${mName}` : null;
                let idCap = cName && idMacro ? `${idMacro}|||C|||${cName}` : null;
                let idSub = sName && idCap ? `${idCap}|||S|||${sName}` : null;
                let idComp = compName && idSub ? `${idSub}|||COMP|||${compName}` : null;

                if (mName) createNode(idMacro, mName, '', 'Macrocapacidad', 0, null);
                if (cName) createNode(idCap, cName, record["Descripción de la capacidad"], 'Capacidad', 1, idMacro);
                if (sName) createNode(idSub, sName, record["Descripción de la Subcapacidad"], 'Sub capacidad', 2, idCap);
                if (compName) createNode(idComp, compName, record["Descripción del componente"], 'Componente', 3, idSub);
            });

            const finalPayloads = Array.from(nodesMap.values());
            console.log("Graph Flattening Completado. Nodos Totales:", finalPayloads.length, finalPayloads);

            if (finalPayloads.length === 0) {
                const err = new Error(`El archivo no parece corresponder a la entidad '${entityName}'. No se pudo extraer data válida.`);
                return reject(err);
            }

            if (window.DataEngine_ETL && window.DataEngine_ETL._dispatchChunks) {
                const progressCb = (chunk, total, isDone, metrics, text) => {
                    updateProgress(chunk, total, isDone, metrics, text);
                    if (isDone) {
                        showResults(metrics || { success: finalPayloads.length, duplicate: 0, error: 0 });
                    }
                };
                
                window.DataEngine_ETL._dispatchChunks(finalPayloads, entityName, progressCb)
                    .then(() => resolve(finalPayloads))
                    .catch(err => {
                        console.error("Error en _dispatchChunks:", err);
                        reject(err);
                    });
            } else {
                console.warn("DataEngine_ETL._dispatchChunks no disponible. Usando fallback UX.");
                updateProgress(1, 1, true, null, 'Análisis Topológico Completo');
                setTimeout(() => {
                    showResults({ success: finalPayloads.length, duplicate: 0, error: 0 });
                }, 500);
                resolve(finalPayloads);
            }
        });
    }

    return {
        processFile: processFile,
        processMatrix: _processMatrix
    };

})();
