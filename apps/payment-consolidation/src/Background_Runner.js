// =====================================================================
// BACKGROUND RUNNER — Punto de entrada asíncrono
// =====================================================================

/**
 * rutinaDeFondoZelle — Ejecutada por el trigger temporal creado por doPost.
 * 
 * Responsabilidades:
 * 1. Limpieza de triggers zombie.
 * 2. Control de concurrencia con LockService (R2).
 * 3. Ejecución segura con try/finally para liberar recursos (R6).
 */
function rutinaDeFondoZelle() {
  // 1. Limpiar TODOS los triggers de esta función para prevenir zombies
  limpiarTriggersDeHandlerFunction("rutinaDeFondoZelle");

  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TELEGRAM_TOKEN");
  var chatId = props.getProperty("TELEGRAM_CHAT_ID");

  // 2. Control de concurrencia (LockService) - Timeout 5s
  var lock = LockService.getScriptLock();
  var adquirido = lock.tryLock(5000);
  
  if (!adquirido) {
    if (token && chatId) {
      enviarMensajeTelegram(token, chatId, "⚠️ Existe una ejecución en curso. Por favor espera a que termine.");
    }
    // Liberar semáforo por si acaso quedó pegado y originó este choque
    CacheService.getScriptCache().remove("rutina_pendiente");
    return;
  }

  // 3. Ejecución Segura
  try {
    // Llamar al orquestador del pipeline
    var resultado = ejecutarPipeline();
    
    // Enviar resumen si hay token y chat configurados
    if (token && chatId) {
      enviarResumenFinal(token, chatId, resultado);
    }
    
  } catch (error) {
    Logger.log("Error crítico en rutinaDeFondoZelle: " + error.toString());
    if (token && chatId) {
      enviarMensajeTelegram(token, chatId, "❌ *Error inesperado en el sistema:* " + error.message);
    }
  } finally {
    // 4. Liberación GARANTIZADA de recursos (R6)
    lock.releaseLock();
    CacheService.getScriptCache().remove("rutina_pendiente");
  }
}

// Funciones procesarColaTelegram eliminadas por migración a Long Polling.
