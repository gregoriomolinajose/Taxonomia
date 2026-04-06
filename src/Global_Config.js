const CONFIG = {
    APP_VERSION: 'v1.4.0 - 2604011813',
    // ID inyectado puramente por variable de entorno (ENV_CONFIG)
    SPREADSHEET_ID_DB: '',
    ALLOWED_DOMAINS: ['@gmail.com', '@bellfy.app', '@coppel.com', '@bancoppel.com'],
    useSheets: true,
    useCloudDB: false,
    WORKSPACE_INTEGRATION: false // Disabled by default until set in ENV
};

// Override dinámico para entornos de Producción (Zero-Code CI/CD)
if (typeof PropertiesService !== 'undefined') {
    try {
        const envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
        if (envStr) {
            const envObj = JSON.parse(envStr);
            if (envObj.SPREADSHEET_ID_DB) CONFIG.SPREADSHEET_ID_DB = envObj.SPREADSHEET_ID_DB;
            if (envObj.ALLOWED_DOMAINS) CONFIG.ALLOWED_DOMAINS = envObj.ALLOWED_DOMAINS;
            if (envObj.AuthMode) CONFIG.AuthMode = envObj.AuthMode;
            if (envObj.WORKSPACE_INTEGRATION !== undefined) CONFIG.WORKSPACE_INTEGRATION = envObj.WORKSPACE_INTEGRATION;
        }
    } catch(e) {
        console.error("Global_Config: Fallo parseando ENV_CONFIG", e);
    }
}

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
