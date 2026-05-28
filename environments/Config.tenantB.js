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
    APP_VERSION: 'v1.2.19 - 2605281127',     // Auto-actualizado por deploy.js
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
        const envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
        if (envStr) {
            const envObj = JSON.parse(envStr);
            if (envObj.SPREADSHEET_ID_DB) CONFIG.SPREADSHEET_ID_DB = envObj.SPREADSHEET_ID_DB;
            if (envObj.ALLOWED_DOMAINS && envObj.ALLOWED_DOMAINS.length > 0) {
                CONFIG.ALLOWED_DOMAINS = envObj.ALLOWED_DOMAINS;
            }
            if (envObj.AuthMode) CONFIG.AuthMode = envObj.AuthMode;
            if (envObj.WORKSPACE_INTEGRATION !== undefined) CONFIG.WORKSPACE_INTEGRATION = envObj.WORKSPACE_INTEGRATION;
        }
    } catch(e) {
        console.error("Config.tenantB: Fallo parseando ENV_CONFIG", e);
    }
}

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
