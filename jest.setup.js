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
        getSheetByName: jest.fn(),
        insertSheet: jest.fn()
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
