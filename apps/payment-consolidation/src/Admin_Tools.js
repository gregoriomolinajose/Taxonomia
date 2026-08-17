// =====================================================================
// ADMIN TOOLS — Utilidades administrativas y de mantenimiento
// =====================================================================

/**
 * reprocesarErrores — Devuelve los hilos fallidos a la cola para reintento
 * Limita el procesamiento a max 50 hilos por ejecución para evitar timeouts.
 * Usa CacheService para evitar bucles infinitos (máximo 3 reintentos).
 */
function reprocesarErrores() {
  var config = cargarConfiguracion();
  var nombreCola = config.LABEL_COLA;
  var nombreError = config.LABEL_ERROR;
  var maxReintentos = config.MAX_RETRY;

  var etiquetaCola = GmailApp.getUserLabelByName(nombreCola);
  var etiquetaError = GmailApp.getUserLabelByName(nombreError);

  if (!etiquetaCola || !etiquetaError) {
    Logger.log("Faltan etiquetas para el reproceso.");
    return;
  }

  // Tomamos solo 50 para no exceder cuota ni tiempo
  var hilos = etiquetaError.getThreads(0, 50); 
  if (hilos.length === 0) return;

  var cache = CacheService.getScriptCache();
  var reencolados = 0;
  var descartados = 0;

  for (var i = 0; i < hilos.length; i++) {
    var hilo = hilos[i];
    var threadId = hilo.getId();
    
    // Control de reintentos
    var cacheKey = "retry_" + threadId;
    var intentos = parseInt(cache.get(cacheKey) || "0");
    
    if (intentos < maxReintentos) {
      // Incrementar intentos y reencolar
      cache.put(cacheKey, (intentos + 1).toString(), 21600); // 6 horas TTL
      hilo.removeLabel(etiquetaError);
      hilo.addLabel(etiquetaCola);
      
      // Marcar correos como no leídos para que el ingest los vuelva a tomar
      var mensajes = hilo.getMessages();
      for (var j = 0; j < mensajes.length; j++) {
        mensajes[j].markUnread();
      }
      reencolados++;
    } else {
      // Superó el máximo de reintentos
      descartados++;
    }
  }

  // Notificar resumen de la operación
  var token = props.getProperty("TELEGRAM_TOKEN");
  var chatId = props.getProperty("TELEGRAM_CHAT_ID");
  var texto = "♻️ *Reproceso de Errores finalizado*\n";
  texto += "Reencolados a la cola: " + reencolados + "\n";
  texto += "Descartados (máx reintentos): " + descartados;
  
  if (typeof enviarMensajeTelegram === "function") {
    enviarMensajeTelegram(token, chatId, texto);
  }
}

/**
 * limpiarTriggersZombie — Elimina TODOS los triggers del proyecto
 * Útil si el sistema entra en un bucle o se acumulan ejecuciones fantasma.
 */
function limpiarTriggersZombie() {
  var triggers = ScriptApp.getProjectTriggers();
  var count = triggers.length;
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  
  // Limpiar también el semáforo para destrabar el sistema
  CacheService.getScriptCache().remove("rutina_pendiente");
  
  Logger.log("Purgados " + count + " triggers zombie. Semáforo liberado.");
}

/**
 * activarPollingTelegram — Elimina webhooks antiguos y activa la consulta activa cada 1 minuto.
 */
function activarPollingTelegram() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TELEGRAM_TOKEN");
  if (!token) {
    Logger.log("Faltan credenciales (TELEGRAM_TOKEN).");
    return;
  }
  
  // 1. Eliminar Webhook (obligatorio para usar getUpdates)
  var apiUrl = "https://api.telegram.org/bot" + token + "/deleteWebhook?drop_pending_updates=true";
  var respuesta = UrlFetchApp.fetch(apiUrl, {muteHttpExceptions: true});
  Logger.log("Webhook eliminado y cola limpiada: " + respuesta.getContentText());
  
  // 2. Limpiar triggers viejos
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "procesarMensajesTelegramPolling") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // 3. Crear nuevo trigger de Polling cada 1 minuto
  ScriptApp.newTrigger("procesarMensajesTelegramPolling")
           .timeBased()
           .everyMinutes(1)
           .create();
           
  Logger.log("Polling Activado: Revisará mensajes cada 1 minuto sin depender de Google Webhooks.");
}

/**
 * detenerPollingTelegram — (Botón de pánico) Detiene el procesamiento
 */
function detenerPollingTelegram() {
  var triggers = ScriptApp.getProjectTriggers();
  var borrados = 0;
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "procesarMensajesTelegramPolling") {
      ScriptApp.deleteTrigger(triggers[i]);
      borrados++;
    }
  }
  CacheService.getScriptCache().remove("rutina_pendiente");
  Logger.log("Polling detenido (" + borrados + " triggers borrados). Semáforo liberado.");
}

// =====================================================================
// AUTOMATIZACIÓN DE SEGUNDO PLANO (Fase 2)
// =====================================================================

/**
 * activarProcesamientoAutomatico — Programa un trigger periódico
 */
function activarProcesamientoAutomatico() {
  desactivarProcesamientoAutomatico(); // Limpiar previos
  
  var config = cargarConfiguracion();
  var horas = config.AUTO_INTERVAL_HOURS;
  
  if (horas < 1) horas = 1;

  ScriptApp.newTrigger("ejecutarPipelineAutomatico")
           .timeBased()
           .everyHours(horas)
           .create();
           
  Logger.log("Procesamiento automático activado cada " + horas + " horas.");
}

/**
 * desactivarProcesamientoAutomatico — Elimina triggers periódicos
 */
function desactivarProcesamientoAutomatico() {
  limpiarTriggersDeHandlerFunction("ejecutarPipelineAutomatico");
  Logger.log("Procesamiento automático desactivado.");
}

/**
 * ejecutarPipelineAutomatico — Trigger que corre sin webhook
 */
function ejecutarPipelineAutomatico() {
  var lock = LockService.getScriptLock();
  var adquirido = lock.tryLock(5000);
  
  if (!adquirido) {
    Logger.log("Ejecución automática abortada: candado en uso.");
    return;
  }

  try {
    var resultado = ejecutarPipeline();
    
    // Solo notificar si hubo actividad (para no ser ruidoso)
    if (resultado.procesados > 0 || resultado.errores > 0) {
      var config = cargarConfiguracion();
      var token = config.TELEGRAM_TOKEN;
      var chatId = config.TELEGRAM_CHAT_ID;
      
      if (token && chatId) {
        enviarResumenFinal(token, chatId, resultado);
      }
    }
  } catch (error) {
    Logger.log("Error en pipeline automático: " + error.toString());
  } finally {
    lock.releaseLock();
  }
}

// =====================================================================
// REPORTES Y MONITOREO (Fase 4)
// =====================================================================

/**
 * activarReportesYAlertas — Configura los triggers para el reporte de las 8 AM y la alerta de las 6 PM
 */
function activarReportesYAlertas() {
  desactivarReportesYAlertas(); // Limpiar previos
  
  // Trigger para las 8:00 AM (Reporte Diario)
  ScriptApp.newTrigger("generarYEnviarReporteDiario")
           .timeBased()
           .atHour(8)
           .nearMinute(0) // Puede variar +/- 15 mins según Google
           .everyDays(1)
           .create();
           
  // Trigger para las 6:00 PM (18:00) (Alerta de Errores Vespertina)
  ScriptApp.newTrigger("revisarErroresFrecuente")
           .timeBased()
           .atHour(18)
           .nearMinute(0)
           .everyDays(1)
           .create();
           
  Logger.log("Reporte Diario configurado a las 8:00 AM. Alerta de Errores a las 6:00 PM.");
}

/**
 * desactivarReportesYAlertas — Elimina los triggers de reportes y monitoreo
 */
function desactivarReportesYAlertas() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    var handler = triggers[i].getHandlerFunction();
    if (handler === "generarYEnviarReporteDiario" || handler === "revisarErroresFrecuente") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  Logger.log("Reportes y alertas desactivados.");
}

