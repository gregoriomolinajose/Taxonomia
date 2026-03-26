// jest.setup.js
// Global Mocks for Google Apps Script Environment

global.Logger = {
    log: jest.fn(),
    console: jest.fn()
};

global.Session = {
    getActiveUser: jest.fn().mockReturnValue({
        getEmail: jest.fn().mockReturnValue('test-user@local')
    })
};

global.SpreadsheetApp = {
    openById: jest.fn().mockReturnValue({
        getSheetByName: jest.fn().mockReturnValue({
            getLastRow: jest.fn().mockReturnValue(3),
            getLastColumn: jest.fn().mockReturnValue(1),
            getDataRange: jest.fn().mockReturnValue({
                getValues: jest.fn().mockReturnValue([['id_user', 'estado', 'id_grupo_producto'], ['USER-123', 'Activo', 'GRUP-01'], ['USER-456', 'Activo', 'GRUP-02']]),
                getNumRows: jest.fn().mockReturnValue(3)
            }),
            getRange: jest.fn().mockReturnValue({
                getValues: jest.fn().mockReturnValue([[]]),
                setValues: jest.fn(),
                clearContent: jest.fn()
            }),
            appendRow: jest.fn()
        }),
        insertSheet: jest.fn().mockReturnValue({
            getLastRow: jest.fn().mockReturnValue(0),
            getDataRange: jest.fn().mockReturnValue({
                getValues: jest.fn().mockReturnValue([[]]),
                getNumRows: () => 0
            }),
            getRange: jest.fn().mockReturnValue({
                setValues: jest.fn()
            }),
            appendRow: jest.fn()
        })
    }),
    getActiveSpreadsheet: jest.fn()
};

global.CONFIG = {
    SPREADSHEET_ID_DB: 'test-spreadsheet-id',
    useSheets: true,
    useCloudDB: false
};

// Mock para CacheService (Regla 11: Performance)
const mockCache = {
    get: jest.fn(),
    put: jest.fn(),
    remove: jest.fn()
};
global.CacheService = {
    getScriptCache: jest.fn().mockReturnValue(mockCache),
    getUserCache: jest.fn().mockReturnValue(mockCache),
    getDocumentCache: jest.fn().mockReturnValue(mockCache)
};

// Mock para HtmlService (usado en vistas)
global.HtmlService = {
    createTemplateFromFile: jest.fn().mockReturnValue({
        evaluate: jest.fn().mockReturnValue({
            getContent: jest.fn().mockReturnValue('<html>MOCKED CONTENT</html>')
        })
    }),
    createHtmlOutput: jest.fn().mockReturnValue({
        setTitle: jest.fn()
    })
};
