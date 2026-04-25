/**
 * @file Job_WorkspaceSync.js
 * 
 * [S44.11] Workspace Sync Background Worker
 * Escanea periódicamente (o bajo demanda) la Base de Datos para hidratar Personas
 * que tengan deficiencias en sus datos estructurados (Cargo, Nombre, etc.)
 * y cruza la información con la API AdminDirectory.
 */

/**
 * Escanea Personas faltantes de Workspace Info y actualiza automáticamente.
 * Limitado a 50 iteraciones para proteger el Timeout limit de Google Apps Script.
 * @public Exuesto a Triggers y UI (DataAPI)
 */
function runWorkspaceSyncJob(params) {
    try {
        var isManual = (params && params.manual === true);
        Logger.log("[Job Sync] Iniciando barrido Workspace Sync... Manual: " + isManual);
        if (typeof Engine_DB === 'undefined' || typeof Engine_ETL === 'undefined') {
            throw new Error("Librerías Core no disponibles. El motor no se cargó.");
        }

        var dbConfig = { SPREADSHEET_ID_DB: '', useSheets: true };
        try {
            var envStr = PropertiesService.getScriptProperties().getProperty('ENV_CONFIG');
            if (envStr) {
                var envObj = JSON.parse(envStr);
                if (envObj.SPREADSHEET_ID_DB) dbConfig.SPREADSHEET_ID_DB = envObj.SPREADSHEET_ID_DB;
            }
        } catch(e) {}

        // 1. Filtrado Server-Side (OOM Protection S44.18)
        var rawFilter = function(rowArray, headerMap) {
            var email = rowArray[headerMap['email']];
            if (!email || String(email).trim() === '') return false;

            var status = rowArray[headerMap['workspace_sync_status']];
            if (status === 'synced') return false;
            
            // [S44.11] Ignorar automáticos si fallaron previamente (Resiliencia).
            // Solo los retentamos cuando se invoca Bajo Demanda (isManual).
            if (status === 'failed' && !isManual) return false;

            var pendingStatus = String(status || '').trim();
            if (pendingStatus === 'undefined' || pendingStatus === 'null') pendingStatus = '';
            var pendingSync = (!pendingStatus || pendingStatus === 'pending');
            var isForcedFailed = (pendingStatus === 'failed' && isManual);
            
            return pendingSync || isForcedFailed;
        };

        // Envolvemos el list() con llamadas de bajo nivel y filtro crudo para evitar mapear toda la DB a RAM
        var listOptions = { rawFilterFn: rawFilter };
        var listResult = Adapter_Sheets.list('Persona', dbConfig, 'objects', false, listOptions);
        var candidates = listResult ? listResult.rows : [];

        if (!candidates || candidates.length === 0) {
            return { 
                status: 'OK', 
                count: 0, 
                evaluados: 0,
                actualizados: 0,
                sin_resultados: 0,
                db_id: dbConfig.SPREADSHEET_ID_DB,
                message: "Ninguna Persona requiere Sincronización en este momento." 
            };
        }

        // 3. Paginación: Recortamos los primeros 50 para evitar OOM / TimeOuts de GAS (Límite 6 minutos)
        var batchLimit = 50;
        var batch = candidates.slice(0, batchLimit);
        Logger.log("[Job Sync] Procesando lote de " + batch.length + " Personas (Restantes: " + (candidates.length - batch.length) + ")");

        // 4. Invocación de Capa ETL (Reutilización de Lógica de Ingesta S44.10 / KISS)
                // 4A. Pre-Procesamiento de Workspace (Mapeo On-Demand)
        if (typeof resolverDirectorioWorkspace !== 'undefined') {
            const isBlank = (val) => (!val || String(val).trim() === '');
            batch.forEach(payload => {
                const lacksName = isBlank(payload.nombre);
                const lacksCargo = isBlank(payload.id_cargo) && isBlank(payload.cargo);
                const lacksNum = isBlank(payload.numero_empleado);
                const lacksAvatar = isBlank(payload.avatar);
                const lacksDept = isBlank(payload.departamento);
                const lacksCC = isBlank(payload.centro_costo);
                const lacksUbi = isBlank(payload.ubicacion);
                const lacksLider = isBlank(payload.lider_directo);
                
                const isAnyFieldMissing = (lacksName || lacksCargo || lacksNum || lacksAvatar || lacksDept || lacksCC || lacksUbi || lacksLider);
                
                const status = String(payload.workspace_sync_status || '').trim();
                const wantsSync = (status === '' || status === 'pending' || status === 'failed');
                
                if (payload.email && (wantsSync || isAnyFieldMissing)) {
                    try {
                        const wsData = resolverDirectorioWorkspace(payload.email);
                        if (wsData && wsData.__status !== 'DISABLED' && wsData.__status !== 'ERROR') {
                            Object.keys(wsData).forEach(k => {
                                if (isBlank(payload[k]) || String(payload[k]).indexOf('(Pendiente Sync)') !== -1) {
                                    payload[k] = wsData[k];
                                }
                            });
                            
                            // S44.11: Relleno Obligatorio '---' for failing/hidden fields
                            const criticalFields = ['nombre', 'apellidos', 'telefono', 'departamento', 'centro_costo', 'cargo', 'ubicacion', 'numero_empleado', 'lider_directo', 'avatar'];
                            criticalFields.forEach(f => {
                                if (isBlank(payload[f])) {
                                    payload[f] = '---';
                                }
                            });
                            
                            payload.workspace_sync_status = 'synced';
                            if (typeof Logger !== 'undefined') Logger.log(`[Job Sync] Persona hidratada con Fallbacks: ${payload.email}`);
                        } else if (wsData && wsData.__status === 'ERROR') {
                            payload.workspace_sync_status = 'failed';
                        }
                    } catch(e) {
                        payload.workspace_sync_status = 'failed';
                    }
                } else {
                    payload.workspace_sync_status = 'synced';
                }
            });
        }

        // 4B. Invocación de Capa ETL (Resolución de UUIDs Cargo e Identidad)
        var hydrationResult = Engine_ETL.hydrateAndDeduplicate('Persona', batch);

        // 5. Escritura Masiva Topológica (Bulk Insert O(1) S44.18)
        dbConfig.muteTriggers = true;
        var actualizados = 0;
        var fallidos = 0;
        
        var incomingEdgesMock = [];
        var personasToSave = [];

        hydrationResult.data.forEach(function(row) {
            var pToSave = Object.assign({}, row);
            var personaId = String(pToSave.id_persona || pToSave.id_registro || pToSave.id || '').trim();
            
            // Si el motor inyectó un ID de Cargo plano, construimos la arista temporal
            if (pToSave.id_cargo && typeof pToSave.id_cargo === 'string' && personaId) {
                incomingEdgesMock.push({
                    id_nodo_padre: String(pToSave.id_cargo).trim(),
                    id_nodo_hijo: personaId,
                    tipo_relacion: 'CARGO_PERSONA'
                });
            }
            
            // [S45.2] Si existe lider_directo, construimos su arista
            var safeLiderDirecto = pToSave.lider_directo ? String(pToSave.lider_directo).trim() : '';
            if (safeLiderDirecto && personaId) {
                incomingEdgesMock.push({
                    id_nodo_padre: safeLiderDirecto,
                    id_nodo_hijo: personaId,
                    tipo_relacion: 'PERSONA_LIDER_DIRECTO'
                });
            }
            
            if (pToSave.workspace_sync_status === 'synced') actualizados++;
            if (pToSave.workspace_sync_status === 'failed') fallidos++;
            
            personasToSave.push(pToSave);
        });

        // Generar Transiciones Topológicas en Memoria RAM
        var edgesPayload = [];
        if (incomingEdgesMock.length > 0) {
            var STRATEGIES = null;
            if (typeof TOPOLOGY_STRATEGIES !== 'undefined') {
                STRATEGIES = TOPOLOGY_STRATEGIES;
            } else if (typeof require !== 'undefined') {
                try { STRATEGIES = require('./Topology_Strategies').TOPOLOGY_STRATEGIES; } catch(e) {}
            }

            if (STRATEGIES && typeof STRATEGIES.calculateSCD2Transitions === 'function') {
                var listEdgesResult = Adapter_Sheets.list('Sys_Graph_Edges', dbConfig, 'objects');
                var activeGraph = (listEdgesResult && listEdgesResult.rows) ? listEdgesResult.rows : [];
                
                var scd2Result = STRATEGIES.calculateSCD2Transitions(incomingEdgesMock, activeGraph, '1:N');
                edgesPayload = (scd2Result.edgesToClose || []).concat(scd2Result.edgesToInsert || []);
                Logger.log("[Job Sync] Topología Generada: " + (scd2Result.edgesToClose || []).length + " cierres, " + (scd2Result.edgesToInsert || []).length + " nuevas aristas.");
            } else {
                Logger.log("[Job Sync] WARN: Topology_Strategies no disponible. Omitiendo generación de aristas.");
            }
        }

        // Ejecutar Bulk Inserts (2 llamadas de red en lugar de 50)
        try {
            if (personasToSave.length > 0) {
                Engine_DB.upsertBatch('Persona', personasToSave, dbConfig);
            }
            if (edgesPayload.length > 0) {
                Engine_DB.upsertBatch('Sys_Graph_Edges', edgesPayload, dbConfig);
            }
        } catch(e) {
            Logger.log("[Job_WorkspaceSync] Fallo en la escritura masiva: " + e.message);
        }

        // 6. Reporte Final
        var total = hydrationResult.data.length;
        var sinResultados = total - (actualizados + fallidos);
        
        Logger.log("[Job Sync] Finalizado exitosamente. Modificados: " + actualizados);
        return { 
            status: 'OK', 
            count: hydrationResult.data.length,
            remaining: candidates.length - batch.length,
            db_id: dbConfig.SPREADSHEET_ID_DB,
            evaluados: candidates.length,
            actualizados: actualizados,
            fallidos: fallidos,
            sin_resultados: sinResultados,
            message: "Sincronización completada." 
        };

    } catch (e) {
        Logger.log("[Job Sync Error] " + e.message);
        return { status: 'ERROR', message: e.message };
    }
}

