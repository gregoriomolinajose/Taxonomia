// src/Config.js
const CONFIG = {
    // TODO: Update this with the real Spreadsheet ID before UAT!
    // For now using a placeholder or a test sheet ID if one was provided
    SPREADSHEET_ID_DB: '1tMyYBLPr0HJnJwbhFpCVoM4U8k1EVGycBDBjEnUGDts',
    useSheets: true,
    useCloudDB: false
};

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
