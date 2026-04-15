// vi.setup.js
// Global Mocks for Google Apps Script Environment

global.Logger = {
    log: vi.fn(),
    console: vi.fn()
};

global.Session = {
    getActiveUser: vi.fn().mockReturnValue({
        getEmail: vi.fn().mockReturnValue('test-user@local')
    })
};

global.SpreadsheetApp = {
    flush: vi.fn(),
    openById: vi.fn().mockReturnValue({
        getSheetByName: vi.fn().mockReturnValue({
            getLastRow: vi.fn().mockReturnValue(3),
            getLastColumn: vi.fn().mockReturnValue(1),
            getDataRange: vi.fn().mockReturnValue({
                getValues: vi.fn().mockReturnValue([['id_user', 'estado', 'id_grupo_producto'], ['USER-123', 'Activo', 'GRUP-01'], ['USER-456', 'Activo', 'GRUP-02']]),
                getNumRows: vi.fn().mockReturnValue(3)
            }),
            getRange: vi.fn().mockReturnValue({
                getValues: vi.fn().mockReturnValue([[]]),
                setValues: vi.fn(), setValue: vi.fn(),
                clearContent: vi.fn()
            }),
            appendRow: vi.fn()
        }),
        insertSheet: vi.fn().mockReturnValue({
            getLastRow: vi.fn().mockReturnValue(0),
            getDataRange: vi.fn().mockReturnValue({
                getValues: vi.fn().mockReturnValue([[]]),
                getNumRows: () => 0
            }),
            getRange: vi.fn().mockReturnValue({
                setValues: vi.fn()
            }),
            appendRow: vi.fn()
        })
    }),
    getActiveSpreadsheet: vi.fn()
};

global.CONFIG = {
    SPREADSHEET_ID_DB: 'test-spreadsheet-id',
    useSheets: true,
    useCloudDB: false
};

global.APP_SCHEMAS = {
    Portafolio: { primaryKey: 'id_portafolio', fields: [] },
    Catalogo: { primaryKey: 'id_catalogo', fields: [] },
    PadreLevel: { primaryKey: 'id_padrelevel', fields: [] },
    EntidadFlat: { primaryKey: 'id_entidadflat', fields: [] },
    Users: { primaryKey: 'id_user', fields: [] },
    Colision: { primaryKey: 'id', fields: [] },
    Grupo_Productos: { primaryKey: 'id_grupo_producto', fields: [] }
};

global.getAppSchema = vi.fn((ent) => global.APP_SCHEMAS[ent] || { primaryKey: (ent === 'Portafolio' || ent === 'Catalogo' ? 'id_' + ent.toLowerCase() : 'id_' + String(ent).toLowerCase()), fields: [] });

// Mock para CacheService (Regla 11: Performance)
const mockCache = {
    get: vi.fn(),
    put: vi.fn(),
    remove: vi.fn()
};
global.CacheService = {
    getScriptCache: vi.fn().mockReturnValue(mockCache),
    getUserCache: vi.fn().mockReturnValue(mockCache),
    getDocumentCache: vi.fn().mockReturnValue(mockCache)
};

// Mock para LockService (Regla Concurrencia Térmica)
global.LockService = {
    getScriptLock: vi.fn().mockReturnValue({
        waitLock: vi.fn(),
        releaseLock: vi.fn()
    }),
    getUserLock: vi.fn().mockReturnValue({
        waitLock: vi.fn(),
        releaseLock: vi.fn()
    })
};

// Mock para HtmlService (usado en vistas)
global.HtmlService = {
    createTemplateFromFile: vi.fn().mockReturnValue({
        evaluate: vi.fn().mockReturnValue({
            getContent: vi.fn().mockReturnValue('<html>MOCKED CONTENT</html>')
        })
    }),
    createHtmlOutput: vi.fn().mockReturnValue({
        setTitle: vi.fn()
    })
};


try {
    const SchemaEngineModule = require('./src/Schema_Engine.gs');
    if (SchemaEngineModule && SchemaEngineModule.APP_SCHEMAS) {
        global.APP_SCHEMAS = SchemaEngineModule.APP_SCHEMAS;
        global.getAppSchema = SchemaEngineModule.getAppSchema;
        global.getEntityTopologyRules = SchemaEngineModule.getEntityTopologyRules;
    }
} catch(e) {
    if(!global.APP_SCHEMAS) {
        global.APP_SCHEMAS = new Proxy({}, { get: (t, p) => ({ primaryKey: 'id_' + String(p).toLowerCase(), fields: [] }) });
    }
}
