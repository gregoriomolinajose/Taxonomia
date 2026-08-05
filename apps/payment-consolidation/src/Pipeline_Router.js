// =====================================================================
// PIPELINE: ROUTER — Enrutamiento y validación
// =====================================================================

/**
 * procesarMensajes — Pasa los mensajes por el router y los valida
 * 
 * @param {Array<Object>} mensajes Array de mensajes de Ingest
 * @param {Object} registry Diccionario de parsers
 * @param {Set<string>} idsExistentes Set de IDs ya procesados
 * @param {Date} inicio Objeto Date de inicio para el timeout
 * @returns {Object} {exitosos: [], fallidos: [], continuacion: boolean}
 */
function procesarMensajes(mensajes, registry, idsExistentes, inicio) {
  var exitosos = [];
  var fallidos = [];
  var continuacion = false;

  for (var i = 0; i < mensajes.length; i++) {
    // R7: Verificar tiempo transcurrido (timeout a los 4 minutos / 240 segundos)
    if (inicio) {
      var elapsed = (new Date() - inicio) / 1000;
      if (elapsed > 240) {
        continuacion = true;
        break;
      }
    }
    var msg = mensajes[i];

    // Idempotencia: si ya existe, lo tratamos como exitoso pero no lo guardamos de nuevo
    // (Pipeline_Orchestrator manejará el marcado como leído)
    if (idsExistentes.has(msg.id)) {
      continue;
    }

    var parsed = routeMessage(msg, registry); // Llama a la función global de Parser_Registry

    if (parsed) {
      var validacion = validarResultado(parsed.datos);
      if (validacion.esValido) {
        exitosos.push({
          status: "ok",
          id: msg.id,
          parser: parsed.parser,
          monto: parsed.datos.monto,
          tipo: registry[parsed.parser].tipo, // "entrada" o "salida"
          categoria: parsed.datos.categoria,
          contraparte: parsed.datos.contraparte,
          date: msg.date,
          rawMessage: msg.rawMessage,
          rawThread: msg.rawThread
        });
        msg.rawMessage.markRead();
        idsExistentes.add(msg.id);
      } else {
        // Falló validación
        var bodySnippet = msg.body ? msg.body.substring(0, 200).replace(/\n/g, ' ') : "(sin body)";
        fallidos.push({
          status: "error",
          id: msg.id,
          subject: msg.subject,
          snippet: bodySnippet,
          razon: "Validación fallida: " + validacion.razon,
          rawMessage: msg.rawMessage,
          rawThread: msg.rawThread
        });
      }
    } else {
      // Ningún parser coincidió
      var bodySnippet = msg.body ? msg.body.substring(0, 200).replace(/\n/g, ' ') : "(sin body)";
      fallidos.push({
        status: "error",
        id: msg.id,
        subject: msg.subject,
        snippet: bodySnippet,
        razon: "Ningún parser coincidió",
        rawMessage: msg.rawMessage,
        rawThread: msg.rawThread
      });
    }
  }

  return { exitosos: exitosos, fallidos: fallidos, continuacion: continuacion };
}

/**
 * validarResultado — Aplica reglas de negocio a los datos extraídos
 * @param {Object} datos 
 * @returns {Object} {esValido: boolean, razon: string}
 */
function validarResultado(datos) {
  if (!datos) return { esValido: false, razon: "Datos nulos" };
  
  if (typeof datos.monto !== 'number' || isNaN(datos.monto) || datos.monto <= 0) {
    return { esValido: false, razon: "Monto inválido o cero" };
  }
  
  if (!datos.contraparte || datos.contraparte.trim() === "") {
    return { esValido: false, razon: "Contraparte vacía" };
  }

  return { esValido: true, razon: "" };
}
