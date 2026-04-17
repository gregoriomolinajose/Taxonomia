const { test, expect } = require('@playwright/test');
const { setupPersistentContext, bypassGoogleAuth } = require('./utils/setup');

test.describe('S40.3 ETL Mass Upload & Integrity', () => {
    let context;
    let page;
    let frame;
    let cleanupIds = [];

    test.beforeAll(async () => {
        const setup = await setupPersistentContext();
        context = setup.context;
        page = setup.page;
        
        page.on('console', async msg => {
            const values = [];
            for (const arg of msg.args())
                values.push(await arg.jsonValue().catch(() => '<object>'));
            console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
        });
        
        // [BugFix S40.3] Garantizar la existencia de columnas OCC (version/_version)
        const frame = await bypassGoogleAuth(page);
        console.log("[SETUP] Alineando Tablas del Sistema (Schema Reconcile)...");
        await frame.locator('body').evaluate(async () => {
            return new Promise((resolve, reject) => {
                if (typeof google !== 'undefined' && google.script && google.script.run) {
                    google.script.run
                        .withSuccessHandler(resolve)
                        .withFailureHandler(reject)
                        .runSchemaReconcile();
                } else {
                    resolve();
                }
            }).catch(e => console.error("Error en schemaReconcile:", e));
        });
    });

    test.afterAll(async () => {
        // [Resiliencia S40.3] Operación transaccional: Remover la basura inyectada
        console.log("[TEARDOWN] Purificando la Base de Datos... IDs:", cleanupIds);
        if (cleanupIds.length > 0 && frame) {
            await frame.locator('body').evaluate(async (el, ids) => {
                for (const pid of ids) {
                    await window.DataAPI.call('API_Universal_Router', 'delete', 'Portafolio', pid)
                        .catch(e => console.warn(`[Teardown Warn] Falla al purgar ID ${pid}:`, e.message || 'Error Desconocido'));
                    console.log(`🗑️ Petición de purga enviada para test data: ${pid}`);
                }
            }, cleanupIds);
        }
        await context.close();
    });

    test.beforeEach(async () => {
        frame = await bypassGoogleAuth(page);
    });

    test('ETL Payload Semantic Identity (Lexical y UUID Corto)', async () => {
        const mockPayload = [{
            nombre: `ETL Test Auto 1 - ${Date.now()}`,
            descripcion: 'Payload de Fabricación Automatizada'
            // [BugFix S40.4] Omitimos explícitamente "estado" para probar el schema defaultValue
        }];

        const response = await frame.locator('body').evaluate(async (el, payload) => {
            return await window.DataAPI.call('bulkInsert', 'Portafolio', payload).catch(e => { return { status: 'error', message: e.message || e }});
        }, mockPayload);

        expect(response, 'El Chunk falló al volver del backend').toBeDefined();
        // The API returns { status: 'success', data: { status: 'success', count: 1, details: [...] } }
        expect(response.status, JSON.stringify(response)).toBe('success');
        
        expect(response.insertedCount).toBe(1);

        // Recuperar registro de la matriz 'details' en el payload backend
        const item = response.details[0];

        // 2. Aserción de UUID Corto
        expect(item.val, 'Primary Key vacía').toBeDefined();
        expect(item.val.length).toBeLessThanOrEqual(14); // PORT-XXXXX suele ser de 10
        expect(item.val).toMatch(/^PORT-[A-Z0-9]+$/);
        
        cleanupIds.push(item.val);

        // 3. Aserción de Lexical ID Inyectado en Batch
        console.log("ITEM DEBUG FRONTEND:", item);
        expect(item.lexical_id, 'Falta enrutamiento Lexical').toBeDefined();
        expect(item.lexical_id).toMatch(/^PORT-\d+$/);

        // 4. [BugFix S40.4] Recuperar registro duro desde BD y asegurar que el Schema inyectó Default Value
        const backendRecord = await frame.locator('body').evaluate(async (el, idToRead) => {
            return await window.DataAPI.call('API_Universal_Router', 'read', 'Portafolio', idToRead).catch(e => { 
                console.error("DEBUG E2E S40.4 READ ERROR:", e);
                return { status: 'error', message: e.message || e };
            });
        }, item.val);
        
        console.log("BACKEND RECORD DEBUG:", backendRecord);
        expect(backendRecord.status).toBe('success');
        expect(backendRecord.data.estado).toBe('Activo'); // Omitido en payload, inyectado por Adapter_Sheets
    });

    // H10: Skipped porque DataEngine_ETL respeta el Strict Schema y actualmente ninguna entidad usa type="date".
    // Se reactivará cuando se añadan campos de fecha de usuario al esquema.
    test.skip('ETL Date Parsing (ISO 8601 Compliance)', async () => {
        const mockPayload = [{
            nombre: `ETL Test Date Parse - ${Date.now()}`,
            start_date: '15/4/2026',    // Peligro Nativo DD/MM/YYYY
            end_date: '2026-05-30',     // YYYY-MM-DD
            estado: 'Activo'
        }];

        const payloadForBackend = await frame.locator('body').evaluate((el, payload) => {
            const Engine = window.DataEngine_ETL;
            const rawCSV = `nombre,start_date,end_date,estado\n"${payload[0].nombre}","${payload[0].start_date}","${payload[0].end_date}","${payload[0].estado}"`;
            return Engine._csvToJson(rawCSV, 'Portafolio');
        }, mockPayload);

        // Validar directamente la salida del parser en Frontend antes de enviarlo al Router Central
        // El esquema Portafolio no tiene start_date, así que el backend lo ignorará (Strict Schema)
        expect(payloadForBackend[0].start_date).toBe('2026-04-15T00:00:00.000Z');
        expect(payloadForBackend[0].end_date).toBe('2026-05-30T00:00:00.000Z');

        // Validar la carga de todas formas para probar integridad
        const responseData = await frame.locator('body').evaluate(async (el, parsed) => {
            return await window.DataAPI.call('bulkInsert', 'Portafolio', parsed).catch(e => { return { status: 'error', message: e.message || e }});
        }, payloadForBackend);

        expect(responseData.status, JSON.stringify(responseData)).toBe('success');
        const insertedId = responseData.details[0].val;
        cleanupIds.push(insertedId);
    });

    test('ETL OCC Versioning (Optimistic Concurrency Bulk Auto-healing)', async () => {
        const mockPayloadA = [{
            nombre: `ETL Concurrency Auto - ${Date.now()}`,
            estado: 'Activo'
        }];

        const resA = await frame.locator('body').evaluate(async (el, payload) => {
            return await window.DataAPI.call('bulkInsert', 'Portafolio', payload).catch(e => { return { status: 'error', message: e.message || e }});
        }, mockPayloadA);

        const newId = resA.details[0].val;
        cleanupIds.push(newId);
        expect(resA.details[0].version).toBe(1);

        // Disparo inminente usando Batch Update 
        const mockPayloadB = [{
            id_portafolio: newId,
            nombre: `ETL Concurrency Auto - Mutado - ${Date.now()}`
        }];

        const resB = await frame.locator('body').evaluate(async (el, payload) => {
             return await window.DataAPI.call('bulkInsert', 'Portafolio', payload).catch(e => { return { status: 'error', message: e.message || e }});
        }, mockPayloadB);

        // Assert OCC Version en Respuesta
        expect(resB.details[0].version).toBe(2);

        // Corroboración Total mediante Readout Crudo
        const readRecord = await frame.locator('body').evaluate(async (el, id) => {
            const reply = await window.DataAPI.call('API_Universal_Router', 'read', 'Portafolio', id);
            if (Array.isArray(reply.data)) return reply.data.find(r => r.id_portafolio === id);
            return reply.data;
        }, newId);

        expect(readRecord._version).toBe(2);
        expect(readRecord.nombre).toContain('ETL Concurrency Auto - Mutado');
    });

});
