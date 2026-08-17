// =====================================================================
// MÓDULO WEBHOOK: ESCUCHA DE EVENTOS DESDE TELEGRAM
// Payment Consolidation — Entry Point
//
// GUARDRAILS ANTI-BUCLE:
// 1. Deduplicación por update_id (CacheService) — ignora reintentos de Telegram
// 2. Semáforo "rutina_pendiente" — impide crear triggers duplicados
// =====================================================================

/**
 * doPost — Webhook handler para Telegram.
 *
 * @param {Object} e - Evento POST de Telegram.
 * @returns {TextOutput} Respuesta "OK" inmediata.
 */
function doPost(e) {
  // Ya no usamos Webhooks. Esta función queda vacía para evitar errores de Google si alguien llama a la URL.
  return ContentService.createTextOutput("OK");
}

/**
 * procesarMensajesTelegramPolling — (NUEVO)
 * Obtiene los mensajes de Telegram de forma activa, evitando los fallos de red de Google Apps Script.
 */
function procesarMensajesTelegramPolling() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TELEGRAM_TOKEN");
  var miChatIdStr = props.getProperty("TELEGRAM_CHAT_ID");
  if (!token || !miChatIdStr) return;

  // Permitir múltiples IDs separados por coma
  var chatsPermitidos = miChatIdStr.split(",").map(function(id) { return id.trim(); });
  var cache = CacheService.getScriptCache();
  
  // Obtener el último update_id procesado
  var offset = props.getProperty("TG_OFFSET") || "0";
  
  var url = "https://api.telegram.org/bot" + token + "/getUpdates?offset=" + offset + "&timeout=0";
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  
  if (res.getResponseCode() !== 200) {
    Logger.log("Error en getUpdates: " + res.getContentText());
    return;
  }
  
  var data = JSON.parse(res.getContentText());
  if (!data.ok || data.result.length === 0) return;
  
  var maxUpdateId = parseInt(offset);
  var tipoComando = null;
  var chatIdDestino = null;
  var queryBusqueda = null;
  
  for (var i = 0; i < data.result.length; i++) {
    var update = data.result[i];
    if (update.update_id >= maxUpdateId) {
      maxUpdateId = update.update_id + 1; // Para el próximo offset
    }
    
    if (update.message && update.message.text) {
      var idRemitente = update.message.chat.id.toString();
      var textoMensaje = update.message.text.trim().toLowerCase();
      
      // Verificamos si el remitente está en la lista de permitidos
      if (chatsPermitidos.indexOf(idRemitente) !== -1) {
        
        // 1. Verificamos si el usuario estaba en estado de "Búsqueda"
        var estadoActual = cache.get("estado_bot_" + idRemitente);
        
        if (estadoActual === "ESPERANDO_NOMBRE") {
          tipoComando = "ejecutar_busqueda";
          chatIdDestino = idRemitente;
          queryBusqueda = update.message.text.trim(); // Guardamos el texto original (con mayúsculas/minúsculas)
          cache.remove("estado_bot_" + idRemitente);
        }
        // 2. Si no estaba buscando, revisamos si es un comando de botón
        else if (textoMensaje.indexOf("actualizar") !== -1) {
          tipoComando = "actualizar";
          chatIdDestino = idRemitente;
        } else if (textoMensaje.indexOf("ayer") !== -1) {
          tipoComando = "ayer";
          chatIdDestino = idRemitente;
        } else if (textoMensaje.indexOf("hoy") !== -1) {
          tipoComando = "hoy";
          chatIdDestino = idRemitente;
        } else if (textoMensaje.indexOf("últimos 10") !== -1 || textoMensaje.indexOf("ultimos 10") !== -1) {
          tipoComando = "ultimos10";
          chatIdDestino = idRemitente;
        } else if (textoMensaje.indexOf("buscar persona") !== -1) {
          tipoComando = "iniciar_busqueda";
          chatIdDestino = idRemitente;
        }
      }
    }
  }
  
  // Guardamos el nuevo offset para no volver a leer estos mensajes
  props.setProperty("TG_OFFSET", maxUpdateId.toString());
  
  // Si encontramos el comando, ejecutamos la acción correspondiente
  if (tipoComando && chatIdDestino) {
    var rutinaPendiente = cache.get("rutina_pendiente");
    if (!rutinaPendiente) {
      
      if (tipoComando === "iniciar_busqueda") {
        cache.put("estado_bot_" + chatIdDestino, "ESPERANDO_NOMBRE", 120); // 2 minutos para responder
        enviarMensajeTelegram(token, chatIdDestino, "🔍 *Búsqueda de Persona*\n\nPor favor, escribe el nombre (o parte del nombre) de la persona que deseas buscar:");
      } else if (tipoComando === "ejecutar_busqueda") {
        enviarUltimosMovimientos(token, chatIdDestino, queryBusqueda);
      } else if (tipoComando === "ultimos10") {
        enviarUltimosMovimientos(token, chatIdDestino, null);
      } else {
        // Bloqueo solo para los comandos pesados
        cache.put("rutina_pendiente", "1", 120); 
        
        if (tipoComando === "actualizar") {
          enviarMensajeTelegram(token, chatIdDestino, "⏳ Procesando comando... Revisando transacciones...");
          try {
            var resultado = ejecutarPipeline();
            enviarResumenFinal(token, chatIdDestino, resultado);
          } catch (err) {
            Logger.log("Error crítico en pipeline: " + err.toString());
            enviarMensajeTelegram(token, chatIdDestino, "❌ Error procesando: " + err.message);
          } finally {
            cache.remove("rutina_pendiente");
          }
        } else if (tipoComando === "ayer") {
          generarReporteEspecifico(-1, chatIdDestino);
          cache.remove("rutina_pendiente");
        } else if (tipoComando === "hoy") {
          generarReporteEspecifico(0, chatIdDestino);
          cache.remove("rutina_pendiente");
        }
      }
      
    } else {
      enviarMensajeTelegram(token, chatIdDestino, "⚠️ Existe una ejecución en curso. Por favor espera.");
    }
  }
}
