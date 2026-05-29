// environments/Config.tenantB.js
// [E6-S63] Configuración de entorno para Tenant B.
//
// NOTA IMPORTANTE — White-Label:
//   - ALLOWED_DOMAINS está vacío por defecto.
//   - En runtime, Adapter_Config lee los dominios desde PropertiesService
//     (clave APP_CONFIG__allowed_domains), configurados via "Ajustes Globales".
//   - Esta configuración es la semilla de arranque; no es la fuente final.
//
// Para desplegar a Tenant B:
//   1. Registra el Script ID del proyecto GAS de Tenant B en deploy.js > SCRIPT_IDS['tenantB']
//   2. Ejecuta: npm run deploy:tenantB:auto
//   3. En el GAS de Tenant B, configura PropertiesService via el panel "Ajustes Globales"

const CONFIG = {
    APP_VERSION: 'v1.2.19 - 2605281732',     // Auto-actualizado por deploy.js
    SPREADSHEET_ID_DB: '',                     // Configurar via Ajustes Globales (Adapter_Config)
    ALLOWED_DOMAINS: [],                       // Vacío — se resuelve en runtime desde Adapter_Config
    ENV: 'tenantB',
    DEBUG: false,
    useSheets: true,
    useCloudDB: false,
    WORKSPACE_INTEGRATION: true
};

// Runtime override desde PropertiesService (patrón idéntico a dev/prod)
if (typeof PropertiesService !== 'undefined') {
    try {
        var _props = PropertiesService.getScriptProperties();

        // Fuente principal: APP_CONFIG__* (nuevo esquema E6/S61)
        var _ssId    = _props.getProperty('APP_CONFIG__spreadsheet_id');
        var _domains = _props.getProperty('APP_CONFIG__allowed_domains');

        // Fallback: ENV_CONFIG legacy
        if (!_ssId || _ssId.trim().length === 0) {
            var _envStr = _props.getProperty('ENV_CONFIG');
            if (_envStr) {
                var _envObj = JSON.parse(_envStr);
                if (_envObj.SPREADSHEET_ID_DB) _ssId = _envObj.SPREADSHEET_ID_DB;
                if (!_domains && _envObj.ALLOWED_DOMAINS) {
                    _domains = Array.isArray(_envObj.ALLOWED_DOMAINS)
                        ? _envObj.ALLOWED_DOMAINS.join(',')
                        : String(_envObj.ALLOWED_DOMAINS);
                }
                if (_envObj.AuthMode) CONFIG.AuthMode = _envObj.AuthMode;
                if (_envObj.WORKSPACE_INTEGRATION !== undefined) CONFIG.WORKSPACE_INTEGRATION = _envObj.WORKSPACE_INTEGRATION;
            }
        }

        if (_ssId && _ssId.trim().length > 0) CONFIG.SPREADSHEET_ID_DB = _ssId.trim();
        if (_domains && _domains.trim().length > 0) {
            CONFIG.ALLOWED_DOMAINS = _domains.split(',').map(function(d) { return d.trim(); }).filter(Boolean);
        }
    } catch(e) {
        console.error("Config: Fallo parseando propiedades", e);
    }
}

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
