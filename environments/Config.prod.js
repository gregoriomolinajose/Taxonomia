// src/Config.prod.js - VERIFIED PUSH: 2026-03-20 17:40
const CONFIG = {
    APP_VERSION: 'v1.0.7 - Build 260323.1130',
    // ID real de producción
    SPREADSHEET_ID_DB: '1DriqXz98fwXAsVTOioRlxJYfGbWFfIejGEJE99137aA',
    ALLOWED_DOMAINS: ['@coppel.com', '@bancoppel.com'],
    useSheets: true,
    useCloudDB: false
};

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
