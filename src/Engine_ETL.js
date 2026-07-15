/**
 * Engine_ETL.gs
 * Subsistema especializado en operaciones de Extracción, Transformación y Carga masiva.
 * Aisla la lógica de SpreadsheetApp y generación de Drive de los adaptadores de base de datos generales.
 */

var Engine_ETL = (function() {

  /**
   * Genera una hoja de cálculo en Drive basada en el schema de la entidad.
   * Excluye metadata del sistema para proveer un archivo limpio.
   * 
   * @param {string} entityName 
   * @returns {string} URL de la Hoja de Google Sheets
   */
  function generateDriveTemplate(entityName) {
    if (typeof getAppSchema !== 'function') throw new Error("No se encuentra Schema_Engine en este contexto.");
    const schema = getAppSchema(entityName);
    if (!schema) throw new Error("No existe esquema para la entidad " + entityName);

    // 1. Filtrar campos que no pertenecen a la Ingesta de forma dinámica (H10 resuelto)
    let excludedFields = [];
    if (typeof FIELD_TEMPLATES !== 'undefined') {
      const technicalTemplates = [
        ...(FIELD_TEMPLATES.SYSTEM_FIELDS ? FIELD_TEMPLATES.SYSTEM_FIELDS() : []),
        ...(FIELD_TEMPLATES.ESTADO_FIELD ? FIELD_TEMPLATES.ESTADO_FIELD() : []),
        ...(FIELD_TEMPLATES.AUDIT_FIELDS ? FIELD_TEMPLATES.AUDIT_FIELDS() : []),
        ...(FIELD_TEMPLATES.VERSION_FIELD ? FIELD_TEMPLATES.VERSION_FIELD() : [])
      ];
      excludedFields = technicalTemplates.map(f => f.name);
    } else {
      // Fallback estricto
      excludedFields = [
        'created_at', 'created_by', 'updated_at', 'updated_by', 
        'deleted_at', 'deleted_by', 'estado', '_version', 'lexical_id'
      ];
    }
    
    const headers = [];
    schema.fields.forEach(f => {
      if (f.type === 'divider' || f.type === 'title') return;
      if (f.type === 'hidden') return;  // Omitir ocultos por defecto
      if (f.primaryKey === true) return; // El Motor DB genera los UUID de PK solos, no se piden al usuario
      
      if (f.excludeFromETL === true) return; // Exclusión explícita manual
      
      if ((f.type === 'relation' || f.isTemporalGraph || f.isEdge) && !f.allowInETL) return; // Topologías Padre-Hijo excluidas por defecto, salvo flag
      
      if (f.type === 'image' || f.type === 'file' || f.name === 'avatar') return; // Elementos multimedia o binarios estorbosos excluidos
      if (excludedFields.includes(f.name)) return;
      
      headers.push(f.name);
    });

    if (headers.length === 0) {
      throw new Error("El esquema no tiene campos editables.");
    }

    // 2. Crear Sheet en la raíz del Drive
    const humanName = schema.labelPlural || entityName;
    const ssName = "Plantilla Carga Masiva - " + humanName;
    const ss = SpreadsheetApp.create(ssName);
    
    // 3. Formatear la Hoja Principal
    const sheet = ss.getActiveSheet();
    sheet.setName(humanName);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E8EAF6"); // Color Corporativo Suave
    sheet.setFrozenRows(1);

    // Opcional: Forzar ancho uniforme requerido por UX
    for (let i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 200);
      const colName = headers[i - 1];
      if (colName === 'roles_asignados') {
        headerRange.getCell(1, i).setNote("Escribe los nombres de los Roles separados por comas.\nEjemplo: Scrum Master, Product Owner\nPuedes consultar los nombres exactos en la pestaña _Catalogos.");
      }
      if (colName === 'equipo') {
        headerRange.getCell(1, i).setNote("Escribe los nombres de los Equipos separados por comas.\nEjemplo: Equipo Alpha, Equipo Beta\nPuedes consultar los nombres exactos en la pestaña _Catalogos.");
      }
    }

    // 4. Inyectar Pestaña de Catálogos y Validaciones
    try {
      const catalogSheet = ss.insertSheet('_Catalogos');
      catalogSheet.hideSheet(); // Ocultar para no ensuciar la vista principal
      
      let colIndex = 1;
      let rolesCatalogRange = null;
      let equiposCatalogRange = null;
      
      // Catálogo de Roles
      if (typeof Engine_DB !== 'undefined') {
        const rolesObj = Engine_DB.list('Rol');
        if (rolesObj && rolesObj.rows && rolesObj.rows.length > 0) {
          catalogSheet.getRange(1, colIndex).setValue("Catálogo de Roles").setFontWeight("bold");
          const rolesList = rolesObj.rows.map(r => [r.nombre]);
          catalogSheet.getRange(2, colIndex, rolesList.length, 1).setValues(rolesList);
          rolesCatalogRange = catalogSheet.getRange(2, colIndex, rolesList.length, 1);
          colIndex++;
        }
      }
      
      // Catálogo de Equipos
      if (typeof Engine_DB !== 'undefined') {
        const equiposObj = Engine_DB.list('Equipo');
        if (equiposObj && equiposObj.rows && equiposObj.rows.length > 0) {
          catalogSheet.getRange(1, colIndex).setValue("Catálogo de Equipos").setFontWeight("bold");
          const equiposList = equiposObj.rows.map(r => [r.nombre]);
          catalogSheet.getRange(2, colIndex, equiposList.length, 1).setValues(equiposList);
          equiposCatalogRange = catalogSheet.getRange(2, colIndex, equiposList.length, 1);
          colIndex++;
        }
      }
      
      // Auto-resize
      if (colIndex > 1) {
        for (let j = 1; j < colIndex; j++) {
          catalogSheet.autoResizeColumn(j);
        }
      }

      // Aplicar las validaciones a la hoja principal
      for (let i = 1; i <= headers.length; i++) {
        const colName = headers[i - 1];
        if (colName === 'roles_asignados' && rolesCatalogRange) {
          const rule = SpreadsheetApp.newDataValidation()
            .requireValueInRange(rolesCatalogRange, true)
            .setAllowInvalid(true)
            .build();
          sheet.getRange(2, i, 1000).setDataValidation(rule);
        } else if (colName === 'equipo' && equiposCatalogRange) {
          const rule = SpreadsheetApp.newDataValidation()
            .requireValueInRange(equiposCatalogRange, true)
            .setAllowInvalid(true)
            .build();
          sheet.getRange(2, i, 1000).setDataValidation(rule);
        } else {
          const field = schema.fields.find(f => f.name === colName);
          if (field && field.type === 'select' && field.options && field.options.length > 0) {
            const rule = SpreadsheetApp.newDataValidation()
              .requireValueInList(field.options, true)
              .setAllowInvalid(true)
              .build();
            sheet.getRange(2, i, 1000).setDataValidation(rule);
          }
        }
      }
    } catch(e) {
      if (typeof Logger !== 'undefined') Logger.log("No se pudo inyectar el catálogo: " + e.toString());
    }

    // 5. Hacer el archivo editable para el tester/usuario final
    try {
      // Eliminado por restricción de GCP: Drive API bloqueada en la organización
    } catch(e) {
      if (typeof Logger !== 'undefined') Logger.log("Error al aplicar permisos a la plantilla: " + e.toString());
    }

    // 6. Retornar link
    return ss.getUrl();
  }

  /**
   * Genera un Google Sheet con los datos filtrados, excluyendo UUIDs y campos de sistema.
   * @param {string} entityName
   * @param {Array} columns
   * @param {Array} rows
   */
  function exportDataToSheet(entityName, columns, rows) {
    if (!columns || columns.length === 0) throw new Error("No hay configuración de columnas.");
    
    // Omitir campos de sistema explícitamente para asegurar que la descarga sirva como "Plantilla Limpia"
    const SYS_COLS = ['created_at', 'create_by', 'created_by', 'updated_at', 'update_at', 'update_by', 'deleted_at', 'deleted_by', 'version', '_version', '_checkbox_', '_row_num_'];
    
    let pkCol = 'id';
    try {
      if (typeof getAppSchema === 'function') {
        const schema = getAppSchema(entityName);
        if (schema && schema.primaryKey) pkCol = schema.primaryKey;
      }
    } catch(e) {}
    
    // Si es una plantilla vacía (sin filas), omitir también la llave primaria para no confundir al usuario (ej. ID)
    if (!rows || rows.length === 0) {
      SYS_COLS.push(pkCol);
      SYS_COLS.push('id');
    }

    
    // WYSIWYG mode: Only export visible columns
    const visibleCols = columns.filter(c => c.visible && !SYS_COLS.includes(c.key || c.name));
    
    const headers = visibleCols.map(c => c.label || c.key || c.name);
    const keys = visibleCols.map(c => c.key || c.name);
    
    const ssName = "Exportación " + entityName + " - " + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
    const ss = SpreadsheetApp.create(ssName);
    const sheet = ss.getActiveSheet();
    sheet.setName(entityName);
    
    // 1. Formatear la Hoja Principal
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E8EAF6"); // Color Corporativo Suave
    sheet.setFrozenRows(1);
    
    // Opcional: Forzar ancho uniforme requerido por UX
    for (let i = 1; i <= headers.length; i++) {
      sheet.setColumnWidth(i, 200);
    }
    
    // 2. Inyectar Filas de Datos
    if (rows && rows.length > 0) {
      const data2D = rows.map((row, rowIndex) => {
        return keys.map(key => {
          if (key === '_num') return rowIndex + 1;
          let val = row[key];
          if (val === undefined || val === null) return "";
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        });
      });
      
      const dataRange = sheet.getRange(2, 1, rows.length, headers.length);
      
      // Pre-formatear columnas sensibles como Texto Plano para evitar que Sheets las auto-convierta a fecha (ej. "orden_path")
      keys.forEach((key, i) => {
        if (key === 'orden_path' || key === 'id_externo' || key === 'path_completo_es') {
          sheet.getRange(2, i + 1, rows.length, 1).setNumberFormat("@");
        }
      });
      
      dataRange.setValues(data2D);
    }
    
    // 3. Hacer el archivo editable para el tester/usuario final
    try {
      // Eliminado por restricción de GCP: Drive API bloqueada en la organización
    } catch(e) {
      if (typeof Logger !== 'undefined') Logger.log("Error al aplicar permisos a la exportación: " + e.toString());
    }

    return ss.getUrl();
  }

  /**
   * Lee la sábana de datos crudos de una hoja de cálculo en Drive.
   * Filtra las filas estériles e inyecta las cabeceras como keys.
   * 
   * @param {string} entityName 
   * @param {string} urlOrId 
   * @param {object} options
   * @returns {Array<Object>|Array<Array>} Arreglo de Registros o Matriz 2D
   */
  function extractDataFromDrive(entityName, urlOrId, options = {}) {
    if (!urlOrId || urlOrId.trim() === '') {
      throw new Error("URL o ID ausente.");
    }
    
    // Regex puro nativo JS
    let sheetId = urlOrId.trim();
    const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      sheetId = match[1];
    }

    let ss;
    try {
      ss = SpreadsheetApp.openById(sheetId);
    } catch (e) {
      throw new Error("El archivo introducido es inaccesible o no es una Hoja de Cálculo válida de Google Sheets. Asegúrate de que no sea un .xlsx. (" + e.message + ")");
    }
    
    const sheets = ss.getSheets();
    let bestSheet = sheets[0];
    let maxOverlap = -1;
    let schema = null;
    
    try {
        if (typeof getAppSchema === 'function') schema = getAppSchema(entityName);
    } catch(e) {}
    
    if (schema && schema.fields) {
        const schemaFields = schema.fields.map(f => String(f.name).toLowerCase());
        
        for (let i = 0; i < sheets.length; i++) {
            const tempSheet = sheets[i];
            const lastCol = tempSheet.getLastColumn();
            const lastRow = tempSheet.getLastRow();
            if (lastCol === 0 || lastRow < 2) continue;
            
            const firstRow = tempSheet.getRange(1, 1, 1, lastCol).getValues()[0];
            const fileHeaders = firstRow.map(k => {
                let lowKey = getFieldNameFromLabel(entityName, k);
                return lowKey;
            });

            let matchCount = 0;
            fileHeaders.forEach(h => {
                if (schemaFields.includes(h) || h === 'id' || h.startsWith('sys_') || h.startsWith('file_')) {
                    matchCount++;
                }
            });
            
            const overlapRatio = fileHeaders.length > 0 ? matchCount / fileHeaders.length : 0;
            if (overlapRatio > maxOverlap) {
                maxOverlap = overlapRatio;
                bestSheet = tempSheet;
            }
        }
        
        if (maxOverlap <= 0) {
            throw new Error("Formato Incompatible: Los encabezados del archivo no coinciden con la entidad " + entityName);
        }
    }
    const sheet = (maxOverlap >= 0.30) ? bestSheet : sheets[0];
    const rawDataRange = sheet.getDataRange();
    const rawValues = rawDataRange.getValues();

    let trueLastRow = 0;
    for (let r = rawValues.length - 1; r >= 0; r--) {
        if (rawValues[r].some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "")) {
            trueLastRow = r + 1;
            break;
        }
    }
    
    if (trueLastRow < 2) {
      throw new Error("La hoja de cálculo está vacía o carece de registros.");
    }

    const data = sheet.getRange(1, 1, trueLastRow, rawDataRange.getNumColumns()).getDisplayValues();

    if (options.rawMatrix) {
        return data; // Return 2D array directly for specialized parsers
    }
    
    const headers = data[0]; // Fila 0 es el Diccionario de Cabeceras
    const records = [];
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const record = {};
        let isEmptyRow = true;
        
        for (let j = 0; j < headers.length; j++) {
            const header = headers[j];
            if (!header || header.trim() === '') continue; // Cabecera vacía no sirve
            
            const mappedKey = getFieldNameFromLabel(entityName, header) || header;
            
            const value = row[j];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
               isEmptyRow = false;
               record[mappedKey] = value;
            }
        }
        
        if (!isEmptyRow) {
            record._sheetId = sheetId;
            record._sheetName = sheet.getName();
            record._rowIndex = i + 1; // 1-indexed for SpreadsheetApp (row 1 is header)
            
            // Aplicar hook de metadatos si está definido
            if (typeof APP_SCHEMAS !== 'undefined' && APP_SCHEMAS[entityName] && APP_SCHEMAS[entityName].etlHooks && typeof APP_SCHEMAS[entityName].etlHooks.onRowTransform === 'function') {
                records.push(APP_SCHEMAS[entityName].etlHooks.onRowTransform(record));
            } else {
                records.push(record);
            }
        }
    }
    
    return records;
  }

  /**
   * Pre-procesamiento de Batch: Deduplicación e Hidratación Automática (Workspace)
   * Modifica los registros "in-place" antes de enviarlos a Engine_DB para preservar la Idempotencia y Reglas de Negocio.
   * 
   * @param {string} entityName
   * @param {Array<Object>} items 
   */
  function hydrateAndDeduplicate(entityName, items) {
       if (!Array.isArray(items) || items.length === 0) return { data: items }; // Returns an object now for Extensibility
       
       const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
       const pkField = schema && schema.primaryKey ? schema.primaryKey : 'id';
       const uniqueFields = (schema && schema.fields) ? schema.fields.filter(f => f.unique === true).map(f => f.name) : [];
       
       let dbRowsForLookup = null;
       const lookupMaps = {}; // { 'email': { 'test@...': row }, 'numero_empleado': { '123': row } }

        if (uniqueFields.length > 0) {
            if (typeof Engine_DB !== 'undefined') {
               if (typeof Logger !== 'undefined') Logger.log(`[ETL Debug] Fetching dbRowsForLookup for entity: ${entityName} with uniqueFields: ${uniqueFields}`);
               const listResult = Engine_DB.list(entityName, 'objects'); // Obtenemos contexto en caché O(1)
               dbRowsForLookup = listResult.rows || [];
               
               if (typeof Logger !== 'undefined') Logger.log(`[ETL Debug] dbRowsForLookup size: ${dbRowsForLookup.length}`);
               
               // Inicializar diccionarios por cada Unique Field
               uniqueFields.forEach(uf => { lookupMaps[uf] = {}; });
               
               // Pre-indexar O(M)
               if (uniqueFields.length > 0) {
                   dbRowsForLookup.forEach(row => {
                       uniqueFields.forEach(uf => {
                           if (row[uf]) {
                               const normKey = String(row[uf]).trim().toLowerCase();
                               lookupMaps[uf][normKey] = row;
                           }
                       });
                   });
               }
               
               if (typeof Logger !== 'undefined') {
                   uniqueFields.forEach(uf => {
                       Logger.log(`[ETL Debug] lookupMaps[${uf}] size: ${Object.keys(lookupMaps[uf]).length}`);
                   });
               }
            }
        }


       // Normalización de Strings (Title Case) para coincidir con catálogos
       const toTitleCase = (str) => {
           if (!str || typeof str !== 'string') return str;
           // Aplica Capitalize (Ej: "DATA ENGINEER, FRONT-END" -> "Data Engineer, Front-End")
           return str.toLowerCase().replace(/(?:^|[\s,\-\/])\w/g, match => match.toUpperCase());
       };

       items.forEach(payload => {
           if (payload.roles_asignados) payload.roles_asignados = toTitleCase(payload.roles_asignados);
           if (payload.equipo) payload.equipo = toTitleCase(payload.equipo);
           if (payload.cargo) payload.cargo = toTitleCase(payload.cargo);
           
           // B. Deduplicación Pasiva (Identity Resolution) O(1) Search Mode
               if (uniqueFields.length > 0) {
                   let matchedRow = null;
                   let evalKeys = [];
                   for (let j = 0; j < uniqueFields.length; j++) {
                       const uField = uniqueFields[j];
                       if (payload[uField]) {
                           const searchKey = String(payload[uField]).trim().toLowerCase();
                           evalKeys.push(`${uField}=${searchKey}`);
                           if (lookupMaps[uField] && lookupMaps[uField][searchKey]) {
                               matchedRow = lookupMaps[uField][searchKey];
                               break; // Un solo match lógico es suficiente para sobreescribir la PK
                           }
                       }
                   }
                   
                   if (matchedRow === undefined) {
                        matchedRow = null;
                    }
                    
                    if (typeof Logger !== 'undefined') {
                       Logger.log(`[ETL Debug] payload eval keys: ${evalKeys.join(', ')} -> matchedRow: ${matchedRow ? matchedRow[pkField] : 'NULL'} | _isNewIngest: ${payload._isNewIngest}`);
                   }
                   
                    if (matchedRow) {
                        if (payload._isNewIngest) {
                            payload._isDuplicateMatch = true;
                            if (typeof Logger !== 'undefined') Logger.log(`[ETL Debug] SET _isDuplicateMatch = true FOR ${matchedRow[pkField]}`);
                        }
                        
                        // [BUGFIX] S61.15 Intra-Batch Deduplication Fix
                        if (!matchedRow[pkField]) {
                            // Ambos son nuevos en este mismo lote. Fusionamos información y descartamos el duplicado.
                            Object.assign(matchedRow, payload);
                            payload._dropFromBatch = true; // Marcar para eliminar del lote
                        } else {
                            // El matchedRow ya existe en DB, preparamos actualización normal
                            payload._tempId = payload[pkField]; 
                            payload[pkField] = matchedRow[pkField]; // Subsumimos el Temp UUID y forzamos modo UPDATE
                        }
                    } else {
                        // [BUGFIX] Intra-Batch Deduplication: Add the new row to lookupMaps
                        // so that subsequent rows in the same batch with the same unique key will match it.
                        for (let j = 0; j < uniqueFields.length; j++) {
                            const uField = uniqueFields[j];
                            if (payload[uField]) {
                                const searchKey = String(payload[uField]).trim().toLowerCase();
                                if (!lookupMaps[uField]) lookupMaps[uField] = {};
                                lookupMaps[uField][searchKey] = payload;
                            }
                        }
                    }
                }
       });

       // A. Aplicación de Business Interceptors (S45.1) AFTER deduplication so they use Real IDs
       if (typeof Business_Interceptors !== 'undefined') {
           Business_Interceptors.apply(entityName, items);
       }

       // [S44.11] Commit batch creations before closing pipeline - REMOVIDO (Movido a Interceptor)

       // Filtrar los duplicados intra-lote marcados para descarte
       items = items.filter(p => !p._dropFromBatch);

       return { data: items }; // Return payload wrapped in object
  }

  /**
   * writebackFeedback
   * Abre la plantilla de origen y pinta las filas según el feedback (Amarillo para duplicados, Rojo para errores).
   * Añade el mensaje a la última columna de datos.
   */
  function writebackFeedback(sheetId, feedbackArray) {
      if (!sheetId || !feedbackArray || feedbackArray.length === 0) return false;
      
      let ss;
      try {
          ss = SpreadsheetApp.openById(sheetId);
      } catch (e) {
          Logger.log("[ETL Writeback Error] No se pudo abrir Spreadsheet: " + sheetId);
          return false;
      }
      
      // Determinar qué hoja usar (usamos el _sheetName del primer feedback si existe)
      let targetSheetName = feedbackArray[0]._sheetName;
      let sheet = targetSheetName ? ss.getSheetByName(targetSheetName) : ss.getSheets()[0];
      if (!sheet) sheet = ss.getSheets()[0];
      const numCols = sheet.getLastColumn() || 1;
      
      // Buscar si la columna de Estado ya existe
      let feedbackCol = numCols;
      let headerCell = sheet.getRange(1, feedbackCol);
      
      if (headerCell.getValue() !== 'Estado Ingesta') {
          // Si no existe en la última, agregamos una nueva
          feedbackCol = numCols + 1;
          headerCell = sheet.getRange(1, feedbackCol);
          headerCell.setValue('Estado Ingesta');
          headerCell.setFontWeight('bold');
      }
      // Procesar fila por fila (al ser pocas, no importa tanto el timeout, pero lo hacemos rápido)
      feedbackArray.forEach(fb => {
          if (!fb._rowIndex) return;
          
          const range = sheet.getRange(fb._rowIndex, 1, 1, feedbackCol);
          
          if (fb.status === 'duplicate') {
              range.setBackground('#FFF2CC'); // Amarillo pastel
          } else if (fb.status === 'error') {
              range.setBackground('#FCE8E6'); // Rojo pastel
          } else if (fb.status === 'success') {
              range.setBackground('#E6F4EA'); // Verde pastel (éxito)
          }
          
          // Setear el mensaje en la última columna
          sheet.getRange(fb._rowIndex, feedbackCol).setValue(fb.message || fb.reason || 'Operación exitosa');
      });
      
      return true;
  }

  /**
   * inspectDriveSheet
   * Realiza una pre-validación de un archivo de Google Sheets.
   * Útil para UI feedback antes de extraer la data pesada.
   */
  function inspectDriveSheet(entityName, urlOrId) {
      if (!urlOrId || urlOrId.trim() === '') {
          throw new Error("URL o ID ausente.");
      }
      
      let sheetId = urlOrId.trim();
      const match = urlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
          sheetId = match[1];
      }
      
      let ss;
        try {
          ss = SpreadsheetApp.openById(sheetId);
        } catch(e) {
          throw new Error("El archivo introducido es inaccesible o no es válido. Asegúrate de que no sea un .xlsx. (" + e.message + ")");
        }
      
      const sheets = ss.getSheets();
      let bestSheet = sheets[0];
      let maxOverlap = -1;
      let schema = null;
      
      try {
          if (typeof getAppSchema === 'function') schema = getAppSchema(entityName);
      } catch(e) {}
      
      const sheetInfos = [];
      
      for (let i = 0; i < sheets.length; i++) {
          const tempSheet = sheets[i];
          const lastCol = tempSheet.getLastColumn();
          const lastRow = tempSheet.getLastRow();
          
          let overlapRatio = 0;
          if (schema && schema.fields && lastCol > 0 && lastRow >= 1) {
              const schemaFields = schema.fields.map(f => String(f.name).toLowerCase());
              const firstRow = tempSheet.getRange(1, 1, 1, lastCol).getValues()[0];
              const fileHeaders = firstRow.map(k => String(k).trim().toLowerCase().replace(/\s+/g, ' '));
              
              let matchCount = 0;
              fileHeaders.forEach(h => {
                  let mappedKey = getFieldNameFromLabel(entityName, h);
                  
                  if (schemaFields.includes(mappedKey) || mappedKey === 'id' || mappedKey.startsWith('sys_') || mappedKey.startsWith('file_')) {
                      matchCount++;
                  }
              });
              overlapRatio = fileHeaders.length > 0 ? matchCount / fileHeaders.length : 0;
          }
          
          if (overlapRatio > maxOverlap) {
              maxOverlap = overlapRatio;
              bestSheet = tempSheet;
          }
          
          sheetInfos.push({
              name: tempSheet.getName(),
              rows: lastRow,
              cols: lastCol,
              overlap: overlapRatio
          });
      }
      
      return {
          sheetId: sheetId,
          title: ss.getName(),
          bestSheetName: bestSheet.getName(),
          maxOverlap: maxOverlap,
          isValid: maxOverlap >= 0.30,
          sheets: sheetInfos
      };
  }

  // --- Public API ---
  return {
    generateDriveTemplate: generateDriveTemplate,
    extractDataFromDrive: extractDataFromDrive,
    hydrateAndDeduplicate: hydrateAndDeduplicate,
    writebackFeedback: writebackFeedback,
    inspectDriveSheet: inspectDriveSheet,
    exportDataToSheet: exportDataToSheet
  };

})();

// Export for Node.js environments (Jest)
if (typeof module !== 'undefined') {
  module.exports = { Engine_ETL };
}
