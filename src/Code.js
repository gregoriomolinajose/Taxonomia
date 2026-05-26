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
  // [S48.4] Interceptación de Callback OAuth2
  if (e && e.parameter && e.parameter.code && e.parameter.state) {
    if (typeof Auth_HandleOAuthCallback === 'function') {
      return Auth_HandleOAuthCallback(e);
    }
  }

  var template = HtmlService.createTemplateFromFile('Index');

  // Backend variables injected into the template scope
  // (available as <?= APP_VERSION ?> in Index.html)
  template.APP_VERSION = (typeof CONFIG !== 'undefined')
    ? CONFIG.APP_VERSION
    : 'v1.0.39';

  // White-Label Config Load (S24.5) - Refactorizado para Seguridad (WSOD Prevention)
  var whiteLabel = null;
  try {
    var rawStr = PropertiesService.getScriptProperties().getProperty('WHITE_LABEL_CONFIG');
    if (rawStr) {
        var testObj = JSON.parse(rawStr);
        if (testObj && testObj.bodyFont) {
            whiteLabel = rawStr;
        }
    }
  } catch(e) {
    console.error("Corrupción de caché en WHITE_LABEL_CONFIG detectado. Reseteando a default seguro.");
    whiteLabel = null;
  }
  
  if (!whiteLabel) {
    // Default system font pairing with safe generic fallbacks
    whiteLabel = JSON.stringify({ 
      bodyFont: "Poppins, sans-serif", 
      displayFont: "Playfair Display, serif"
    });
  }
  template.WHITE_LABEL_CONFIG = whiteLabel;

  // Environment Config Load (S23.4) - SRP Separation
  var envConfigStr = null;
  try {
    envConfigStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
  } catch(e) {}
  
  if (!envConfigStr) {
    // [E6-S64] Fallback genérico — dominios reales se configuran via Ajustes Globales (Adapter_Config)
    envConfigStr = JSON.stringify({ AuthMode: "SSO", ALLOWED_DOMAINS: [] });
  }
  template.ENV_CONFIG = envConfigStr;

  // ABAC Resolver: Cálculo de Topología O(n) al vuelo para proveer Contexto Seguro en Frontend
  var email = "";
  try {
    if (typeof Session !== 'undefined') email = Session.getActiveUser().getEmail();
  } catch(e) {
    console.warn("API_Auth: No se pudo resolver la sesión activa.", e);
  }
  
  var abacContext = typeof Engine_ABAC !== 'undefined' 
      ? Engine_ABAC.resolveTopologyFor(email) 
      : { ownerOf: [], memberOf: [] };
      
  template.__ABAC_CONTEXT__ = JSON.stringify(abacContext).replace(/</g, '\\u003c');

  // [E6-S64] Branding genérico — configurar via Ajustes Globales en Schema Studio
  let brandingConfig = {
    appTitle: 'Gobierno de Modelo de Producto',
    faviconUrl: ''
  };
  try {
    var brandingStr = PropertiesService.getScriptProperties().getProperty('APP_BRANDING_CONFIG');
    if (brandingStr) {
      var parsedBranding = JSON.parse(brandingStr);
      if (parsedBranding.appTitle) brandingConfig.appTitle = parsedBranding.appTitle;
      if (parsedBranding.faviconUrl) brandingConfig.faviconUrl = parsedBranding.faviconUrl;
    }
  } catch(e) {
    console.error("Error leyendo APP_BRANDING_CONFIG. Usando defaults.", e);
  }

  // Workspace Sync Config Load (S48.3)
  template.WORKSPACE_SYNC_ENABLED = (typeof isWorkspaceSyncEnabled !== 'undefined') ? isWorkspaceSyncEnabled() : true;

  return template.evaluate()
    .setTitle(brandingConfig.appTitle)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, viewport-fit=cover')
    .setFaviconUrl(brandingConfig.faviconUrl);
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

/**
 * UTIL_ForcePermissions (Herramienta de Reparación OAuth)
 * --------------------------------------------------------
 * Las AppScripts en entornos Zero-Touch (clasp) a veces suprimen la bandera de re-autorización
 * cuando se alteran los scopes en appsscript.json. En caso de fallas (Ej: Error 404 o Error de Conexión),
 * el usuario debe **Ejecutar manualmente esta función desde el IDE de Apps Script**
 * para despertar la ventana modal de "Google hasn't verified this app" (Permisos de Drive).
 */
function UTIL_ForcePermissions() {
  try {
    const ss = SpreadsheetApp.getActive();
    if (DriveApp && typeof DriveApp.getFiles === 'function') {
      DriveApp.getFiles().hasNext(); // Force drive.readonly scope detection
    }
    if (typeof AdminDirectory !== 'undefined') {
      AdminDirectory.Users.list({domain: 'example.com', maxResults: 1}); // Force admin directory scope
    }
    Logger.log("✅ Permisos actualizados y verificados por el motor de Google.");
  } catch (e) {
    Logger.log("❌ Error o interrupción: " + e.message);
  }
}
