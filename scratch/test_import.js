var CONFIG = { SPREADSHEET_ID_DB: 'TEST' };
var APP_SCHEMAS = {
    Persona: { fields: [{name: 'id_persona'}, {name: 'cargo'}, {name: 'id_cargo'}, {name: 'lider_directo'}], primaryKey: 'id_persona',
    mutationInterceptors: ['AutoProvisionCargo', 'AutoProvisionLiderDirecto'] },
    Cargo: { fields: [{name: 'id_cargo'}, {name: 'nombre'}], primaryKey: 'id_cargo' }
};
var Engine_DB = {
    list: function(tableName) { return { rows: [] }; },
    upsertBatch: function(tableName, batch) { console.log("upsertBatch called for " + tableName + ":", JSON.stringify(batch)); }
};
var Adapter_Sheets = {
    list: function() { return { rows: [] }; }
};
var Logger = { log: console.log };
global.Engine_DB = Engine_DB;
global.APP_SCHEMAS = APP_SCHEMAS;
global.Logger = Logger;
global.Adapter_Sheets = Adapter_Sheets;
global.getAppSchema = (name) => APP_SCHEMAS[name];

var Engine_ETL = require('../src/Engine_ETL').Engine_ETL;
var Business_Interceptors = require('../src/Business_Interceptors').Business_Interceptors;
global.Business_Interceptors = Business_Interceptors;

// Simular el registro desde CSV (como viene en Job_WorkspaceSync despues de insertarse en DB)
var chunk = [{ id_persona: 'PERS-1234', email: 'david@coppel.com' }];

// Simular WorkspaceSync
var wsData = { cargo: '9653245', lider_directo: 'diego@coppel.com' };
chunk[0].cargo = wsData.cargo;
chunk[0].lider_directo = wsData.lider_directo;

var res = Engine_ETL.hydrateAndDeduplicate('Persona', chunk);
console.log("Hydrate Result:", JSON.stringify(res.data));
