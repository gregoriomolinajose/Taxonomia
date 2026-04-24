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

        // Envolvemos el list() con llamadas de bajo nivel para saltar el limitador de scope V8
        var listResult = Adapter_Sheets.list('Persona', dbConfig, 'objects');
        var personas = listResult ? listResult.rows : [];
        if (!personas || personas.length === 0) {
            var dbgInfo = "Unknown";
            var dbId = dbConfig.SPREADSHEET_ID_DB;
            try {
                if (dbId) {
                    var ss = SpreadsheetApp.openById(dbId);
                    var sheet = ss.getSheetByName('Persona');
                    if (sheet) {
                       var data = sheet.getDataRange().getValues();
                       dbgInfo = "Rows:" + data.length + " Cols:" + (data[0] ? data[0].length : 0);
                    } else {
                       dbgInfo = "Sheet_Not_Found";
                    }
                } else {
                    dbgInfo = "SPREADSHEET_ID_DB_EMPTY";
                }
            } catch(e) { dbgInfo = "Error:" + e.message; }
            return { 
                status: 'OK', 
                count: 0, 
                evaluados: 0,
                actualizados: 0,
                sin_resultados: 0,
                db_id: dbId,
                message: "Sin registros leídos del Engine_DB. Debug GoogleAppScript: " + dbgInfo 
            };
        }

        // 2. Filtrar candidatos
        var candidates = personas.filter(function(p) {
            if (!p.email) return false;
            if (p.workspace_sync_status === 'synced') return false;
            
            // [S44.11] Ignorar automáticos si fallaron previamente (Resiliencia).
            // Solo los retentamos cuando se invoca Bajo Demanda (isManual).
            if (p.workspace_sync_status === 'failed' && !isManual) return false;

            var pendingStatus = String(p.workspace_sync_status || '').trim();
            if (pendingStatus === 'undefined' || pendingStatus === 'null') pendingStatus = '';
            var pendingSync = (!pendingStatus || pendingStatus === 'pending');
            var isForcedFailed = (pendingStatus === 'failed' && isManual);
            
            return pendingSync || isForcedFailed;
        });

        if (candidates.length === 0) {
            var p0 = personas.length > 0 ? (personas[0].email + " vs " + personas[0].workspace_sync_status) : "No_Personas";
            return { 
                status: 'OK', 
                count: 0, 
                evaluados: 0,
                actualizados: 0,
                sin_resultados: 0,
                db_id: dbConfig.SPREADSHEET_ID_DB,
                message: "TotalDB:" + personas.length + " | Ninguna requiere Sincronización. Muestra: " + p0 
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
                                if (isBlank(payload[k])) {
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

        // 5. Escritura Activa y Creación de Grafos (M:N)
        // Debido a que upsertBatch opera de forma plana bloqueando la generación nativa de Edges en la Topología, 
        // utilizamos una secuencia de `.upsert()` iterativa protegiendo el timeout dentro del límite de 50 lotes (15s máx).
        dbConfig.muteTriggers = true;
        var actualizados = 0;
        var fallidos = 0;
        
        hydrationResult.data.forEach(function(row) {
            // Empaquetador de relaciones para forzar al Engine a interpretar grafos
            var pToSave = Object.assign({}, row);
            
            // Si el motor inyectó un ID de Cargo plano, lo transformamos en estructura anidada para SCD2
            if (pToSave.id_cargo && typeof pToSave.id_cargo === 'string') {
                pToSave.id_cargo = [{ id_cargo: pToSave.id_cargo }];
            }
            // Agrega más parseos (equipo, lider_directo) aquí en el futuro de ser necesario.
            
            try {
                let saveResult = null;
                try {
                    saveResult = Engine_DB.orchestrateNestedSave('Persona', pToSave, dbConfig);
                } catch(orchestrateError) {
                    throw orchestrateError;
                }
                


                if (pToSave.workspace_sync_status === 'synced') actualizados++;
                if (pToSave.workspace_sync_status === 'failed') fallidos++;
            } catch(e) {
                Logger.log("[Job_WorkspaceSync] Fallo la escritura de la Persona " + pToSave.email + ": " + e.message);
                fallidos++;
            }
        });

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

