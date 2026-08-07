// =====================================================================
// AUDIT LOGGER — Registro de Ejecuciones (Fase 3)
// =====================================================================

/**
 * registrarEjecucion — Guarda un log de la ejecución en la hoja "Audit_Log"
 * @param {Object} resultado El objeto devuelto por el orquestador
 * @param {number} duracionSegundos El tiempo total en segundos
 * @param {string} trigger "webhook" o "cron"
 */
function registrarEjecucion(resultado, duracionSegundos, trigger) {
  try {
    var config = cargarConfiguracion();
    var libro = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    var hojaAudit = libro.getSheetByName("Audit_Log");
    
    // Si la hoja no existe, crearla y poner encabezados
    if (!hojaAudit) {
      hojaAudit = libro.insertSheet("Audit_Log");
      hojaAudit.appendRow([
        "Timestamp", 
        "Trigger", 
        "Procesados OK", 
        "Errores", 
        "Entradas $", 
        "Salidas $", 
        "Duración (s)", 
        "Continuación Automática"
      ]);
      hojaAudit.getRange("A1:H1").setFontWeight("bold");
    }
    
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    
    // Insertar en la fila 2 para mantener los más recientes arriba
    hojaAudit.insertRowBefore(2);
    hojaAudit.getRange("A2:H2").setValues([[
      timestamp,
      trigger,
      resultado.procesados,
      resultado.errores,
      resultado.totalEntradas,
      resultado.totalSalidas,
      duracionSegundos,
      resultado.continuacion ? "Sí" : "No"
    ]]);
    
  } catch (e) {
    Logger.log("Error al registrar auditoría: " + e.toString());
  }
}
