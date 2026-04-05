const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/API_Universal.gs');
const sourceCode = fs.readFileSync(filePath, 'utf8');

// Global Mocks for Apps Script internal classes
global.Logger = { log: jest.fn() };
global.ContentService = {
    MimeType: { JSON: 'application/json' },
    createTextOutput: jest.fn((content) => ({
        setMimeType: jest.fn(() => ({ type: 'TextOutput', content }))
    }))
};

// Legacy handlers mentioned in API_Universal.gs
global._handleCreate = jest.fn();
global._handleRead = jest.fn();
global._handleUpdate = jest.fn();
global._handleDelete = jest.fn();
global._generateShortUUID = jest.fn(() => 'SHORT-UUID');

// Mock Engine_DB
global.Engine_DB = {
    save: jest.fn(),
    readFull: jest.fn(),
    delete: jest.fn()
};

// Evaluate the entire file to pull doPost and API_Universal_Router
// API_Universal uses conditional exports, so we can require it
const API_Universal = require('../src/API_Universal.gs');

describe('API_Universal Controller', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Network Layer: doPost(e)', () => {
        // Obtenemos la función evaluando solo la estructura ya que doPost puede no estar explícitamente exportado
        let doPost;
        beforeAll(() => {
            const context = {
                ContentService: global.ContentService,
                JSON: global.JSON,
                _handleCreate: global._handleCreate,
                _handleRead: global._handleRead,
                _handleUpdate: global._handleUpdate,
                _handleDelete: global._handleDelete,
                doPost: null
            };
            const match = sourceCode.match(/function doPost\([^)]*\)\s*\{[\s\S]*?\n\}/);
            if(match) {
                eval(`
                    const ContentService = context.ContentService;
                    const _handleCreate = context._handleCreate;
                    const _handleRead = context._handleRead;
                    const _handleUpdate = context._handleUpdate;
                    const _handleDelete = context._handleDelete;
                    ${match[0]}
                    context.doPost = doPost;
                `);
                doPost = context.doPost;
            } else {
                throw new Error("Could not find doPost");
            }
        });

        it('should return status success envelope for valid create payload', () => {
            global._handleCreate.mockReturnValue({ fakeId: 1 });
            const mockEvent = {
                postData: {
                    contents: JSON.stringify({ entity: 'TestObj', action: 'create', data: { prop: 'A' } })
                }
            };
            
            const result = doPost(mockEvent);
            const parsedContent = JSON.parse(result.content);
            
            expect(global._handleCreate).toHaveBeenCalledWith('TestObj', { prop: 'A' });
            expect(parsedContent.status).toBe('success');
            expect(parsedContent.data.fakeId).toBe(1);
        });

        it('should catch JSON parsing errors and return status error envelope', () => {
            const mockEvent = {
                postData: {
                    contents: "INVALID JSON { [] }"
                }
            };
            
            const result = doPost(mockEvent);
            const parsedContent = JSON.parse(result.content);
            
            expect(parsedContent.status).toBe('error');
            expect(parsedContent.message).toBeDefined(); // Contains parsing error
        });
        
        it('should catch unsupported action error and return status error envelope', () => {
            const mockEvent = {
                postData: {
                    contents: JSON.stringify({ entity: 'TestObj', action: 'superdelete' })
                }
            };
            
            const result = doPost(mockEvent);
            const parsedContent = JSON.parse(result.content);
            
            expect(parsedContent.status).toBe('error');
            expect(parsedContent.message).toBe("Action not supported yet.");
        });
    });

    describe('Service Layer: API_Universal_Router()', () => {
        const { API_Universal_Router } = API_Universal;

        it('should read entity cleanly using payload id', () => {
            global.Engine_DB.readFull.mockReturnValue({ is_target: true });
            const result = API_Universal_Router('read', 'Usuario', { id: 'MOCKED_ID' });

            expect(global.Engine_DB.readFull).toHaveBeenCalledWith('Usuario', 'MOCKED_ID');
            expect(result.status).toBe('success');
            expect(result.data.is_target).toBe(true);
        });

        it('should update entity extracting pk using inferred pkField', () => {
            global._handleUpdate.mockReturnValue({ updated: true });
            
            const payload = { 
                id_grupo_producto: 'GRP-99', 
                nombre: 'Nuevo Grupo'
            };

            const result = API_Universal_Router('update', 'Grupo_Productos', payload);

            expect(global._handleUpdate).toHaveBeenCalledWith('Grupo_Productos', 'GRP-99', payload);
            expect(result.status).toBe('success');
            expect(result.data.updated).toBe(true);
        });

        it('should delete entity using flat string id', () => {
            global._handleDelete.mockReturnValue({ deleted: true });
            const result = API_Universal_Router('delete', 'EntidadFlat', 'TARGET-DEL');

            expect(global._handleDelete).toHaveBeenCalledWith('EntidadFlat', 'TARGET-DEL');
            expect(result.status).toBe('success');
        });

        it('should delete entity extracting id from nested payload', () => {
            global._handleDelete.mockReturnValue({ deleted: true });
            const result = API_Universal_Router('delete', 'Catalogo', { id_catalogo: 'CAT-1' });

            expect(global._handleDelete).toHaveBeenCalledWith('Catalogo', 'CAT-1');
            expect(result.status).toBe('success');
        });

        it('should catch Errors natively and expose errorType CONCURRENCY if present', () => {
            global.Engine_DB.readFull.mockImplementation(() => {
                throw new Error("ERROR_CONCURRENCY: The document was modified by another transaction.");
            });

            const result = API_Universal_Router('read', 'Colision', { id: 'COL-1' });

            expect(result.status).toBe('error');
            expect(result.success).toBe(false);
            expect(result.errorType).toBe('CONCURRENCY');
            expect(result.message).toContain('ERROR_CONCURRENCY');
        });
        
        it('should handle generic errors as GENERAL errorType', () => {
            global.Engine_DB.readFull.mockImplementation(() => {
                throw new Error("Standard Failure Mode");
            });

            const result = API_Universal_Router('read', 'FalloSimple', { id: 'COL-1' });

            expect(result.status).toBe('error');
            expect(result.errorType).toBe('GENERAL');
        });
        
        it('should gracefully handle Missing Schema in API_Universal_Router logic if create action drops inside _handleCreate directly', () => {
            global._handleCreate.mockReturnValue({ fakeId: 2 });
            
            const result = API_Universal_Router('create', 'VirtualEntity', { field: 1 });
            
            expect(global._handleCreate).toHaveBeenCalled();
            expect(result.status).toBe('success');
        });
    });

});
