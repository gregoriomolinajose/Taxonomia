// src/Config.prod.js
const CONFIG = {
    APP_VERSION: 'v1.0.83 - Build 260327.1043',
    SPREADSHEET_ID_DB: '1b15c9TylT8U5Z1eO8VjD0t-45YnI-K9LqV9x6G2K_pA',
    ALLOWED_DOMAINS: ['@coppel.com', '@bancoppel.com', '@bellfy.app', '@gmail.com'],
    ENV: 'production',
    DEBUG: false
};

if (typeof module !== 'undefined') {
    module.exports = CONFIG;
}
