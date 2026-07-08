const CONFIG = {
    APP_VERSION: 'v1.2.19 - 2604212339',
    SPREADSHEET_ID_DB: '',
    useSheets: true,
    useCloudDB: false,
    WORKSPACE_INTEGRATION: true
};

if (typeof PropertiesService !== 'undefined') {
    try {
        const envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
        if (envStr) {
            const envObj = JSON.parse(envStr);
            if (envObj.SPREADSHEET_ID_DB) CONFIG.SPREADSHEET_ID_DB = envObj.SPREADSHEET_ID_DB;
            if (envObj.AuthMode) CONFIG.AuthMode = envObj.AuthMode;
            if (envObj.WORKSPACE_INTEGRATION !== undefined) CONFIG.WORKSPACE_INTEGRATION = envObj.WORKSPACE_INTEGRATION;
        }
        const ssId = PropertiesService.getScriptProperties().getProperty('APP_CONFIG__spreadsheet_id');
        if (ssId && ssId.trim().length > 0) {
            let cleanId = ssId.trim().replace(/^['"]|['"]$/g, '');
            if (cleanId.indexOf('/d/') !== -1) {
                var match = cleanId.match(/\/d\/([a-zA-Z0-9-_]+)/);
                if (match && match[1]) cleanId = match[1];
            }
            CONFIG.SPREADSHEET_ID_DB = cleanId;
        }
    } catch(e) {
        console.error("Config: Fallo parseando ENV_CONFIG", e);
    }
}

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
