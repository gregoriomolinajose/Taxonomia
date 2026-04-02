/**
 * EPT-OMR Gateway API
 * Google Apps Script Web App Entry Point
 */

/**
 * Renders the main SPA via HtmlService Template Engine.
 * CRITICAL: createTemplateFromFile + .evaluate() is REQUIRED
 * for scriptlets <?!= include('...') ?> to be processed.
 * Do NOT use createHtmlOutputFromFile here — it bypasses the engine.
 */
function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');

  // Backend variables injected into the template scope
  // (available as <?= APP_VERSION ?> in Index.html)
  template.APP_VERSION = (typeof CONFIG !== 'undefined')
    ? CONFIG.APP_VERSION
    : 'v1.0.39';

  // ABAC Resolver: Cálculo de Topología O(n) al vuelo para proveer Contexto Seguro en Frontend
  var email = "";
  try {
    if (typeof Session !== 'undefined') email = Session.getActiveUser().getEmail();
  } catch(e) {}
  
  var abacContext = typeof Engine_ABAC !== 'undefined' 
      ? Engine_ABAC.resolveTopologyFor(email) 
      : { ownerOf: [], memberOf: [] };
      
  template.__ABAC_CONTEXT__ = JSON.stringify(abacContext);

  return template.evaluate()
    .setTitle('Gobierno de Modelo de Producto — EPT OMR')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
}

/**
 * Include helper — OBLIGATORIO para la arquitectura modular (Regla UI §14).
 * Resuelve los scriptlets <?!= include('NombreArchivo') ?> en Index.html.
 * Sin esta función, GAS no sabe cómo inyectar CSS_DesignSystem, CSS_App y JS_Core.
 *
 * @param {string} filename - Nombre del archivo HTML en src/ (sin extensión .html)
 * @returns {string} El contenido HTML crudo del archivo
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
