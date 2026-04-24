/**
 * @jest-environment jsdom
 */

// __tests__/DataEngine_ETL.client.test.js
// S38.6 Frontend Node Tests for Chunk Dispatcher and Payload Sanitization

require('../src/DataEngine_ETL.client.js');

describe('DataEngine_ETL (Frontend Client S38.6)', () => {
    let mockDataAPI;

    beforeEach(() => {
        // Prepare global Mock for API
        mockDataAPI = {
            call: vi.fn().mockResolvedValue({ status: 'success' })
        };
        global.DataAPI = mockDataAPI;
        window.DataAPI = mockDataAPI; // jsdom bind
        
        vi.clearAllMocks();
    });

    test('1. Sanitización: purga correctamente cabeceras sys_, file_ y avatar', async () => {
        const rawPayload = [
            { 
                nombre: 'Juan', 
                email: 'juan@test.com',
                sys_created_at: '2025-01-01',
                file_url: 'http://drive',
                avatar: 'http://img'
            }
        ];

        // Spy on internal dispatcher to see what it actually receives AFTER cleaning
        const dispatchSpy = vi.spyOn(window.DataEngine_ETL, '_dispatchChunks').mockResolvedValue(true);

        await window.DataEngine_ETL.processPayload(rawPayload, 'Persona', null);

        // The processed data sent to dispatcher should lack the audit headers
        expect(dispatchSpy).toHaveBeenCalledTimes(1);
        const [dispatchedData, entity] = dispatchSpy.mock.calls[0];
        
        expect(dispatchedData).toHaveLength(1);
        expect(dispatchedData[0]).toHaveProperty('nombre', 'Juan');
        expect(dispatchedData[0]).toHaveProperty('email', 'juan@test.com');
        expect(dispatchedData[0]).not.toHaveProperty('sys_created_at');
        expect(dispatchedData[0]).not.toHaveProperty('file_url');
        expect(dispatchedData[0]).not.toHaveProperty('avatar');

        dispatchSpy.mockRestore();
    });

    test('2. Chunker: Fragmentación matemática exacta para lotes > 50', async () => {
        // Múltiples registros (105 elementos)
        const rawPayload = Array.from({ length: 105 }, (_, i) => ({ email: `test${i}@test.com` }));
        const progressCb = vi.fn();

        await window.DataEngine_ETL._dispatchChunks(rawPayload, 'Persona', progressCb);

        // Debería haberse llamado DataAPI exactamente Math.ceil(105/50) = 3 veces
        expect(window.DataAPI.call).toHaveBeenCalledTimes(3);

        // Payload del Chunker #1
        expect(window.DataAPI.call).toHaveBeenNthCalledWith(1, 'bulkInsert', 'Persona', expect.any(Array));
        expect(window.DataAPI.call.mock.calls[0][2]).toHaveLength(50);

        // Payload del Chunker #2
        expect(window.DataAPI.call.mock.calls[1][2]).toHaveLength(50);

        // Payload del Chunker #3 (Los 5 restantes)
        expect(window.DataAPI.call.mock.calls[2][2]).toHaveLength(5);

        // Progress Callback fue llamado (4 veces = 3 envíos + 1 final completion)
        expect(progressCb).toHaveBeenCalledTimes(4);
        expect(progressCb).toHaveBeenLastCalledWith(3, 3, true); // (current, total, isDone)
    });
});
