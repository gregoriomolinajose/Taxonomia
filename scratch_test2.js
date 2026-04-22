const assert = require('assert');
const Engine_DB = require('./src/Engine_DB.js');
const Schema_Engine = {
    Persona: { 
        primaryKey: 'id_registro', 
        fields: [{ name: 'roles_asignados', type: 'relation', isTemporalGraph: true, relationType: 'padre', targetEntity: 'Sys_Roles', graphEntity: 'Sys_Graph_Edges', graphEdgeType: 'PERSONA_ROL', topologyCardinality: 'M:N' }] 
    },
    Sys_Roles: { primaryKey: 'id_rol' },
    Sys_Graph_Edges: { primaryKey: 'id_relacion', sheetName: 'Relacion_Dominios' }
};

global.APP_SCHEMAS = Schema_Engine;
global.Logger = { log: console.log };
global.CacheService = undefined;
global.CONFIG = { useSheets: true };
global.STRATEGIES = require('./src/Topology_Strategies.js').TOPOLOGY_STRATEGIES;
global.Engine_Graph = require('./src/Engine_Graph.js').Engine_Graph;

global.Adapter_Sheets = {
    upsertBatch: (t, i, c) => console.log('BATCH:', t, JSON.stringify(i)),
    upsert: (t, i, c) => { console.log('UPSERT:', t, JSON.stringify(i)); return {status: 'success', pk: 'id_registro', val: 'PER-1'}; },
    list: () => ({headers: ['id_relacion'], rows: []})
};
global._Adapter_Sheets = global.Adapter_Sheets;

const db = require('./src/Engine_DB.js');
db.list = () => ({headers: ['id_relacion'], rows: []});

db.update('Persona', 'PER-1', { id_registro: 'PER-1', roles_asignados: ['ROL-1', 'ROL-2'] });
