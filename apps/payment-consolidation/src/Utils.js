// =====================================================================
// UTILS — Funciones auxiliares y formateadores
// =====================================================================

/**
 * stripHTML — Elimina etiquetas HTML y decodifica entidades básicas
 * @param {string} html 
 * @returns {string} Texto limpio
 */
function stripHTML(html) {
  if (!html) return "";
  var text = html
    .replace(/<br\s*\/?>/gi, '\n')     // Convertir <br> a saltos de línea
    .replace(/<[^>]*>/g, ' ')          // Eliminar el resto de etiquetas HTML
    .replace(/&nbsp;/g, ' ')           // Entidades
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')              // Colapsar espacios múltiples
    .trim();
  return text;
}

/**
 * formatCurrency — Formatea número a moneda USD
 * @param {number} monto 
 * @returns {string} 
 */
function formatCurrency(monto) {
  if (isNaN(monto) || monto === null) return "$0.00";
  return "$" + monto.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

/**
 * limpiarTriggersDeHandlerFunction — Elimina triggers de una función específica
 * @param {string} nombreFuncion 
 */
function limpiarTriggersDeHandlerFunction(nombreFuncion) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === nombreFuncion) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}
