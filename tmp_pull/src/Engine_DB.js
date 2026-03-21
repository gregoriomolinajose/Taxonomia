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
    save: function (tableName, payload, config) {
        const results = { sheets: {}, cloud: {} };

        // Dispatch a Sheets Síncrono
        if (config.useSheets) {
            // No atrapamos el error aquí — dejamos que suba para que API_Universal_Router lo capture y
            // devuelva {status:'error'} correcto al frontend. Evita falsos positivos de "guardado con éxito".
            results.sheets = _Adapter_Sheets.upsert(tableName, payload, config);
        }


        // Dispatch a Cloud Síncrono (Non-blocking fail simulado)
        if (config.useCloudDB) {
            try {
                results.cloud = _Adapter_CloudDB.upsert(tableName, payload, config);
            } catch (err) {
                results.cloud = { status: 'error', error: err.message };
            }
        }

        return results;
    },

    create: function (entityName, data) {
        Logger.log("Engine_DB_create_router: Routing " + entityName + " to Adapters.");
        // Utilizar la configuración global localmente accesible o pasarle los valores por defecto
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, useCloudDB: false };
        const result = this.save(entityName, data, config);
        return {
            success: true,
            Entity: entityName,
            adapter_results: result
        };
    },

    read: function (entityName, id) {
        // Lógica futura de enrutamiento READ (single record by ID)
    },

    /**
     * list(entityName)
     * Devuelve todos los registros de una entidad como { headers[], rows[] }.
     * Delega a Adapter_Sheets (la única fuente de datos activa en este proyecto).
     */
    list: function (entityName) {
        const config = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, SPREADSHEET_ID_DB: '' };
        Logger.log('Engine_DB.list: Listando entidad ' + entityName);
        return _Adapter_Sheets.list(entityName, config);
    },

    update: function (entityName, id, data) {
        // Lógica futura de enrutamiento UPDATE
    },

    delete: function (entityName, id) {
        // Lógica futura de enrutamiento DELETE
    }
};

if (typeof module !== 'undefined') {
    module.exports = Engine_DB;
}
