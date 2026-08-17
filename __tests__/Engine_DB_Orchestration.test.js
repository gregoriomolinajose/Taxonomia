const fs = require('fs');
const path = require('path');

// Primero cargamos Adapter_Sheets y mutamos sus métodos para asegurar el Mock a nivel Singleton de Node
const Adapter_Sheets = require('../src/Adapter_Sheets');
Adapter_Sheets.list = vi.fn();
Adapter_Sheets.remove = vi.fn();
Adapter_Sheets.upsert = vi.fn();

// Cargamos Engine_DB DESPUÉS para que obtenga el Adapter_Sheets con Mocks inyectados (aunque el objeto de Require_cache ya esté referenciado)
const Engine_DB = require('../src/Engine_DB');

global.Utilities = {
    getUuid: vi.fn(() => '11223344-5566-7788-9900')
};
global.Logger = { log: vi.fn() };
global._invalidateCache = vi.fn();

global.Engine_Graph = {
    buildDeletionPatch: vi.fn()
};
global.getEntityTopologyRules = vi.fn();

describe('Engine_DB Orchestration & DAG SCD-2', () => {

    beforeEach(() => {
        global.getAppSchema = vi.fn((ent) => ({ primaryKey: (ent === 'Portafolio' ? 'id_portafolio' : 'id_' + ent.toLowerCase()), fields: [] }));
        global.APP_SCHEMAS = new Proxy({}, { get: (target, prop) => ({ primaryKey: (prop === 'Portafolio' ? 'id_portafolio' : 'id_' + String(prop).toLowerCase()) }) });
        vi.clearAllMocks();
        Engine_DB.upsertBatch = vi.fn((entity, payload) => ({ status: 'success', handled: payload.length }));
    });

    it.todo('should implement orchestration tests');

});
