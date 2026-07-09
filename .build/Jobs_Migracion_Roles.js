/**
 * @file Jobs_Migracion_Roles.js
 * 
 * Script de uso único (S44.10) para migrar los valores de texto crudo de la columna 
 * 'rol_agil' de DB_Persona hacia la topología formal Sys_Graph_Edges
 * mapeados a la Entidad 'Rol'.
 */

function JOB_MigrarRolesAGrafos() {
  Logger.log("Iniciando Migración Masiva de Roles...");
  
  var dbEngineAvailable = typeof Engine_DB !== 'undefined';
  if (!dbEngineAvailable) {
    Logger.log("ERROR: Ejecución fuera del contenedor nativo. Necesito acceso a Engine_DB.");
    return;
  }
  
  // 1. Cargar el Diccionario de Roles Formales (Topológicos)
  var rolesResponse = Engine_DB.list("Rol", "objects");
  var dbRoles = (rolesResponse && rolesResponse.rows) ? rolesResponse.rows : [];
  
  if (dbRoles.length === 0) {
    Logger.log("ERROR: No hay Roles en la BD. Por favor semilla la tabla DB_Rol primero (Desde Master Data Management).");
    return;
  }
  
  // Mapear Nombres de Rol Múltiples (por si escribieron en RH "Scrum Master" o "SM")
  var mapRoles = {};
  dbRoles.forEach(function(r) {
    var rawName = String(r.nombre || "").trim().toLowerCase();
    mapRoles[rawName] = r.id_rol;
    // Alias populares hardcodeados preventivamente
    if (rawName === "scrum master") mapRoles["sm"] = r.id_rol;
    if (rawName === "product owner") mapRoles["po"] = r.id_rol;
    if (rawName === "release train engineer") mapRoles["rte"] = r.id_rol;
    if (rawName === "agile coach") mapRoles["ac"] = r.id_rol;
  });
  
  // 2. Extraer TODA la tabla DB_Persona de manera RAW para saltarnos el Schema Filter
  var ssId = Global_Config.DB_SHEET_ID;
  var sheet = SpreadsheetApp.openById(ssId).getSheetByName("DB_Persona");
  
  if (!sheet) {
    Logger.log("ERROR: La hoja DB_Persona no fue encontrada.");
    return;
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log("No hay datos en DB_Persona.");
    return;
  }
  
  var headers = data[0];
  var idxIdPersona = headers.indexOf("id_persona");
  var idxRolAgil = headers.indexOf("rol_agil"); // Nombre exacto legacy
  
  if (idxIdPersona === -1) {
    Logger.log("ERROR: No se encontró la columna id_persona.");
    return;
  }
  
  if (idxRolAgil === -1) {
    Logger.log("AVISO VERDE: No se encontró la columna rol_agil. Ya ha sido purgada o la migración fue completada antes.");
    return;
  }
  
  // 3. Procesamiento y Matching
  var successCount = 0;
  var missingCount = 0;
  var notFoundRoles = {};
  var alreadyBlankCount = 0;
  
  var edgesToCreateMap = {}; // Diccionario para amalgamar roles de un mismo source_id
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var idPersona = row[idxIdPersona];
    var rolAgilString = row[idxRolAgil];
    
    if (!idPersona || String(idPersona).trim() === "") continue;
    
    // Evaluar estado actual de la casilla
    if (!rolAgilString || String(rolAgilString).trim() === "") {
        alreadyBlankCount++;
        continue;
    }
    
    // Parseo múltiple: Por si estaban separados por comas
    var rolesArr = String(rolAgilString).split(",");
    var mappedAny = false;
    
    if (!edgesToCreateMap[idPersona]) edgesToCreateMap[idPersona] = { rolesUUIDs: [], row_idx: i + 1 };
    
    rolesArr.forEach(function(rStr) {
      var scrubbed = rStr.trim().toLowerCase();
      if (!scrubbed) return;
      
      var foundUuid = mapRoles[scrubbed];
      if (foundUuid) {
        edgesToCreateMap[idPersona].rolesUUIDs.push(foundUuid);
        mappedAny = true;
      } else {
        notFoundRoles[scrubbed] = (notFoundRoles[scrubbed] || 0) + 1;
      }
    });
    
    if (mappedAny) successCount++;
    else missingCount++;
  }
  
  // 4. Batch Execution usando Engine_Graph para integridad SCD-2
  var personasToPatch = Object.keys(edgesToCreateMap);
  Logger.log("### EJECUTANDO PARCHE EN GRAFOS ###");
  Logger.log("Procesando reasignación temporal para " + personasToPatch.length + " Personas...");
  
  if (personasToPatch.length > 0) {
      personasToPatch.forEach(function(pid) {
         var arrDeRolesReales = edgesToCreateMap[pid].rolesUUIDs;
         var rowToWipe = edgesToCreateMap[pid].row_idx;
         
         if (arrDeRolesReales.length > 0) {
             // Inyectar / Reparar Graph Edges con control Topológico Integrado
             Engine_Graph.patchSCD2Edges(pid, "Persona", "Rol", "PERSONA_ROL", arrDeRolesReales, true);
             
             // Destruir silenciosamente el old payload para evitar la duplicación de trabajo
             sheet.getRange(rowToWipe, idxRolAgil + 1).setValue("");
         }
      });
  }
  
  Logger.log("");
  Logger.log("=========================================");
  Logger.log("REPORTE FINAL: MIGRACION DE ROLES");
  Logger.log("=========================================");
  Logger.log("Personas con match exitoso: " + successCount);
  Logger.log("Personas ya saneadas previamente: " + alreadyBlankCount);
  Logger.log("Personas perdiendo tags por dicc: " + missingCount);
  Logger.log("-----------------------------------------");
  Logger.log("Diccionario de Tags Topológicos NO Mapeados:");
  Logger.log(JSON.stringify(notFoundRoles, null, 2));
  Logger.log("=========================================");
  Logger.log("Migración finalizada con código 0.");
}
