// =====================================================================
// REPORTING ENGINE — Generación de Reportes y Monitoreo Proactivo
// =====================================================================

/**
 * generarYEnviarReporteDiario — Wrapper para el trigger de las 8:00 AM (Ayer, Broadcast)
 */
function generarYEnviarReporteDiario() {
  generarReporteEspecifico(-1, null);
}

/**
 * generarReporteEspecifico — Calcula el reporte para una fecha relativa
 * @param {number} offsetDias -1 = ayer, 0 = hoy
 * @param {string} chatIdDestino Si es null, hace broadcast. Si tiene ID, responde a ese chat.
 */
function generarReporteEspecifico(offsetDias, chatIdDestino) {
  var config = cargarConfiguracion();
  var spreadsheetId = config.SPREADSHEET_ID;
  var nombreHoja = config.SHEET_NAME;
  
  if (!spreadsheetId) return;

  var libro = SpreadsheetApp.openById(spreadsheetId);
  var hoja = libro.getSheetByName(nombreHoja);
  if (!hoja) return;

  // 1. Obtener la fecha calculada
  var fechaRef = new Date();
  fechaRef.setDate(fechaRef.getDate() + offsetDias);
  var fechaRefStr = Utilities.formatDate(fechaRef, Session.getScriptTimeZone(), "yyyy-MM-dd");
  var tituloDia = (offsetDias === 0) ? "Hoy" : (offsetDias === -1) ? "Ayer" : fechaRefStr;

  // 2. Leer la hoja de cálculo
  var ultimaFila = hoja.getLastRow();
  var entradasAyer = 0;
  var salidasAyer = 0;
  var transaccionesAyer = 0;
  var saldoJuliana = "N/A";

  if (ultimaFila >= 2) {
    var datos = hoja.getRange(2, 1, ultimaFila - 1, 6).getValues();
    
    for (var i = 0; i < datos.length; i++) {
      var filaFecha = datos[i][0];
      if (filaFecha instanceof Date) {
        filaFecha = Utilities.formatDate(filaFecha, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      
      if (filaFecha === fechaRefStr) {
        var propietario = datos[i][3].toString().toLowerCase();
        if (propietario.indexOf("juliana") !== -1) {
          transaccionesAyer++;
          var vEntrada = parseFloat(datos[i][4]) || 0;
          var vSalida = parseFloat(datos[i][5]) || 0;
          entradasAyer += vEntrada;
          salidasAyer += vSalida;
        }
      }
    }
    
    // Obtener saldo dinámico
    SpreadsheetApp.flush(); 
    var headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    for (var j = 0; j < headers.length; j++) {
      if (headers[j].toString().toLowerCase().indexOf("juliana") !== -1) {
        saldoJuliana = hoja.getRange(2, j + 1).getDisplayValue();
        break;
      }
    }
  }

  // 3. Revisar si hay errores (DLQ)
  var nombreError = config.LABEL_ERROR;
  var etiquetaError = GmailApp.getUserLabelByName(nombreError);
  var correosError = 0;
  if (etiquetaError) {
    correosError = etiquetaError.getThreads().length;
  }

  // 4. Construir Mensaje
  var texto = "📅 *Reporte de " + tituloDia + ": " + fechaRefStr + "*\n\n";
  texto += "📊 Transacciones registradas (Juliana): " + transaccionesAyer + "\n";
  texto += "🟢 Entradas: " + formatCurrency(entradasAyer) + "\n";
  texto += "🔴 Salidas: " + formatCurrency(salidasAyer) + "\n\n";
  texto += "🏦 *Saldo Actual Juliana:* " + saldoJuliana + "\n";

  if (correosError > 0) {
    texto += "\n🚨 *ATENCIÓN:* Tienes *" + correosError + "* correos atascados en Errores.";
  }

  // 5. Enviar respuesta
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty("TELEGRAM_TOKEN");
  
  if (chatIdDestino) {
    enviarMensajeTelegram(token, chatIdDestino, texto);
  } else {
    enviarMensajeTelegramBroadcast(texto);
  }
}

/**
 * revisarErroresFrecuente — Se ejecuta a las 6:00 PM para avisar si hay bloqueos
 */
function revisarErroresFrecuente() {
  var config = cargarConfiguracion();
  var nombreError = config.LABEL_ERROR;
  var etiquetaError = GmailApp.getUserLabelByName(nombreError);
  
  if (etiquetaError) {
    var correosError = etiquetaError.getThreads().length;
    if (correosError > 0) {
      var texto = "⚠️ *Alerta de Monitoreo (6:00 PM)*\n";
      texto += "Se han detectado *" + correosError + "* correos en la etiqueta de Errores que no pudieron ser procesados automáticamente. Por favor revisa tu Gmail.";
      if (typeof enviarMensajeTelegramBroadcast === "function") {
        enviarMensajeTelegramBroadcast(texto);
      }
    }
  }
}

/**
 * enviarUltimosMovimientos — Envía los 10 movimientos más recientes.
 * @param {string} token
 * @param {string} chatIdDestino
 * @param {string} query (Opcional) Texto para filtrar por descripción.
 */
function enviarUltimosMovimientos(token, chatIdDestino, query) {
  var config = cargarConfiguracion();
  var spreadsheetId = config.SPREADSHEET_ID;
  var nombreHoja = config.SHEET_NAME;
  
  if (!spreadsheetId) return;

  var libro = SpreadsheetApp.openById(spreadsheetId);
  var hoja = libro.getSheetByName(nombreHoja);
  if (!hoja) return;

  var ultimaFila = hoja.getLastRow();
  if (ultimaFila < 2) {
    enviarMensajeTelegram(token, chatIdDestino, "No hay transacciones registradas.");
    return;
  }

  // Como los nuevos registros se insertan arriba (fila 2), leemos de arriba hacia abajo.
  // Limitamos a 500 filas para no saturar memoria, ya que los recientes están al inicio.
  var numFilas = Math.min(500, ultimaFila - 1);
  var datos = hoja.getRange(2, 1, numFilas, 6).getValues();
  var resultados = [];
  
  var filtro = query ? query.toLowerCase() : null;

  // Recorremos de arriba hacia abajo (índice 0 es la fila 2, la más reciente)
  for (var i = 0; i < datos.length; i++) {
    var propietario = datos[i][3].toString().toLowerCase(); // Columna D
    
    if (propietario.indexOf("juliana") !== -1) {
      var contraparte = datos[i][2].toString().toLowerCase(); // Columna C (Remitente/Destinatario)
      
      if (!filtro || contraparte.indexOf(filtro) !== -1) {
        var filaFecha = datos[i][0];
        if (filaFecha instanceof Date) {
          filaFecha = Utilities.formatDate(filaFecha, Session.getScriptTimeZone(), "dd/MM");
        }
        var vEntrada = parseFloat(datos[i][4]) || 0;
        var vSalida = parseFloat(datos[i][5]) || 0;
        var nombreOriginal = datos[i][2].toString();
        
        var montoStr = "";
        if (vEntrada > 0) montoStr = "🟢 " + formatCurrency(vEntrada);
        else if (vSalida > 0) montoStr = "🔴 " + formatCurrency(vSalida);
        else montoStr = "⚪ $0.00";

        // Formato compacto para móviles
        var nombreCorto = nombreOriginal.length > 30 ? nombreOriginal.substring(0, 30) + "..." : nombreOriginal;
        
        resultados.push("`" + filaFecha + "` | " + montoStr + " | *" + nombreCorto + "*");
        
        if (resultados.length >= 10) break; // Límite de 10
      }
    }
  }

  var titulo = query ? "🔍 *Últimos movimientos de Juliana para:* '" + query + "'\n\n" : "📜 *Últimos 10 Movimientos (Juliana):*\n\n";
  var texto = titulo;
  
  if (resultados.length === 0) {
    texto += "_No se encontraron resultados._";
  } else {
    texto += resultados.join("\n");
  }

  enviarMensajeTelegram(token, chatIdDestino, texto);
}
