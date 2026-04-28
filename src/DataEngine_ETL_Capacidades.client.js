/* ============================================================
   DataEngine_ETL_Capacidades.client.js — Specialized XLSX Parser
   Story S47.1: UI File Interception & Offset Parser
   ============================================================ */

window.DataEngine_ETL_Capacidades = (function() {

    function processFile(entityName, file) {
        return new Promise((resolve, reject) => {
            if (!window.XLSX) {
                const err = 'SheetJS (XLSX) library is missing from the environment.';
                console.error(err);
                if (typeof window.UI_ETL_Modal !== 'undefined' && window.UI_ETL_Modal.showResults) {
                    window.UI_ETL_Modal.showResults({ success: 0, duplicate: 0, error: 1 });
                }
                return reject(new Error(err));
            }

            console.log("Modo Capacidades Activado - Parseando Modelo 2.0");
            
            if (typeof window.UI_ETL_Modal !== 'undefined' && window.UI_ETL_Modal.updateProgress) {
                 window.UI_ETL_Modal.updateProgress(0, 1, false, null, 'Leyendo XLSX...');
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = window.XLSX.read(data, { type: 'array' });
                    
                    // Asumimos que la primera hoja es la que tiene los datos
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convertir a Array de Arrays para controlar el offset (header=1 es 2D array)
                    const jsonRaw = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    
                    // Filas 0 a 4 son ignoradas. Fila 5 (índice 5) es el encabezado real si no está vacía, pero 
                    // la usaremos para mapear las columnas por indice fijo. Row 6 en adelante (índice 6+) son datos.
                    if (jsonRaw.length < 6) {
                        throw new Error('El archivo no tiene suficientes filas para ser un Modelo de Capacidades 2.0');
                    }
                    
                    // Asumiendo el orden exacto dado:
                    // 0: Macrocapacidad
                    // 1: Capacidad
                    // 2: Descripción de la capacidad
                    // 3: Subcapacidad
                    // 4: Descripción de la Subcapacidad
                    // 5: Componente
                    // 6: Descripción del componente

                    const payloads = [];
                    
                    let lastMacro = '';
                    let lastCapacidad = '';
                    let lastSubcapacidad = '';

                    for (let i = 6; i < jsonRaw.length; i++) {
                        const row = jsonRaw[i];
                        if (!row || row.length === 0) continue;
                        
                        // Si todas las celdas están vacías, saltar
                        const isRowEmpty = row.every(cell => cell === undefined || cell === null || String(cell).trim() === '');
                        if (isRowEmpty) continue;

                        let rawMacro = row[0];
                        let rawCap = row[1];
                        let rawDescCap = row[2];
                        let rawSubcap = row[3];
                        let rawDescSubcap = row[4];
                        let rawComp = row[5];
                        let rawDescComp = row[6];

                        // Fill-Down Logic con Reseteo de Hijos
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

                        // Construimos el objeto aplanado para esta fila (Walking Skeleton)
                        const record = {
                            "Macrocapacidad": lastMacro,
                            "Capacidad": lastCapacidad,
                            "Descripción de la capacidad": rawDescCap ? String(rawDescCap).trim() : '',
                            "Subcapacidad": lastSubcapacidad,
                            "Descripción de la Subcapacidad": rawDescSubcap ? String(rawDescSubcap).trim() : '',
                            "Componente": rawComp ? String(rawComp).trim() : '',
                            "Descripción del componente": rawDescComp ? String(rawDescComp).trim() : ''
                        };

                        payloads.push(record);
                    }

                    console.log("Extracción y Fill-Down Completado:", payloads);
                    
                    // S47.2: Graph Flattening O(1)
                    const nodesMap = new Map();
                    const fastCache = { isFastCache: true, nodesById: new Map(), childrenCount: new Map() };
                    
                    const MathParams = {
                        entity: 'Capacidades',
                        levelField: '_nivel',
                        parentField: 'id_dominio_padre',
                        pkField: '_id',
                        orderField: '_order_path',
                        nameField: 'nombre',
                        pathField: '_path_completo_es'
                    };

                    const createNode = (id, nombre, desc, etiqueta, nivel, idPadre) => {
                        if (nodesMap.has(id) || !nombre) return id;
                        
                        const nodo = {
                            _id: id, // [S47.2] Virtual/Temporary Client-Side UUID. Será ignorado/re-generado por Backend.
                            nombre: nombre,
                            descripcion: desc || '',
                            _etiqueta: etiqueta,
                            _tipo_nodo: etiqueta,
                            _nivel: nivel,
                            id_dominio_padre: idPadre || null
                        };
                        
                        // Computar topología con Math_Engine O(1)
                        if (window.Math_Engine) {
                            nodo._order_path = window.Math_Engine.buildOrdenPath(nodo, MathParams, fastCache);
                            nodo._path_completo_es = window.Math_Engine.buildPathName(nodo, MathParams, fastCache);
                        } else {
                            nodo._order_path = '';
                            nodo._path_completo_es = nombre;
                        }
                        
                        // Registrar en caché para siguientes hermanos/hijos
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

                        // Construimos IDs compuestos para evitar colisiones
                        let idMacro = mName ? `M|||${mName}` : null;
                        let idCap = cName && idMacro ? `${idMacro}|||C|||${cName}` : null;
                        let idSub = sName && idCap ? `${idCap}|||S|||${sName}` : null;
                        let idComp = compName && idSub ? `${idSub}|||COMP|||${compName}` : null;

                        // Insertar Nivel 0
                        if (mName) createNode(idMacro, mName, '', 'Macrocapacidad', 0, null);
                        // Insertar Nivel 1
                        if (cName) createNode(idCap, cName, record["Descripción de la capacidad"], 'Capacidad', 1, idMacro);
                        // Insertar Nivel 2
                        if (sName) createNode(idSub, sName, record["Descripción de la Subcapacidad"], 'Sub capacidad', 2, idCap);
                        // Insertar Nivel 3
                        if (compName) createNode(idComp, compName, record["Descripción del componente"], 'Componente', 3, idSub);
                    });

                    const finalPayloads = Array.from(nodesMap.values());
                    console.log("Graph Flattening Completado. Nodos Totales:", finalPayloads.length, finalPayloads);

                    // S47.2 se considera terminada imprimiendo el array
                    // Simulamos UI success
                    if (typeof window.UI_ETL_Modal !== 'undefined' && window.UI_ETL_Modal.showResults) {
                        window.UI_ETL_Modal.updateProgress(1, 1, true, null, 'Análisis Topológico Completo');
                        setTimeout(() => {
                            window.UI_ETL_Modal.showResults({ success: finalPayloads.length, duplicate: 0, error: 0 });
                        }, 500);
                    }
                    
                    resolve(finalPayloads);

                } catch (err) {
                    console.error("Error parseando XLSX:", err);
                    if (typeof window.UI_ETL_Modal !== 'undefined' && window.UI_ETL_Modal.showResults) {
                        window.UI_ETL_Modal.showResults({ success: 0, duplicate: 0, error: 1 });
                    }
                    reject(err);
                }
            };
            
            reader.onerror = function(err) {
                console.error("FileReader Error:", err);
                if (typeof window.UI_ETL_Modal !== 'undefined' && window.UI_ETL_Modal.showResults) {
                    window.UI_ETL_Modal.showResults({ success: 0, duplicate: 0, error: 1 });
                }
                reject(err);
            }

            reader.readAsArrayBuffer(file);
        });
    }

    return {
        processFile: processFile
    };

})();
