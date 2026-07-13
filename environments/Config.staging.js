// environments/Config.staging.js
// Entorno: Staging (ex-producción) — proyecto GAS: SGMP - Staging
// Script ID: 14oIjG_akx2DuX1nZe_HWBR8TECPYZgCyYikKwtRnng_pgzxcK0wLekYa
const CONFIG = {
    APP_VERSION: 'v1.2.8 - 2607131332',
    SPREADSHEET_ID_DB: '',
    ALLOWED_DOMAINS: [],  // Se carga en runtime desde APP_CONFIG__allowed_domains (Adapter_Config)
    ENV: 'staging',
    DEBUG: true,           // Staging permite diagnósticos
    useSheets: true,
    useCloudDB: false,
    WORKSPACE_INTEGRATION: true
};

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

        if (_ssId && _ssId.trim().length > 0) CONFIG.SPREADSHEET_ID_DB = _ssId.trim().replace(/^['"]|['"]$/g, '');
        if (_domains && _domains.trim().length > 0) {
            CONFIG.ALLOWED_DOMAINS = _domains.split(',').map(function(d) { return d.trim(); }).filter(Boolean);
        }
    } catch(e) {
        console.error('[Config.staging] Fallo cargando CONFIG:', e);
    }
}


if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
