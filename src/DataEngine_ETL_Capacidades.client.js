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
                    
                    // S47.1 se considera terminada imprimiendo el array
                    // Simulamos UI success
                    if (typeof window.UI_ETL_Modal !== 'undefined' && window.UI_ETL_Modal.showResults) {
                        window.UI_ETL_Modal.updateProgress(1, 1, true, null, 'Análisis Estructural Completo');
                        setTimeout(() => {
                            window.UI_ETL_Modal.showResults({ success: payloads.length, duplicate: 0, error: 0 });
                        }, 500);
                    }
                    
                    resolve(payloads);

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
