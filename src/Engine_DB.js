// src/Engine_DB.js

/**
 * Engine_DB: Database Abstraction Layer for Google Sheets & Cloud NoSQL
 * Operates purely as a Facade Router.
 */

let _Adapter_Sheets;
let _Adapter_CloudDB;

if (typeof require !== 'undefined') {
    // Entorno Node (Jest)
    _Adapter_Sheets = require('./Adapter_Sheets');
    _Adapter_CloudDB = require('./Adapter_CloudDB');
} else {
    // Entorno Google Apps Script (Globales)
    _Adapter_Sheets = Adapter_Sheets;
    _Adapter_CloudDB = Adapter_CloudDB;
}

const Engine_DB = {
    save: async function (tableName, payload, config) {
        const results = { sheets: {}, cloud: {} };
        const promises = [];

        // Dispatch a Sheets
        if (config.useSheets) {
            const pSheets = _Adapter_Sheets.upsert(tableName, payload)
                .then(res => { results.sheets = res; })
                .catch(err => { results.sheets = { status: 'error', error: err.message }; });
            promises.push(pSheets);
        }

        // Dispatch a Cloud (Non-blocking fail)
        if (config.useCloudDB) {
            const pCloud = _Adapter_CloudDB.upsert(tableName, payload)
                .then(res => { results.cloud = res; })
                .catch(err => { results.cloud = { status: 'error', error: err.message }; });
            promises.push(pCloud);
        }

        // Esperamos a que ambos terminen (triunfen o fallen, no importa, el Promise.all() acá 
        // está cubierto por los .catch().
        await Promise.all(promises);

        return results;
    }
};

if (typeof module !== 'undefined') {
    module.exports = Engine_DB;
}
