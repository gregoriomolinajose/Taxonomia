// =====================================================================
// DLQ MANAGER — Dead Letter Queue Persistente (Fase 3)
// =====================================================================

/**
 * registrarEnDLQ — Guarda los mensajes que fallaron permanentemente o que necesitan revisión
 * @param {Array<Object>} fallidos Array de objetos fallidos devueltos por el Router
 */
function registrarEnDLQ(fallidos) {
  if (!fallidos || fallidos.length === 0) return;

  try {
    var config = cargarConfiguracion();
    var libro = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    var hojaDLQ = libro.getSheetByName("DLQ");
    
    // Si la hoja no existe, crearla y poner encabezados
    if (!hojaDLQ) {
      hojaDLQ = libro.insertSheet("DLQ");
      hojaDLQ.appendRow([
        "Timestamp", 
        "Message ID", 
        "Asunto", 
        "Snippet", 
        "Razón / Parser"
      ]);
      hojaDLQ.getRange("A1:E1").setFontWeight("bold");
    }
    
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    var filasDLQ = [];
    
    for (var i = 0; i < fallidos.length; i++) {
      var err = fallidos[i];
      var snippet = err.rawMessage ? err.rawMessage.getPlainBody().substring(0, 200).replace(/\n/g, ' ') : "N/A";
      var razon = err.razon || "No match / Validación fallida";
      
      filasDLQ.push([
        timestamp,
        err.id,
        err.subject,
        snippet,
        razon
      ]);
    }
    
    // Insertar en la fila 2 para mantener los más recientes arriba
    hojaDLQ.insertRowsBefore(2, filasDLQ.length);
    hojaDLQ.getRange(2, 1, filasDLQ.length, 5).setValues(filasDLQ);
    
  } catch (e) {
    Logger.log("Error al registrar en DLQ: " + e.toString());
  }
}
