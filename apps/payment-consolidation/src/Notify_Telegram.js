// =====================================================================
// NOTIFY TELEGRAM — Adaptador para envío de mensajes
// =====================================================================

/**
 * enviarMensajeTelegram — Envía un mensaje a Telegram
 * @param {string} token 
 * @param {string} chatId 
 * @param {string} texto 
 */
function enviarMensajeTelegram(token, chatId, texto) {
  if (!token || !chatId || !texto) return;
  var url = "https://api.telegram.org/bot" + token + "/sendMessage";
  
  // Agregamos un teclado personalizado (ReplyKeyboardMarkup) para que siempre esté el botón visible
  var payload = {
    chat_id: chatId,
    text: texto,
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [
        [{ text: "🔄 Actualizar Saldos" }],
        [{ text: "📅 Resumen Ayer" }, { text: "☀️ Resumen Hoy" }],
        [{ text: "📜 Últimos 10" }, { text: "🔍 Buscar Persona" }]
      ],
      resize_keyboard: true,
      is_persistent: false
    }
  };
  
  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Evita que la función explote si Telegram falla
  };
  try {
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log("Error al enviar a Telegram: " + e.toString());
  }
}

/**
 * enviarResumenFinal — Construye y envía el resumen consolidado al final de la ejecución
 * @param {string} token 
 * @param {string} chatId 
 * @param {Object} resultado Objeto con procesados, errores, totalEntradas, totalSalidas, continuacion
 */
function enviarResumenFinal(token, chatId, resultado) {
  var texto = "✅ *Rutina finalizada.*\n";
  texto += "📊 Procesados: " + resultado.procesados + " | Errores: " + resultado.errores + "\n";
  texto += "💰 Entradas: " + formatCurrency(resultado.totalEntradas) + " | Salidas: " + formatCurrency(resultado.totalSalidas) + "\n";
  
  var saldoAMostrar = (resultado.saldoJuliana === "" || resultado.saldoJuliana === undefined) ? "N/A" : resultado.saldoJuliana;
  texto += "🏦 Saldo Juliana: " + saldoAMostrar;

  var total = resultado.procesados + resultado.errores;
  if (total > 0 && (resultado.errores / total) > 0.5) {
    texto = "🚨 *Rutina finalizada con tasa de error alta.*\n";
    texto += "📊 Procesados: " + resultado.procesados + " | Errores: " + resultado.errores + "\n";
    texto += "💰 Entradas: " + formatCurrency(resultado.totalEntradas) + " | Salidas: " + formatCurrency(resultado.totalSalidas) + "\n";
    texto += "⚠️ _Es posible que el formato de los correos haya cambiado. Revisa la etiqueta de Errores._";
  }

  if (resultado.continuacion) {
    texto += "\n\n⏳ _Procesamiento parcial por tiempo límite. Continuará automáticamente en breve._";
  }

  enviarMensajeTelegram(token, chatId, texto);
}

/**
 * enviarMensajeTelegramBroadcast — Envía un mensaje a TODOS los chats configurados
 * @param {string} texto 
 */
function enviarMensajeTelegramBroadcast(texto) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TELEGRAM_TOKEN");
  var miChatIdStr = props.getProperty("TELEGRAM_CHAT_ID");
  if (!token || !miChatIdStr) return;
  
  var chatsPermitidos = miChatIdStr.split(",").map(function(id) { return id.trim(); });
  for (var i = 0; i < chatsPermitidos.length; i++) {
    enviarMensajeTelegram(token, chatsPermitidos[i], texto);
  }
}
