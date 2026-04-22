const APP_SCHEMAS = { 
  Persona: { 
    primaryKey: 'id_registro', 
    fields: [
      { name: 'roles_asignados', type: 'relation', isTemporalGraph: true, relationType: 'padre', targetEntity: 'Rol', graphEntity: 'Sys_Graph_Edges', graphEdgeType: 'PERSONA_ROL', topologyCardinality: 'M:N' }
    ] 
  }, 
  Rol: { primaryKey: 'id_rol' }, 
  Sys_Graph_Edges: { primaryKey: 'id_relacion', sheetName: 'Relacion_Dominios' } 
};

global.APP_SCHEMAS = APP_SCHEMAS;
global.Logger = { log: console.log };
global.CacheService = undefined;
global.CONFIG = { useSheets: true };
global.SpreadsheetApp = null;
global.LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };

const Engine_Graph = require('./src/Engine_Graph.js');
global.Engine_Graph = Engine_Graph;

global.STRATEGIES = require('./src/Topology_Strategies.js');

const Adapter_Sheets = require('./src/Adapter_Sheets.js');
global.Adapter_Sheets = Adapter_Sheets;

Adapter_Sheets.upsertBatch = function(t,i,c){ 
  console.log('UPSERT BATCH:', t, JSON.stringify(i, null, 2)); 
  return {status: 'success'}; 
};
Adapter_Sheets.upsert = function(t,i,c){ 
  console.log('UPSERT MAIN PADRE:', t, JSON.stringify(i)); 
  return {status: 'success', pk: 'id_registro', val: 'PER-1'}; 
};
Adapter_Sheets.list = function(){ 
  return {headers:['id_relacion'], rows:[]}; 
};

// Inyectar Engine_Graph a entorno global explícito pseudo-GAS
const vm = require('vm');
const fs = require('fs');

const context = {
    APP_SCHEMAS: APP_SCHEMAS,
    Logger: global.Logger,
    CacheService: global.CacheService,
    CONFIG: global.CONFIG,
    SpreadsheetApp: global.SpreadsheetApp,
    LockService: global.LockService,
    Engine_Graph: global.Engine_Graph,
    STRATEGIES: global.STRATEGIES,
    Adapter_Sheets: global.Adapter_Sheets,
    _Adapter_Sheets: global.Adapter_Sheets,
    console: console,
    module: module,
    require: require,
    global: global
};

vm.createContext(context);
const script = new vm.Script(fs.readFileSync('./src/Engine_DB.js', 'utf8') + "\n\nmodule.exports = Engine_DB;");
const db = script.runInContext(context);

const res = db.update('Persona', 'PER-1', { id_registro: 'PER-1', roles_asignados: ['ROL-1', 'ROL-2'] });
console.log('RESULT', JSON.stringify(res, null, 2));
