// =====================================================================
// PIPELINE: ORCHESTRATOR — Controlador principal del flujo
// =====================================================================

/**
 * ejecutarPipeline — Ejecuta el flujo completo de Ingest, Route, Validate, Persist
 * Implementa las reglas de resiliencia (R1, R3, R7, R8)
 * 
 * @returns {Object} Resumen de la ejecución {procesados, errores, totalEntradas, totalSalidas, continuacion}
 */
function ejecutarPipeline() {
  var inicio = new Date();
  var config = cargarConfiguracion();
  var resultado = { procesados: 0, errores: 0, totalEntradas: 0, totalSalidas: 0, continuacion: false };
  
  // 1. Configuración Básica
  var spreadsheetId = config.SPREADSHEET_ID;
  var nombreHoja = config.SHEET_NAME;
  var nombreCola = config.LABEL_COLA;
  var nombreOk = config.LABEL_OK;
  var nombreError = config.LABEL_ERROR;
  var maxHilos = config.BATCH_SIZE;

  if (!spreadsheetId) {
    throw new Error("No hay SPREADSHEET_ID configurado en Script Properties.");
  }

  // 2. Validar hoja destino (R3)
  var libro = SpreadsheetApp.openById(spreadsheetId);
  var hoja = libro.getSheetByName(nombreHoja);
  if (!hoja) {
    throw new Error("No se encontró la hoja '" + nombreHoja + "'. Es posible que se haya cambiado el nombre. Actualiza la configuración.");
  }

  // 3. Validar etiquetas
  var etiquetaCola = GmailApp.getUserLabelByName(nombreCola);
  if (!etiquetaCola) { return resultado; } // Si no existe la etiqueta, no hay nada que procesar
  
  var etiquetaOk = GmailApp.getUserLabelByName(nombreOk) || GmailApp.createLabel(nombreOk);
  var etiquetaError = GmailApp.getUserLabelByName(nombreError) || GmailApp.createLabel(nombreError);

  // 4. Cargar IDs existentes para Idempotencia
  var idsExistentes = cargarIdsExistentes(hoja);

  // Función auxiliar para extraer el saldo dinámicamente
  function obtenerSaldo() {
    try {
      SpreadsheetApp.flush(); 
      var headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
      for (var j = 0; j < headers.length; j++) {
        if (headers[j].toString().toLowerCase().indexOf("juliana") !== -1) {
          return hoja.getRange(2, j + 1).getDisplayValue();
        }
      }
      return "No se encontró columna";
    } catch (e) {
      return "Error leyendo celda";
    }
  }

  // 5. Ingest
  var mensajes = ingestFromGmail(etiquetaCola, maxHilos);
  if (mensajes.length === 0) { 
    resultado.saldoJuliana = obtenerSaldo();
    return resultado; 
  }

  // 6. Construir registry de parsers
  var registry = getParserRegistry();

  // 7. Procesar con Router
  var routerResult = procesarMensajes(mensajes, registry, idsExistentes, inicio);
  var exitosos = routerResult.exitosos;
  var fallidos = routerResult.fallidos;
  resultado.continuacion = routerResult.continuacion;

  // 8. Calcular totales y formatear filas para persistencia
  var filasExitosas = [];
  for (var i = 0; i < exitosos.length; i++) {
    var ex = exitosos[i];
    var fechaFormateada = Utilities.formatDate(ex.date, Session.getScriptTimeZone(), "yyyy-MM-dd");
    var fila;
    
    if (ex.tipo === "entrada") {
      fila = [fechaFormateada, ex.categoria, ex.contraparte, "Juliana", ex.monto, ""];
      resultado.totalEntradas += ex.monto;
    } else {
      fila = [fechaFormateada, ex.categoria, ex.contraparte, "Juliana", "", ex.monto];
      resultado.totalSalidas += ex.monto;
    }
    
    // Adjuntamos la fila al objeto para enviarlo a Persist
    ex.fila = fila;
    filasExitosas.push(ex);
  }

  // 9. Persistir en Google Sheets
  if (filasExitosas.length > 0) {
    persistBatch(hoja, filasExitosas);
    resultado.procesados = filasExitosas.length;
  }

  // Extraer el saldo actual de Juliana dinámicamente usando la función auxiliar
  resultado.saldoJuliana = obtenerSaldo();

  resultado.errores = fallidos.length;

  // 10. Gestión de etiquetas
  gestionarEtiquetas(exitosos, fallidos, etiquetaCola, etiquetaOk, etiquetaError);

  // 11. Registrar en DLQ persistente (Fase 3)
  if (fallidos.length > 0) {
    registrarEnDLQ(fallidos);
  }

  // 12. Registrar en Log de Auditoría (Fase 3)
  var duracionSegundos = (new Date() - inicio) / 1000;
  // Determinamos si se llamó desde el trigger de continuación o no (asumimos webhook si no sabemos)
  var triggerType = "webhook/auto";
  registrarEjecucion(resultado, duracionSegundos, triggerType);

  // 13. Auto-programar continuación si hubo timeout
  if (resultado.continuacion) {
    ScriptApp.newTrigger("rutinaDeFondoZelle").timeBased().after(5000).create();
  }

  return resultado;
}

/**
 * gestionarEtiquetas — Cambia etiquetas en bloque aplicando política de hilos mixtos (R8)
 */
function gestionarEtiquetas(exitosos, fallidos, etiquetaCola, etiquetaOk, etiquetaError) {
  var threads = {};
  
  // Registrar éxitos
  exitosos.forEach(function(r) {
    var tid = r.rawThread.getId();
    if (!threads[tid]) threads[tid] = { thread: r.rawThread, tieneExito: false, tieneFallo: false };
    threads[tid].tieneExito = true;
  });
  
  // Registrar fallos
  fallidos.forEach(function(r) {
    var tid = r.rawThread.getId();
    if (!threads[tid]) threads[tid] = { thread: r.rawThread, tieneExito: false, tieneFallo: false };
    threads[tid].tieneFallo = true;
  });

  // Aplicar lógica
  for (var tid in threads) {
    var t = threads[tid];
    t.thread.removeLabel(etiquetaCola); // Remover cola primero
    
    if (t.tieneExito) {
      // R8: si al menos un mensaje tuvo éxito, el hilo va a OK
      t.thread.addLabel(etiquetaOk);
    } else if (t.tieneFallo) {
      // R8: solo si TODOS fallaron va a ERROR
      t.thread.addLabel(etiquetaError);
    }
  }
}
