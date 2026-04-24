/**
 * E5 ETL Migration Script: Flat-to-DAG (O(1) In-Memory)
 * 
 * DESCRIPTION:
 * This script extracts the legacy flat tree hierarchy from the 'Dominios' sheet,
 * instantiates the dynamic 'Relacion_Dominios' sheet acting as a bridge Temporal DAG
 * applying SCD-2 records, and purges the legacy 'id_dominio_padre' metadata to string "".
 * 
 * Invoked once procedurally by the Administrator. 
 * ZERO DOWNTIME. ZERO LATENCY. NO FOR-LOOPS on Disk.
 */

function ETL_Pivot_E5() {
  const ssId = CONFIG.SPREADSHEET_ID_DB; // Acceso a la Global DB
  const ss = SpreadsheetApp.openById(ssId);
  
  // 1. EXTRACT
  const sheetDom = ss.getSheetByName("Dominios");
  if (!sheetDom) throw new Error("CRITICAL: Hoja Dominios no encontrada en BD.");
  
  Logger.log("[ETL] Mem-Lock Initiated: Extracting Dominios Matrix...");
  let data = sheetDom.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log("[ETL] ABORTO: Hoja sin registros.");
    return;
  }
  
  // Header Matrix Map
  const headers = data[0];
  const idxP = headers.indexOf("id_dominio_padre");
  const idxId = headers.indexOf("id_dominio");
  const idxC = headers.indexOf("created_at");
  
  if (idxP === -1 || idxId === -1) {
    throw new Error("CRITICAL: Headers corruptos en Dominios. Falta ID o Padre.");
  }
  
  // Bridge Sheet Headers (APP_SCHEMAS.Relacion_Dominios matching)
  let relaciones = [[
    "id_relacion", 
    "id_nodo_padre", 
    "id_nodo_hijo", 
    "tipo_relacion", 
    "peso_influencia", 
    "valido_desde", 
    "valido_hasta", 
    "es_version_actual", 
    "created_at", 
    "created_by", 
    "updated_at", 
    "updated_by"
  ]];
  
  // 2. TRANSFORM (SCD-2 Loop)
  Logger.log("[ETL] Parsing SCD-2 topology. Iterating " + (data.length - 1) + " nodes...");
  let aristasCreadas = 0;
  
  for (let i = 1; i < data.length; i++) {
    let row = data[i];
    let parentId = row[idxP];
    
    // Strict Validation (ignoring NULLs, empty spaces, and exact word "NULL" from sheets legacy cache)
    if (parentId && parentId.toString().trim() !== "" && parentId.toString().trim() !== "NULL") {
      
      let childId = row[idxId];
      let rID = "RELA-" + Utilities.getUuid().substring(0, 5).toUpperCase();
      let sysDate = new Date().toISOString();
      let originalDate = (idxC !== -1 && row[idxC]) ? row[idxC] : sysDate;
      
      // Inject the Edge
      relaciones.push([
        rID,
        parentId,
        childId,
        "Militar_Directa",
        1,
        originalDate, // valido_desde
        "",           // valido_hasta
        true,         // es_version_actual
        sysDate,      // created_at
        "ETL_SYSTEM", // created_by
        "",           // updated_at
        ""            // updated_by
      ]);
      aristasCreadas++;
      
      // Extirpation: Wipe the legacy tracker from the memory reference
      row[idxP] = "";
    } else {
      // Si el field contiene nulls abstractos (ej. "NULL" string) forzamos el vacío puro
      row[idxP] = "";
    }
  }
  
  Logger.log(`[ETL] Topology Parser Completed. Aristas descubiertas: ${aristasCreadas}`);
  
  // 3. LOAD (Batch I/O O(1))
  Logger.log("[ETL] Ejecutando Dual Bulk 'setValues'...");
  
  // A) Crear/Preparar hoja Relacion_Dominios
  let sheetRel = ss.getSheetByName("Relacion_Dominios");
  if (!sheetRel) {
    Logger.log("[ETL] Notice: Relacion_Dominios NO existente. Instanciando...");
    sheetRel = ss.insertSheet("Relacion_Dominios");
  } else {
    // Si ya existe limpiamos su rastro para no duplicar en caso de fallo parcial anterior
    sheetRel.clear();
  }
  
  // B) Batch Inject Relations
  if (relaciones.length > 0) {
    sheetRel.getRange(1, 1, relaciones.length, relaciones[0].length).setValues(relaciones);
    Logger.log("[ETL] SUCCESS: Relacion_Dominios bulk overwriten con " + relaciones.length + " filas.");
  }
  
  // C) Batch Overwrite Flat Legacy Domains
  sheetDom.getRange(1, 1, data.length, data[0].length).setValues(data);
  Logger.log("[ETL] SUCCESS: Dominios bulk overwriten. Columna purgada exitósamente.");
  
  return `ETL SUCCESS. ${aristasCreadas} relaciones establecidas. Columna padre flat mutilada.`;
}
