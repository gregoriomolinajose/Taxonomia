const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('JobWorker - Auto-Sync Chaining', () => {
    let context;

    beforeEach(() => {
        const scriptCode = fs.readFileSync(path.resolve(__dirname, '../src/Job_Worker.js'), 'utf8');

        // Provide mocks for JobWorker dependencies
        const mockJobQueue = {
            getPendingJob: vi.fn(),
            updateJobStatus: vi.fn(),
            enqueue: vi.fn()
        };

        const mockLockService = {
            getScriptLock: () => ({
                tryLock: vi.fn(() => true),
                releaseLock: vi.fn()
            })
        };

        const mockCacheService = {
            getScriptCache: () => ({
                get: vi.fn(() => null),
                put: vi.fn(),
                remove: vi.fn()
            })
        };

        const mockScriptApp = {
            getProjectTriggers: vi.fn(() => []),
            newTrigger: vi.fn(() => ({
                timeBased: () => ({
                    everyMinutes: () => ({
                        create: vi.fn()
                    })
                })
            }))
        };

        context = vm.createContext({
            JobQueue: mockJobQueue,
            LockService: mockLockService,
            CacheService: mockCacheService,
            ScriptApp: mockScriptApp,
            Logger: { log: vi.fn() },
            Engine_DB: { upsertBatch: vi.fn(() => ({ rows: [] })), list: vi.fn(() => ({ rows: [] })) },
            Engine_ETL: { hydrateAndDeduplicate: vi.fn(() => ({ data: [] })) },
            APP_SCHEMAS: { Persona: { primaryKey: 'id_persona' } },
            runWorkspaceSyncJob: vi.fn(() => ({ remaining: 0 }))
        });

        vm.runInContext(scriptCode, context);
    });

    test('Should enqueue Job_WorkspaceSync upon successful Persona ETL job completion', () => {
        // Mock a PENDING Persona job with 1 record (will complete in one chunk)
        context.JobQueue.getPendingJob.mockReturnValue({
            jobId: 'job_123',
            status: 'PENDING',
            payload: {
                entity: 'Persona',
                data: [{ email: 'test@bancoppel.com' }]
            },
            processed: 0,
            errors: 0
        });

        // Run the worker
        const result = context.JobWorker.processNextJobChunk();

        // Check if it completed
        expect(result.debug).toBe('completed');
        
        // Verify it enqueued Job_WorkspaceSync
        expect(context.JobQueue.enqueue).toHaveBeenCalledWith({
            action: 'Job_WorkspaceSync'
        });
    });

    test('Should NOT enqueue Job_WorkspaceSync for non-Persona entities', () => {
        context.JobQueue.getPendingJob.mockReturnValue({
            jobId: 'job_456',
            status: 'PENDING',
            payload: {
                entity: 'Cargo',
                data: [{ nombre: 'Developer' }]
            },
            processed: 0,
            errors: 0
        });

        context.JobWorker.processNextJobChunk();

        // Should not enqueue
        expect(context.JobQueue.enqueue).not.toHaveBeenCalled();
    });
});
