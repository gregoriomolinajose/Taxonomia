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
      if (f.type === 'relation' || f.isTemporalGraph || f.isEdge) return; // Las topologías Padre-Hijo no se inyectan en cargas planas
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
    }

    // 4. Retornar link
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
      const file = DriveApp.getFileById(sheetId);
      const mime = file.getMimeType();
      if (mime !== MimeType.GOOGLE_SHEETS) {
        throw new Error("El archivo no es un Google Sheet nativo (MimeType: " + mime + "). Si es un archivo de Excel (.xlsx), ábrelo y selecciona 'Archivo > Guardar como hoja de cálculo de Google'.");
      }
      ss = SpreadsheetApp.openById(sheetId);
    } catch (e) {
      if (e.message.includes("MimeType")) throw e; // Re-throw our explicit error
      throw new Error("El archivo introducido es inaccesible o no es una Hoja de Cálculo válida de Google Sheets. Verifica los permisos de Drive.");
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
                let lowKey = String(k).trim().toLowerCase();
                if (entityName === 'Dominio') {
                    if (lowKey === 'nivel subdominio') lowKey = 'nivel_tipo';
                    else if (lowKey === 'orden. subdominio' || lowKey === 'orden subdominio') lowKey = 'orden_path';
                    else if (lowKey === 'subdominio') lowKey = 'nombre_ingles';
                    else if (lowKey === 'nombre español') lowKey = 'nombre';
                    else if (lowKey === 'definición' || lowKey === 'definicion') lowKey = 'descripcion';
                    else if (lowKey === 'abreviación (nombre servicio)' || lowKey === 'abreviacion (nombre servicio)') lowKey = 'abreviacion';
                    else if (lowKey === 'abreviación (path servicio)' || lowKey === 'abreviacion (path servicio)') lowKey = 'path_completo_es';
                }
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
    }
    
    const sheet = (maxOverlap >= 0.30) ? bestSheet : sheets[0];
    const data = sheet.getDataRange().getValues();
    
    if (!data || data.length < 2) {
      throw new Error("La hoja de cálculo está vacía o carece de registros.");
    }

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
            
            const value = row[j];
            if (value !== undefined && value !== null && value !== '') {
               isEmptyRow = false;
            }
            record[header] = value;
        }
        
        if (!isEmptyRow) {
            record._sheetId = sheetId;
            record._sheetName = sheet.getName();
            record._rowIndex = i + 1; // 1-indexed for SpreadsheetApp (row 1 is header)
            records.push(record);
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

       if (typeof Business_Interceptors !== 'undefined') {
           Business_Interceptors.apply(entityName, items);
       }

       items.forEach(payload => {
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
                   
                   if (typeof Logger !== 'undefined') {
                       Logger.log(`[ETL Debug] payload eval keys: ${evalKeys.join(', ')} -> matchedRow: ${matchedRow ? matchedRow[pkField] : 'NULL'} | _isNewIngest: ${payload._isNewIngest}`);
                   }
                   
                   if (matchedRow) {
                       if (payload._isNewIngest) {
                           payload._isDuplicateMatch = true;
                           if (typeof Logger !== 'undefined') Logger.log(`[ETL Debug] SET _isDuplicateMatch = true FOR ${matchedRow[pkField]}`);
                       }
                       payload._tempId = payload[pkField]; payload[pkField] = matchedRow[pkField]; // Subsumimos el Temp UUID y forzamos modo UPDATE
                   }
               }
       });

       // [S44.11] Commit batch creations before closing pipeline - REMOVIDO (Movido a Interceptor)

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
          }
          
          // Setear el mensaje en la última columna
          sheet.getRange(fb._rowIndex, feedbackCol).setValue(fb.message || fb.reason || 'Error');
      });
      
      return true;
  }

  // --- Public API ---
  return {
    generateDriveTemplate: generateDriveTemplate,
    extractDataFromDrive: extractDataFromDrive,
    hydrateAndDeduplicate: hydrateAndDeduplicate,
    writebackFeedback: writebackFeedback
  };

})();

// Export for Node.js environments (Jest)
if (typeof module !== 'undefined') {
  module.exports = { Engine_ETL };
}
