// =====================================================================
// PARSER REGISTRY — Motor de plugins para extracción de datos
// =====================================================================

/**
 * getParserRegistry — Inicializa y retorna todos los parsers registrados
 * @returns {Object} Diccionario de parsers
 */
function getParserRegistry() {
  var registry = {};
  
  // Registrar plugins (Zelle)
  if (typeof registrarParsersZelle === "function") {
    registrarParsersZelle(registry);
  }
  
  // Futuro: registrarParsersVenmo(registry), etc.

  return registry;
}

/**
 * routeMessage — Prueba todos los parsers contra un mensaje (Pipeline Router)
 * Intentará texto plano primero, luego HTML, luego Asunto.
 * 
 * @param {Object} mensaje Objeto estandarizado {id, body, html, subject, ...}
 * @param {Object} registry Diccionario de parsers
 * @returns {Object|null} {parser: string, datos: Object} o null si ninguno coincide
 */
function routeMessage(mensaje, registry) {
  for (var key in registry) {
    var parser = registry[key];
    
    for (var i = 0; i < parser.fuentes.length; i++) {
      var fuente = parser.fuentes[i];
      var textoAEvaluar = "";

      if (fuente === "body") {
        textoAEvaluar = mensaje.body;
      } else if (fuente === "html") {
        textoAEvaluar = stripHTML(mensaje.html);
      } else if (fuente === "subject") {
        textoAEvaluar = mensaje.subject;
      }

      if (!textoAEvaluar) continue;

      var match = textoAEvaluar.match(parser.patron);
      if (match) {
        var datos = parser.extraer(match);
        // Retornar al primer match exitoso
        return {
          parser: key,
          datos: datos
        };
      }
    }
  }
  
  return null; // Ningún parser pudo identificar el correo
}
