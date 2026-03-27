const CONFIG = {
    APP_VERSION: 'v1.0.84 - Build 260327.1126',
    // TODO: Reemplazar con el ID real de Desarrollo
    SPREADSHEET_ID_DB: '1tMyYBLPr0HJnJwbhFpCVoM4U8k1EVGycBDBjEnUGDts',
    ALLOWED_DOMAINS: ['@gmail.com', '@bellfy.app', '@coppel.com', '@bancoppel.com'],
    useSheets: true,
    useCloudDB: false
};

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
