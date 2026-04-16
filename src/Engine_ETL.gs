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
   * @returns {Array<Object>} Arreglo de Registros
   */
  function extractDataFromDrive(entityName, urlOrId) {
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
      throw new Error("El archivo introducido es inaccesible o no es una Hoja de Cálculo válida de Google Sheets. Verifica los permisos de Drive.");
    }
    
    const sheet = ss.getSheets()[0]; // Leemos la hoja maestra / primera posición
    const data = sheet.getDataRange().getValues();
    
    if (!data || data.length < 2) {
      throw new Error("La hoja de cálculo está vacía o carece de registros.");
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
       if (!Array.isArray(items) || items.length === 0) return;
       
       const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
       const pkField = schema && schema.primaryKey ? schema.primaryKey : 'id';
       const uniqueFields = (schema && schema.fields) ? schema.fields.filter(f => f.unique === true).map(f => f.name) : [];
       
       let dbRowsForLookup = null;
       const lookupMaps = {}; // { 'email': { 'test@...': row }, 'numero_empleado': { '123': row } }

       if (uniqueFields.length > 0 || entityName === 'Persona') {
           if (typeof Engine_DB !== 'undefined') {
              const listResult = Engine_DB.list(entityName, 'objects'); // Obtenemos contexto en caché O(1)
              dbRowsForLookup = listResult.rows || [];
              
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
           }
       }

       items.forEach(payload => {
           // A. Re-hidratación Silenciosa al vuelo para Workspace (Zero-Touch Population)
           if (entityName === 'Persona' && typeof resolverDirectorioWorkspace !== 'undefined') {
               // Solo disparamos el hook si tiene email y viene con nombre en blanco/indefinido
               if (payload.email && (!payload.nombre || String(payload.nombre).trim() === '')) {
                   try {
                       const wsData = resolverDirectorioWorkspace(payload.email);
                       if (wsData && wsData.__status !== "DISABLED" && wsData.__status !== "ERROR") {
                           Object.keys(wsData).forEach(k => {
                               if (payload[k] === undefined || payload[k] === null || payload[k] === '') {
                                   payload[k] = wsData[k];
                               }
                           });
                           if (typeof Logger !== 'undefined') Logger.log(`[Batch Hook] Persona Re-Hidratada Automáticamente: ${payload.email}`);
                       }
                   } catch(e) {
                        // Fallback silencioso: no truncar el batch si Workspace API rate-limitea
                       if (typeof Logger !== 'undefined') Logger.log(`[Batch Hook] Ignorando error WS para ${payload.email}: ${e.message}`);
                   }
               }
           }

           // B. Deduplicación Pasiva (Identity Resolution) O(1) Search Mode
           if (uniqueFields.length > 0) {
               let matchedRow = null;
               for (let j = 0; j < uniqueFields.length; j++) {
                   const uField = uniqueFields[j];
                   if (payload[uField]) {
                       const searchKey = String(payload[uField]).trim().toLowerCase();
                       if (lookupMaps[uField] && lookupMaps[uField][searchKey]) {
                           matchedRow = lookupMaps[uField][searchKey];
                           break; // Un solo match lógico es suficiente para sobreescribir la PK
                       }
                   }
               }
               
               if (matchedRow) {
                   payload[pkField] = matchedRow[pkField]; // Subsumimos el Temp UUID y forzamos modo UPDATE
               }
           }
       });
  }

  // --- Public API ---
  return {
    generateDriveTemplate: generateDriveTemplate,
    extractDataFromDrive: extractDataFromDrive,
    hydrateAndDeduplicate: hydrateAndDeduplicate
  };

})();

// Export for Node.js environments (Jest)
if (typeof module !== 'undefined') {
  module.exports = { Engine_ETL };
}
