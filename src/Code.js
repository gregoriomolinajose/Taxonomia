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

  // [E6-S65] First-Run Detection — Backend-First.
  // Si SPREADSHEET_ID_DB no está configurado en ninguna fuente, retorna el Wizard.
  // Fuentes verificadas en orden de prioridad:
  //   1. Adapter_Config (PropertiesService, clave APP_CONFIG__spreadsheet_id)
  //   2. ENV_CONFIG en PropertiesService (SPREADSHEET_ID_DB)
  //   3. CONFIG.SPREADSHEET_ID_DB (build-time, entorno actual)
  var _spreadsheetConfigured = false;
  try {
    var _configSheetId = PropertiesService.getScriptProperties().getProperty('APP_CONFIG__spreadsheet_id');
    if (_configSheetId && _configSheetId.trim().length > 0) {
      _spreadsheetConfigured = true;
    } else {
      var _envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
      if (_envStr) {
        var _envObj = JSON.parse(_envStr);
        if (_envObj.SPREADSHEET_ID_DB && _envObj.SPREADSHEET_ID_DB.trim().length > 0) {
          _spreadsheetConfigured = true;
        }
      }
    }
    if (!_spreadsheetConfigured && typeof CONFIG !== 'undefined' && CONFIG.SPREADSHEET_ID_DB && CONFIG.SPREADSHEET_ID_DB.trim().length > 0) {
      _spreadsheetConfigured = true;
    }
  } catch(_frErr) {
    console.warn('[S65] Error en detección first-run:', _frErr);
  }

  if (!_spreadsheetConfigured) {
    console.log('[S65] SPREADSHEET_ID_DB no configurado — sirviendo FirstRun.html');
    return HtmlService.createHtmlOutputFromFile('FirstRun')
      .setTitle('Configuración Inicial · Taxonomía')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, viewport-fit=cover');
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
  var envObj = { AuthMode: "SSO", ALLOWED_DOMAINS: [], WORKSPACE_ENABLED: false };
  try {
    var props = PropertiesService.getScriptProperties();
    var legacyEnvStr = props.getProperty('ENV_CONFIG');
    if (legacyEnvStr) {
      var legacyEnv = JSON.parse(legacyEnvStr);
      if (legacyEnv.AuthMode) envObj.AuthMode = legacyEnv.AuthMode;
      if (legacyEnv.ALLOWED_DOMAINS) envObj.ALLOWED_DOMAINS = legacyEnv.ALLOWED_DOMAINS;
      if (legacyEnv.WORKSPACE_ENABLED !== undefined) envObj.WORKSPACE_ENABLED = legacyEnv.WORKSPACE_ENABLED;
    }
    
    // Sobrescribir con nuevo esquema E6 de APP_WORKSPACE_CONFIG
    var wsConfigStr = props.getProperty('APP_WORKSPACE_CONFIG');
    if (wsConfigStr) {
      var wsConfig = JSON.parse(wsConfigStr);
      if (wsConfig.domains && Array.isArray(wsConfig.domains)) {
        envObj.ALLOWED_DOMAINS = wsConfig.domains;
      }
      if (wsConfig.workspace !== undefined) {
        envObj.WORKSPACE_ENABLED = wsConfig.workspace;
      }
      if (wsConfig.authMode) {
        envObj.AuthMode = wsConfig.authMode;
      }
    }
    
    // Fallback a variable antigua si wsConfig no proveyó dominios
    if (!envObj.ALLOWED_DOMAINS || envObj.ALLOWED_DOMAINS.length === 0) {
      var newDomains = props.getProperty('APP_CONFIG__allowed_domains');
      if (newDomains && newDomains.trim().length > 0) {
        envObj.ALLOWED_DOMAINS = newDomains.split(',').map(function(d) { return d.trim(); }).filter(Boolean);
      }
    }
  } catch(e) {}

  if (!envObj.ALLOWED_DOMAINS || envObj.ALLOWED_DOMAINS.length === 0) {
      if (typeof CONFIG !== 'undefined' && CONFIG.ALLOWED_DOMAINS) {
          envObj.ALLOWED_DOMAINS = CONFIG.ALLOWED_DOMAINS;
      }
  }
  
  template.ENV_CONFIG = JSON.stringify(envObj);

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
    var props = PropertiesService.getScriptProperties();
    var titleVal = props.getProperty('APP_CONFIG__app_title');
    var favVal = props.getProperty('APP_CONFIG__favicon_url');

    if (titleVal) brandingConfig.appTitle = titleVal;
    if (favVal) brandingConfig.faviconUrl = favVal;

    // Fallback legacy
    if (!titleVal && !favVal) {
      var brandingStr = props.getProperty('APP_BRANDING_CONFIG');
      if (brandingStr) {
        var parsedBranding = JSON.parse(brandingStr);
        if (parsedBranding.appTitle) brandingConfig.appTitle = parsedBranding.appTitle;
        if (parsedBranding.faviconUrl) brandingConfig.faviconUrl = parsedBranding.faviconUrl;
      }
    }
  } catch(e) {
    console.error("Error leyendo APP_BRANDING_CONFIG. Usando defaults.", e);
  }

  // Workspace Sync Config Load (S48.3)
  template.WORKSPACE_SYNC_ENABLED = (typeof isWorkspaceSyncEnabled !== 'undefined') ? isWorkspaceSyncEnabled() : true;

  let htmlOutput = template.evaluate()
    .setTitle(brandingConfig.appTitle)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, viewport-fit=cover');

  if (brandingConfig.faviconUrl) {
    htmlOutput.setFaviconUrl(brandingConfig.faviconUrl);
  }

  return htmlOutput;
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
