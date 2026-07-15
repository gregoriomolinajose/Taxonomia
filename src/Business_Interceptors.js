/**
 * Business_Interceptors.gs
 * Capa de abstracción para reglas de negocio previas a la persistencia en DB.
 * Maneja lógicas como el Auto-Provisionamiento de entidades hijas.
 */

var Business_Interceptors = (function() {

    /**
     * Motor DRY para generar Stubs en O(1) de memoria,
     * mitigando N+1 y manteniendo SCD-2 / Integridad de Grafos.
     */
    function _provisionStubs(config) {
        if (!config.items || config.items.length === 0) return;

        let memoryMap = {};
        let batchToCreate = [];
        let createdCache = {};

        // 1. Optimización Memoria O(1) vs Batch completo
        if (config.items.length === 1) {
            const rawKey = config.extractKeyFn(config.items[0]);
            if (rawKey && typeof Adapter_Sheets !== 'undefined') {
                const normSearch = String(rawKey).trim().toLowerCase();
                const rawFilter = (rowArray, headerMap) => config.matchRecordFn(rowArray, headerMap, normSearch);
                const dbConfig = (typeof CONFIG !== 'undefined') ? CONFIG : { useSheets: true, SPREADSHEET_ID_DB: '' };
                const res = Adapter_Sheets.list(config.targetEntity, dbConfig, 'objects', false, { rawFilterFn: rawFilter });
                if (res && res.rows && res.rows.length > 0) {
                    config.extractCacheValuesFn(res.rows[0], memoryMap);
                }
            }
        } else {
            if (typeof Engine_DB !== 'undefined') {
                const res = Engine_DB.list(config.targetEntity, 'objects', { skipCache: true });
                const all = (res && res.rows) ? res.rows : [];
                all.forEach(r => config.extractCacheValuesFn(r, memoryMap));
            }
        }

        // [BUGFIX] Intra-Batch Deduplication
        // Añadir los items del payload actual al mapa de memoria. Si el líder (u otra entidad)
        // ya viene en el mismo archivo CSV, esto asegura que el interceptor reconozca
        // su id temporal en lugar de generar un registro stub duplicado "Pendiente Sync".
        config.items.forEach(item => {
            if (config.extractCacheValuesFn) {
                config.extractCacheValuesFn(item, memoryMap);
            }
        });

        // 2. Procesamiento y Generación de Stubs
        config.items.forEach(payload => {
            const rawKey = config.extractKeyFn(payload);
            if (rawKey !== undefined && rawKey !== null && String(rawKey).trim() !== '') {
                const normKey = String(rawKey).trim().toLowerCase();
                
                let resolvedId = null;
                if (memoryMap[normKey]) {
                    resolvedId = memoryMap[normKey];
                } else if (config.shouldCreateStubFn ? config.shouldCreateStubFn(payload, normKey) : true) {
                    if (!createdCache[normKey]) {
                        if (config.recursiveFactory) {
                            const records = config.recursiveFactory(String(rawKey).trim(), memoryMap, createdCache);
                            if (records && records.length > 0) {
                                records.forEach(r => batchToCreate.push(r));
                                resolvedId = records[0][config.primaryKeyField]; // El primero es el buscado
                            }
                        } else {
                            const stub = config.stubFactory(String(rawKey).trim());
                            batchToCreate.push(stub.record);
                            createdCache[normKey] = stub.id;
                            resolvedId = stub.id;
                            memoryMap[normKey] = stub.id;
                        }
                    } else {
                        resolvedId = createdCache[normKey];
                    }
                } else {
                    resolvedId = payload[config.primaryKeyField]; // Mantener ID existente si no creamos stub
                }
                
                if (resolvedId && config.updatePayloadFn) {
                    config.updatePayloadFn(payload, resolvedId);
                }
            }
        });

        // 3. Persistencia Atómica (Bulk)
        if (batchToCreate.length > 0 && typeof Engine_DB !== 'undefined') {
            try {
                Engine_DB.upsertBatch(config.targetEntity, batchToCreate, { muteTriggers: true });
                if (typeof Logger !== 'undefined') Logger.log(config.logMessage.replace('{N}', batchToCreate.length));
            } catch(e) {
                if (typeof console !== 'undefined') console.error(`[CRITICAL] Error batch interceptor para ${config.targetEntity}: ${e.message}`);
                if (typeof Logger !== 'undefined') Logger.log(`[CRITICAL] Error batch interceptor para ${config.targetEntity}: ${e.message}`);
            }
        }
    }

    /**
     * Motor DRY para generar Stubs Relacionales M:N (Aristas temporales).
     * Reemplaza a las implementaciones imperativas de Roles y Equipos.
     */
    function _provisionRelationalStubs(entityName, items, config) {
        if (!items || items.length === 0) return;

        let dbTargets = {};
        if (typeof Engine_DB !== 'undefined') {
            const res = Engine_DB.list(config.targetEntity, 'objects', { skipCache: true });
            if (res && res.rows) {
                res.rows.forEach(r => {
                    dbTargets[String(r.nombre).trim().toLowerCase()] = r[config.idField];
                });
            }
        }

        let sysEdges = [];
        if (typeof Engine_DB !== 'undefined') {
            sysEdges = Engine_DB.list('Sys_Graph_Edges', 'objects').rows || [];
        }

        let edgesBatch = [];
        const sysDate = new Date().toISOString();

        items.forEach(p => {
            if (p[config.field]) {
                const valuesRaw = String(p[config.field]).split(',');
                valuesRaw.forEach(valName => {
                    const nameTrim = valName.trim();
                    if (nameTrim === '') return;
                    
                    const normName = nameTrim.toLowerCase();
                    let targetId = dbTargets[normName];
                    
                    if (!targetId) {
                        // Crear Stub
                        targetId = config.stubPrefix + Math.random().toString(36).substring(2, 10).toUpperCase();
                        let stub = {
                            [config.idField]: targetId,
                            nombre: nameTrim + " (Por definir)",
                            estado: "Activo"
                        };
                        if (config.extraStubFields) {
                            Object.assign(stub, config.extraStubFields);
                        }
                        if (typeof Engine_DB !== 'undefined') {
                            try { 
                                Engine_DB.upsertBatch(config.targetEntity, [stub], { muteTriggers: true }); 
                            } catch(e) {
                                if (typeof console !== 'undefined') console.error(`Error persistiendo stub ${targetId} para ${config.targetEntity}: ${e.message}`);
                                return; // Abortar creación de la arista
                            }
                        }
                        dbTargets[normName] = targetId;
                    }
                    
                    // Prevenir duplicidad de aristas
                    const childId = String(p.id_persona || p._tempId).trim();
                    const edgeExists = sysEdges.some(e => e.es_version_actual !== false && e.tipo_relacion === config.edgeType && String(e.id_nodo_padre).trim() === targetId && String(e.id_nodo_hijo).trim() === childId);
                    
                    if (!edgeExists) {
                        sysEdges.push({ es_version_actual: true, tipo_relacion: config.edgeType, id_nodo_padre: targetId, id_nodo_hijo: childId }); // Prevenir duplicados intra-batch
                        edgesBatch.push({
                        id_relacion: "RELA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                        id_nodo_padre: targetId,
                        id_nodo_hijo: childId,
                        tipo_relacion: config.edgeType,
                        valido_desde: sysDate,
                        valido_hasta: "",
                        es_version_actual: true,
                        estado: p._estado_arista || "Activo",
                        contexto_id: p._contexto_arista || ""
                    });
                    }
                });
                
                // Borramos el campo plano para que el DB engine no intente insertarlo como columna plana
                delete p[config.field];
            }
        });

        if (edgesBatch.length > 0 && typeof Engine_DB !== 'undefined') {
            try { 
                Engine_DB.upsertBatch('Sys_Graph_Edges', edgesBatch, { muteTriggers: true }); 
                if (typeof Logger !== 'undefined') Logger.log(`Se generaron ${edgesBatch.length} relaciones ${config.edgeType}.`);
            } catch(e) {
                if (typeof console !== 'undefined') console.error(`[CRITICAL] Error persistiendo aristas ${config.edgeType}: ${e.message}`);
                if (typeof Logger !== 'undefined') Logger.log(`[CRITICAL] Error persistiendo aristas ${config.edgeType}: ${e.message}`);
            }
        }
    }

    const INTERCEPTORS = {
        /**
         * [GreatPeeps] ProvisionDriveFolders
         * Crea carpetas en Drive para Empresas y Vacantes
         */
        ProvisionDriveFolders: function(entityName, items) {
            if (entityName !== 'Empresas' && entityName !== 'Vacantes') return;
            if (typeof DriveApp === 'undefined') return;

            // TODO: Ideally we should grab a Root Folder ID from PropertiesService.
            // For MVP, we create them in root or a specific folder if defined.
            let rootFolderId = null;
            try {
                rootFolderId = PropertiesService.getScriptProperties().getProperty('GREATPEEPS_DRIVE_ROOT');
            } catch(e) {}
            
            let rootFolder = rootFolderId ? DriveApp.getFolderById(rootFolderId) : DriveApp.getRootFolder();

            items.forEach(item => {
                try {
                    if (entityName === 'Empresas') {
                        let folder = null;
                        let docFolder = null;

                        // 1. Crear o recuperar carpeta principal y subcarpeta
                        if (!item.drive_folder_id && item.nombre) {
                            folder = rootFolder.createFolder(item.nombre);
                            item.drive_folder_id = folder.getId();
                            
                            docFolder = folder.createFolder("Documentos de la empresa");
                            item.drive_folder_link = docFolder.getUrl();
                            
                            if (typeof Logger !== 'undefined') Logger.log(`Carpeta creada para Empresa: ${item.nombre}`);
                        } else if (item.drive_folder_id) {
                            try {
                                folder = DriveApp.getFolderById(item.drive_folder_id);
                                const subfolders = folder.getFoldersByName("Documentos de la empresa");
                                if (subfolders.hasNext()) {
                                    docFolder = subfolders.next();
                                } else {
                                    docFolder = folder.createFolder("Documentos de la empresa");
                                    item.drive_folder_link = docFolder.getUrl();
                                }
                            } catch(e) {
                                if (typeof Logger !== 'undefined') Logger.log(`No se pudo acceder a carpeta existente: ${e.message}`);
                            }
                        }
                    } 
                    else if (entityName === 'Vacantes') {
                        if (item.drive_folder_id) return; // Si ya tiene, no hacemos nada más por ahora
                        if (item.titulo && item.empresa_id) {
                            let parentFolder = rootFolder;
                            if (typeof Engine_DB !== 'undefined') {
                                 const empresaRes = Engine_DB.read('Empresas', item.empresa_id);
                                 if (empresaRes && empresaRes.record && empresaRes.record.drive_folder_id) {
                                     parentFolder = DriveApp.getFolderById(empresaRes.record.drive_folder_id);
                                 }
                            }
                            const folder = parentFolder.createFolder(item.titulo);
                            item.drive_folder_id = folder.getId();
                            if (typeof Logger !== 'undefined') Logger.log(`Carpeta creada para Vacante: ${item.titulo}`);
                        }
                    }
                } catch(e) {
                    if (typeof Logger !== 'undefined') Logger.log(`Error procesando Drive Interceptor: ${e.message}`);
                }
            });
        },

        /**
         * Interceptor 6: ProcessDriveUploads
         * Procesa archivos locales enviados desde UI y los guarda en Drive en la carpeta correspondiente.
         */
        ProcessDriveUploads: function(entityName, items) {
            items.forEach(item => {
                if (!item.drive_folder_id) return; // Si no hay carpeta principal, no podemos guardar documentos

                try {
                    let docFolder = null;
                    if (entityName === 'Empresas') {
                        // Buscar subcarpeta "Documentos de la empresa"
                        const folder = DriveApp.getFolderById(item.drive_folder_id);
                        const subfolders = folder.getFoldersByName("Documentos de la empresa");
                        if (subfolders.hasNext()) {
                            docFolder = subfolders.next();
                        } else {
                            docFolder = folder.createFolder("Documentos de la empresa");
                            item.drive_folder_link = docFolder.getUrl();
                        }

                        // Procesar subida de constancia_situacion_fiscal
                        if (item.hasOwnProperty('constancia_situacion_fiscal')) {
                            const uploadObj = item.constancia_situacion_fiscal;
                            if (uploadObj && uploadObj.type === 'local' && uploadObj.data && uploadObj.filename) {
                                try {
                                    const fileUrl = Adapter_Storage.saveBase64File(uploadObj, docFolder);
                                    item.constancia_situacion_fiscal = fileUrl ? fileUrl : "";
                                } catch (e) {
                                    if (typeof Logger !== 'undefined') Logger.log("Error guardando constancia: " + e.message);
                                    item.constancia_situacion_fiscal = "";
                                }
                            } else if (uploadObj && uploadObj.type === 'drive' && uploadObj.url) {
                                item.constancia_situacion_fiscal = uploadObj.url;
                            } else if (uploadObj === null || uploadObj === "") {
                                item.constancia_situacion_fiscal = ""; // Eliminado por el usuario
                            } else {
                                delete item.constancia_situacion_fiscal;
                            }
                        }
                    }
                } catch(e) {
                    if (typeof Logger !== 'undefined') Logger.log(`Error en ProcessDriveUploads: ${e.message}`);
                }
            });
        },

        /**
         * [GreatPeeps] GeminiCVScreening
         * Filtra CVs usando Engine_AI
         */
        GeminiCVScreening: function(entityName, items) {
            if (entityName !== 'Candidatos') return;
            if (typeof Engine_AI === 'undefined') return;

            items.forEach(item => {
                // Solo si hay CV y no hay score previo
                if (item.cv_drive_id && !item.ai_score) {
                    let vacanteTitulo = "Vacante no especificada";
                    let vacanteDesc = "Busca en el CV las habilidades principales y resume el perfil.";
                    
                    if (item.vacante_id && typeof Engine_DB !== 'undefined') {
                         const vacanteRes = Engine_DB.read('Vacantes', item.vacante_id);
                         if (vacanteRes && vacanteRes.record) {
                             vacanteTitulo = vacanteRes.record.titulo || vacanteTitulo;
                             vacanteDesc = vacanteRes.record.descripcion || vacanteDesc;
                         }
                    }

                    const sysPrompt = "Eres un reclutador experto. Evalúa el CV provisto contra la descripción de la vacante. Responde estrictamente con un JSON con dos llaves: 'score' (número del 0 al 100 indicando afinidad) y 'summary' (texto breve justificando el score y resaltando pros/contras). No incluyas markdown, solo el JSON raw.";
                    const usrPrompt = `Vacante: ${vacanteTitulo}\nDescripción: ${vacanteDesc}\nPor favor evalúa el documento adjunto (CV del candidato).`;

                    const result = Engine_AI.callGemini(sysPrompt, usrPrompt, item.cv_drive_id);
                    
                    if (result && !result.error) {
                        item.ai_score = result.score;
                        item.ai_summary = result.summary;
                        if (typeof Logger !== 'undefined') Logger.log(`CV Evaluado: Score ${result.score}`);
                    }
                }
            });
        },

        /**
         * [GreatPeeps] CalendarInterview
         * Agenda entrevista en Google Calendar usando Engine_Calendar
         */
        CalendarInterview: function(entityName, items) {
            if (entityName !== 'Entrevistas') return;
            if (typeof Engine_Calendar === 'undefined') return;

            items.forEach(item => {
                if (item.calendar_event_id) return; // Ya está agendado
                if (!item.horario) return; // No hay horario

                try {
                    // Parse horario JSON generated by event_schedule component
                    const horario = typeof item.horario === 'string' ? JSON.parse(item.horario) : item.horario;
                    if (!horario.scheduled_start || !horario.scheduled_end) return;

                    let candidatoNombre = "Candidato";
                    let candidatoEmail = "";
                    let vacanteTitulo = "Vacante";

                    let cId = item.candidato_id;
                    if (Array.isArray(cId)) cId = cId[0];

                    if (cId && typeof Engine_DB !== 'undefined') {
                        const postRes = Engine_DB.read('Candidatos', cId);
                        if (postRes) {
                            candidatoNombre = postRes.nombre || candidatoNombre;
                            candidatoEmail = postRes.email || candidatoEmail;
                            
                            let vId = postRes.vacante_id;
                            if (Array.isArray(vId)) vId = vId[0];
                            if (vId) {
                                const vacRes = Engine_DB.read('Vacantes', vId);
                                if (vacRes) {
                                    vacanteTitulo = vacRes.titulo || vacanteTitulo;
                                }
                            }
                        }
                    }

                    const gm = String(item.generar_meet).toLowerCase();
                    const isMeet = (gm === 'true' || gm === 'on' || gm === '1' || item.generar_meet === true);

                    const payload = {
                        title: item.titulo ? `${item.titulo} (${candidatoNombre} - ${vacanteTitulo})` : `Entrevista GreatPeeps: ${candidatoNombre} - ${vacanteTitulo}`,
                        startTimeISO: horario.scheduled_start,
                        endTimeISO: horario.scheduled_end,
                        description: item.notas || "Entrevista agendada vía GreatPeeps.",
                        location: item.location_details || "",
                        attendees: candidatoEmail ? [candidatoEmail] : [],
                        meetingProvider: isMeet ? 'GOOGLE_MEET' : 'NONE'
                    };

                    const eventObj = Engine_Calendar.createEvent(payload);
                    
                    if (!eventObj || !eventObj.id) {
                        throw new Error("No se pudo crear el evento en el calendario.");
                    } else if (eventObj.id === "mock-event-id") {
                        console.warn("Evento MOCK generado (API deshabilitada).");
                    }
                    item.calendar_event_id = eventObj.htmlLink || eventObj.id;
                    
                    if (eventObj.meetLink) {
                        item.location_details = (item.location_details ? item.location_details + ' | ' : '') + 'Meet: ' + eventObj.meetLink;
                        item.meet_link = eventObj.meetLink; // <- Asignación del campo meet_link explícito
                    } else if (payload.meetingProvider === 'GOOGLE_MEET') {
                        item.location_details = (item.location_details ? item.location_details + ' | ' : '') + 'Meet Status: ' + eventObj.status + ' | Raw: ' + eventObj.raw;
                    }
                    
                    if (typeof Logger !== 'undefined') Logger.log(`Entrevista agendada: ${item.calendar_event_id}`);

                } catch(e) {
                    if (typeof Logger !== 'undefined') Logger.log(`Error agendando entrevista: ${e.message}`);
                }
            });
        },

        /**
         * WorkspacePreflightBlock
         * Actúa como Hard-Block en el backend. Si la sincronización de Workspace está deshabilitada,
         * aborta completamente la carga masiva (ETL) de Personas.
         */
        WorkspacePreflightBlock: function(entityName, items) {
            if (entityName !== 'Persona') return;
            
            if (typeof testWorkspaceConnection === 'function') {
                const connTest = testWorkspaceConnection();
                if (connTest && connTest.status === 'error') {
                    throw new Error("HARD BLOCK: Conexión a Workspace fallida o deshabilitada. Detalles: " + (connTest.message || "Desconocido"));
                }
            }
        },

        /**
         * HydrateWorkspace
         * Consulta la API de Workspace y enriquece el payload con los datos faltantes (Nombre, Cargo, Líder Directo, etc).
         * Funciona como la Capa 1 de validación antes de la generación de stubs/relaciones.
         */
        HydrateWorkspace: function(entityName, items) {
            if (entityName !== 'Persona') return;
            if (typeof resolverDirectorioWorkspace === 'undefined') return;
            
            items.forEach(item => {
                if (!item.email) return;

                const queryEmail = String(item.email).trim().toLowerCase();
                try {
                    const wsData = resolverDirectorioWorkspace(queryEmail);
                    if (wsData && wsData.__status !== 'DISABLED' && wsData.__status !== 'ERROR') {
                        // Rellenar datos si vienen vacíos desde el Excel/UI
                        if (!item.nombre && wsData.nombre) item.nombre = wsData.nombre;
                        if (!item.apellidos && wsData.apellidos) item.apellidos = wsData.apellidos;
                        if (!item.telefono && wsData.telefono) item.telefono = wsData.telefono;
                        if (!item.departamento && wsData.departamento) item.departamento = wsData.departamento;
                        if (!item.centro_costo && wsData.centro_costo) item.centro_costo = wsData.centro_costo;
                        if (!item.cargo && wsData.cargo) item.cargo = wsData.cargo;
                        if (!item.ubicacion && wsData.ubicacion) item.ubicacion = wsData.ubicacion;
                        if (!item.numero_empleado && wsData.numero_empleado) item.numero_empleado = wsData.numero_empleado;
                        if (!item.lider_directo && wsData.lider_directo) item.lider_directo = wsData.lider_directo;
                        if (!item.avatar && wsData.avatar) item.avatar = wsData.avatar;
                        
                        item.workspace_sync_status = 'synced';
                        if (typeof Logger !== 'undefined') Logger.log(`[HydrateWorkspace] Hidratado exitosamente: ${queryEmail}`);
                    } else {
                        item.workspace_sync_status = 'pending';
                        if (typeof Logger !== 'undefined') Logger.log(`[HydrateWorkspace] No encontrado o error en Workspace: ${queryEmail}`);
                    }
                } catch(e) {
                    if (typeof Logger !== 'undefined') Logger.log(`[HydrateWorkspace] Error al hidratar ${queryEmail}: ${e.message}`);
                }
            });
        },

        /**
         * AutoProvisionCargo
         */
        AutoProvisionCargo: function(entityName, items) {
            if (entityName !== 'Persona') return;
            _provisionStubs({
                items: items,
                targetEntity: 'Cargo',
                primaryKeyField: 'id_cargo',
                extractKeyFn: (p) => p.cargo !== undefined ? p.cargo : p.id_cargo,
                matchRecordFn: (row, headers, search) => {
                    const hExt = headers['id_externo_workspace'];
                    const hNom = headers['nombre'];
                    const vExt = hExt !== undefined ? String(row[hExt] || '').toLowerCase() : '';
                    const vNom = hNom !== undefined ? String(row[hNom] || '').replace(' (Por definir)', '').trim().toLowerCase() : '';
                    return vExt === search || vNom === search;
                },
                extractCacheValuesFn: (row, map) => {
                    if (!row.id_cargo) return;
                    if (row.nombre) map[String(row.nombre).replace(' (Por definir)', '').trim().toLowerCase()] = row.id_cargo;
                    if (row.id_externo_workspace) map[String(row.id_externo_workspace).trim().toLowerCase()] = row.id_cargo;
                },
                shouldCreateStubFn: (p) => !String(p.id_cargo || '').startsWith('CARG-'),
                stubFactory: (key) => {
                    const tempId = "CARG-" + (Math.random().toString(36).substring(2, 10).toUpperCase());
                    return {
                        id: tempId,
                        record: {
                            id_cargo: tempId,
                            nombre: key + " (Por definir)",
                            nivel: "Nivel Base",
                            id_externo_workspace: key,
                            estado: "Activo"
                        }
                    };
                },
                updatePayloadFn: (p, resolvedId) => p.id_cargo = resolvedId,
                logMessage: 'Se auto-generaron {N} cargos nuevos "Por definir" (Interceptor DRY).'
            });
            
            // [BUGFIX S45.3] Generar aristas CARGO_PERSONA para los items principales (los procesados por la ETL)
            let sysEdges = [];
            if (typeof Engine_DB !== 'undefined') sysEdges = Engine_DB.list('Sys_Graph_Edges', 'objects').rows || [];
            let edgesBatch = [];
            const sysDate = new Date().toISOString();
            items.forEach(p => {
                if (p.id_cargo) {
                    const childId = String(p.id_persona || p._tempId).trim();
                    if (!childId) return;
                    const edgeExists = sysEdges.some(e => e.es_version_actual !== false && e.tipo_relacion === "CARGO_PERSONA" && String(e.id_nodo_padre).trim() === String(p.id_cargo).trim() && String(e.id_nodo_hijo).trim() === childId);
                    if (!edgeExists) {
                        sysEdges.push({ es_version_actual: true, tipo_relacion: "CARGO_PERSONA", id_nodo_padre: p.id_cargo, id_nodo_hijo: childId });
                        edgesBatch.push({
                            id_relacion: "RELA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                            id_nodo_padre: p.id_cargo,
                            id_nodo_hijo: childId,
                            tipo_relacion: "CARGO_PERSONA",
                            valido_desde: sysDate,
                            valido_hasta: "",
                            es_version_actual: true,
                            estado: "Borrador"
                        });
                    }
                }
            });
            if (edgesBatch.length > 0 && typeof Engine_DB !== 'undefined') {
                try { Engine_DB.upsertBatch('Sys_Graph_Edges', edgesBatch, { muteTriggers: true }); } catch(e) {}
            }
        },

        /**
         * AutoProvisionLiderDirecto
         */
        AutoProvisionLiderDirecto: function(entityName, items) {
            if (entityName !== 'Persona') return;
            _provisionStubs({
                items: items,
                targetEntity: 'Persona',
                primaryKeyField: 'id_persona',
                extractKeyFn: (p) => p.lider_directo,
                matchRecordFn: (row, headers, search) => {
                    const hEmail = headers['email'];
                    return hEmail !== undefined && String(row[hEmail] || '').trim().toLowerCase() === search;
                },
                extractCacheValuesFn: (row, map) => {
                    if (row.email && row.id_persona) map[String(row.email).trim().toLowerCase()] = row.id_persona;
                },
                recursiveFactory: (initialEmail, map, cache) => {
                    let records = [];
                    let currentEmail = String(initialEmail).trim();
                    
                    while (currentEmail && currentEmail !== '' && currentEmail !== '---') {
                        const normKey = currentEmail.toLowerCase();
                        if (map[normKey] || cache[normKey]) {
                            break; 
                        }

                        // Check DB Cache for existing record (to prevent duplicates if they were not in memoryMap)
                        if (typeof Engine_DB !== 'undefined') {
                            try {
                                const dbRes = Engine_DB.list('Persona', 'objects', { skipCache: true });
                                const found = (dbRes && dbRes.rows ? dbRes.rows : []).find(p => String(p.email).trim().toLowerCase() === normKey);
                                if (found && found.id_persona) {
                                    map[normKey] = found.id_persona;
                                    break;
                                }
                            } catch(e) {}
                        }
                        
                        let wsData = null;
                        if (typeof resolverDirectorioWorkspace !== 'undefined') {
                            try { wsData = resolverDirectorioWorkspace(currentEmail); } catch(e) {}
                        }
                        
                        const tempId = "PERS-" + (Math.random().toString(36).substring(2, 10).toUpperCase());

                        if (wsData && wsData.__status !== 'DISABLED' && wsData.__status !== 'ERROR') {
                            const newRecord = {
                                id_persona: tempId,
                                email: currentEmail,
                                nombre: wsData.nombre || '---',
                                apellidos: wsData.apellidos || '---',
                                telefono: wsData.telefono || '---',
                                departamento: wsData.departamento || '---',
                                centro_costo: wsData.centro_costo || '---',
                                cargo: wsData.cargo || '---',
                                ubicacion: wsData.ubicacion || '---',
                                numero_empleado: wsData.numero_empleado || '---',
                                lider_directo: wsData.lider_directo || '',
                                avatar: wsData.avatar || '',
                                estado: "Activo",
                                workspace_sync_status: 'synced' 
                            };
                            records.push(newRecord);
                            cache[normKey] = tempId;
                            map[normKey] = tempId;
                            currentEmail = wsData.lider_directo;
                        } else {
                            const stubRecord = {
                                id_persona: tempId,
                                email: currentEmail,
                                nombre: currentEmail.split('@')[0] + " (Pendiente Sync)",
                                estado: "Activo",
                                workspace_sync_status: 'pending'
                            };
                            records.push(stubRecord);
                            cache[normKey] = tempId;
                            map[normKey] = tempId;
                            break; 
                        }
                    }
                    
                    // Si encontramos cargos nuevos, llamamos al interceptor manualmente para provisionarlos
                    if (records.length > 0 && typeof INTERCEPTORS.AutoProvisionCargo === 'function') {
                        INTERCEPTORS.AutoProvisionCargo('Persona', records);
                    }

                    // [Bugfix S45.2] Generar las aristas CARGO_PERSONA y PERSONA_LIDER_DIRECTO para los líderes
                    let edgesBatch = [];
                    const sysDate = new Date().toISOString();
                    records.forEach(r => {
                        if (r.id_cargo) {
                            edgesBatch.push({
                                id_relacion: "RELA-" + (Math.random().toString(36).substring(2, 10).toUpperCase()),
                                id_nodo_padre: r.id_cargo,
                                id_nodo_hijo: r.id_persona,
                                tipo_relacion: "CARGO_PERSONA",
                                valido_desde: sysDate,
                                valido_hasta: "",
                                es_version_actual: true,
                                estado: "Borrador"
                            });
                        }
                        if (r.lider_directo) {
                            const liderStr = String(r.lider_directo).trim();
                            const liderEmailNorm = liderStr.toLowerCase();
                            const liderUUID = map[liderEmailNorm] || cache[liderEmailNorm] || liderStr;
                            edgesBatch.push({
                                id_relacion: "RELA-" + (Math.random().toString(36).substring(2, 10).toUpperCase()),
                                id_nodo_padre: liderUUID,
                                id_nodo_hijo: r.id_persona,
                                tipo_relacion: "PERSONA_LIDER_DIRECTO",
                                valido_desde: sysDate,
                                valido_hasta: "",
                                es_version_actual: true,
                                estado: "Borrador"
                            });
                        }
                    });

                    if (edgesBatch.length > 0 && typeof Engine_DB !== 'undefined') {
                        try { Engine_DB.upsertBatch('Sys_Graph_Edges', edgesBatch, { muteTriggers: true }); } catch(e) {}
                    }

                    return records;
                },
                updatePayloadFn: (p, resolvedId) => p.lider_directo = resolvedId,
                logMessage: 'Se auto-generaron e hidrataron {N} líderes recursivamente (Interceptor DRY).'
            });

            // [BUGFIX S45.3] Generar aristas PERSONA_LIDER_DIRECTO para los items principales (los procesados por la ETL)
            let sysEdges = [];
            if (typeof Engine_DB !== 'undefined') sysEdges = Engine_DB.list('Sys_Graph_Edges', 'objects').rows || [];
            let edgesBatch = [];
            const sysDate = new Date().toISOString();
            items.forEach(p => {
                if (p.lider_directo) {
                    const childId = String(p.id_persona || p._tempId).trim();
                    if (!childId) return;
                    const edgeExists = sysEdges.some(e => e.es_version_actual !== false && e.tipo_relacion === "PERSONA_LIDER_DIRECTO" && String(e.id_nodo_padre).trim() === String(p.lider_directo).trim() && String(e.id_nodo_hijo).trim() === childId);
                    if (!edgeExists) {
                        sysEdges.push({ es_version_actual: true, tipo_relacion: "PERSONA_LIDER_DIRECTO", id_nodo_padre: p.lider_directo, id_nodo_hijo: childId });
                        edgesBatch.push({
                            id_relacion: "RELA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                            id_nodo_padre: p.lider_directo,
                            id_nodo_hijo: childId,
                            tipo_relacion: "PERSONA_LIDER_DIRECTO",
                            valido_desde: sysDate,
                            valido_hasta: "",
                            es_version_actual: true,
                            estado: "Borrador"
                        });
                    }
                }
            });
            if (edgesBatch.length > 0 && typeof Engine_DB !== 'undefined') {
                try { Engine_DB.upsertBatch('Sys_Graph_Edges', edgesBatch, { muteTriggers: true }); } catch(e) {}
            }
        },

        /**
         * AutoProvisionEntityRoles
         * Auto-provisiona Roles y genera aristas PERSONA_ROL basados en campos de asignación de entidades (Portafolio, Equipo, etc.)
         */
        AutoProvisionEntityRoles: function(entityName, items) {
            const ROLE_MAPPINGS = {
                Value_Stream: [
                    { field: 'dueno_vs_id', nombre: 'Dueño del Value Stream', nombre_ingles: 'Value Stream Owner', color_icono: 'tertiary', especialidad: 'Negocio', pk: 'id_value_stream' },
                    { field: 'head_of_technology_id', nombre: 'Head of Technology', nombre_ingles: 'Head of Technology', color_icono: 'dark', especialidad: 'Tecnología', pk: 'id_value_stream' },
                    { field: 'head_of_product_id', nombre: 'Head of Product', nombre_ingles: 'Head of Product', color_icono: 'primary', especialidad: 'Producto', pk: 'id_value_stream' },
                    { field: 'agile_coach_id', nombre: 'Agile Coach', nombre_ingles: 'Agile Coach', color_icono: 'warning', especialidad: 'Agilidad', pk: 'id_value_stream' }
                ],
                Portafolio: [{ field: 'gerente_portafolio_id', nombre: 'Gerente de Portafolio', nombre_ingles: 'Portfolio Manager', color_icono: 'danger', especialidad: 'Negocio', pk: 'id_portafolio' }],
                Grupo_Productos: [{ field: 'gerente_producto_id', nombre: 'Gerente de Producto', nombre_ingles: 'Product Manager', color_icono: 'dark', especialidad: 'Producto', pk: 'id_grupo_producto' }],
                Dominio: [
                    { field: 'gerente_dominio_id', nombre: 'Responsable de Dominio', nombre_ingles: 'Domain Owner', color_icono: 'primary', especialidad: 'Producto', pk: 'id_dominio' },
                    { field: 'rte_id', nombre: 'Release Train Engineer', nombre_ingles: 'Release Train Engineer', color_icono: 'warning', especialidad: 'Agilidad', pk: 'id_dominio' },
                    { field: 'gerente_ti_id', nombre: 'Gerente de TI', nombre_ingles: 'IT Manager', color_icono: 'dark', especialidad: 'Tecnología', pk: 'id_dominio' }
                ],
                Equipo: [
                    { field: 'product_owner_id', nombre: 'Dueño de Producto', nombre_ingles: 'Product Owner', color_icono: 'success', especialidad: 'Producto', pk: 'id_equipo' },
                    { field: 'scrum_master_id', nombre: 'Team Coach', nombre_ingles: 'Scrum Master', color_icono: 'warning', especialidad: 'Proceso', pk: 'id_equipo' },
                    { field: 'technical_lead_id', nombre: 'Líder Técnico', nombre_ingles: 'Technical Lead', color_icono: 'dark', especialidad: 'Tecnología', pk: 'id_equipo' }
                ]
            };

            const mappings = ROLE_MAPPINGS[entityName];
            if (!mappings || mappings.length === 0) return;

            let dbRoles = {};
            if (typeof Engine_DB !== 'undefined') {
                const res = Engine_DB.list('Rol', 'objects', { skipCache: true });
                if (res && res.rows) {
                    res.rows.forEach(r => {
                        dbRoles[String(r.nombre).trim().toLowerCase()] = r.id_rol;
                    });
                }
            }

            let sysEdges = [];
            if (typeof Engine_DB !== 'undefined') {
                sysEdges = Engine_DB.list('Sys_Graph_Edges', 'objects').rows || [];
            }

            let edgesBatch = [];
            const sysDate = new Date().toISOString();

            items.forEach(p => {
                mappings.forEach(mapping => {
                    const personIdRaw = p[mapping.field];
                    const targetObj = Array.isArray(personIdRaw) ? personIdRaw[0] : personIdRaw;
                    const personId = (typeof targetObj === 'object' && targetObj !== null) 
                        ? (targetObj.id_registro || targetObj.id || targetObj.value) 
                        : targetObj;

                    if (personId && String(personId).trim() !== '' && String(personId).trim() !== '[object Object]') {
                        const normName = mapping.nombre.toLowerCase();
                        let targetRoleId = dbRoles[normName];
                        
                        if (!targetRoleId) {
                            targetRoleId = "ROLE-" + Math.random().toString(36).substring(2, 10).toUpperCase();
                            let stubRole = {
                                id_rol: targetRoleId,
                                nombre: mapping.nombre,
                                nombre_ingles: mapping.nombre_ingles,
                                color_icono: mapping.color_icono,
                                especialidad: mapping.especialidad,
                                estado: "Activo"
                            };
                            if (typeof Engine_DB !== 'undefined') {
                                try { 
                                    Engine_DB.upsertBatch('Rol', [stubRole], { muteTriggers: true }); 
                                } catch(e) {
                                    if (typeof console !== 'undefined') console.error(`Error persistiendo rol ${mapping.nombre}: ${e.message}`);
                                    return;
                                }
                            }
                            dbRoles[normName] = targetRoleId;
                        }
                        
                        const childId = String(personId).trim();
                        const contextoId = String(p[mapping.pk] || p._tempId || '').trim();

                        // Para PERSONA_ROL, el nodo padre es el Rol y el nodo hijo es la Persona.
                        const edgeExists = sysEdges.some(e => e.es_version_actual !== false && e.tipo_relacion === 'PERSONA_ROL' && String(e.id_nodo_padre).trim() === targetRoleId && String(e.id_nodo_hijo).trim() === childId && String(e.contexto_id || '').trim() === contextoId);
                        
                        if (!edgeExists) {
                            sysEdges.push({ es_version_actual: true, tipo_relacion: 'PERSONA_ROL', id_nodo_padre: targetRoleId, id_nodo_hijo: childId, contexto_id: contextoId });
                            edgesBatch.push({
                                id_relacion: "RELA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                                id_nodo_padre: targetRoleId,
                                id_nodo_hijo: childId,
                                tipo_relacion: 'PERSONA_ROL',
                                contexto_id: contextoId,
                                valido_desde: sysDate,
                                valido_hasta: "",
                                es_version_actual: true,
                                estado: "Borrador"
                            });
                        }
                    }
                });
            });

            if (edgesBatch.length > 0 && typeof Engine_DB !== 'undefined') {
                try { 
                    Engine_DB.upsertBatch('Sys_Graph_Edges', edgesBatch, { muteTriggers: true }); 
                    if (typeof Logger !== 'undefined') Logger.log(`Se generaron ${edgesBatch.length} relaciones PERSONA_ROL para ${mapping.nombre}.`);
                } catch(e) {
                    if (typeof console !== 'undefined') console.error(`[CRITICAL] Error persistiendo aristas PERSONA_ROL: ${e.message}`);
                }
            }
        },

        /**
         * AutoLinkAgileRoles
         * Mapea roles ágiles desde el payload de Persona hacia las relaciones específicas de Equipo.
         */
        AutoLinkAgileRoles: function(entityName, items) {
            if (entityName !== 'Persona') return;

            let dbEquipos = {};
            let sysEdges = [];

            if (typeof Engine_DB !== 'undefined') {
                const resEquipos = Engine_DB.list('Equipo', 'objects', { skipCache: true });
                if (resEquipos && resEquipos.rows) {
                    resEquipos.rows.forEach(r => dbEquipos[String(r.nombre).trim().toLowerCase()] = r.id_equipo);
                }
                sysEdges = Engine_DB.list('Sys_Graph_Edges', 'objects').rows || [];
            }

            let edgesBatch = [];
            const sysDate = new Date().toISOString();

            function toTitleCase(str) {
                return str.toLowerCase().replace(/(?:^|[\s,\-\/])\w/g, match => match.toUpperCase());
            }

            function addEdge(edgeType, parentId, childId, contextoId, edgeEstado) {
                const exists = sysEdges.some(e => e.es_version_actual !== false && e.tipo_relacion === edgeType && String(e.id_nodo_padre).trim() === parentId && String(e.id_nodo_hijo).trim() === childId && String(e.contexto_id || '').trim() === contextoId);
                if (!exists) {
                    sysEdges.push({ es_version_actual: true, tipo_relacion: edgeType, id_nodo_padre: parentId, id_nodo_hijo: childId, contexto_id: contextoId });
                    edgesBatch.push({
                        id_relacion: "RELA-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
                        id_nodo_padre: parentId,
                        id_nodo_hijo: childId,
                        tipo_relacion: edgeType,
                        contexto_id: contextoId,
                        valido_desde: sysDate,
                        valido_hasta: "",
                        es_version_actual: true,
                        estado: edgeEstado
                    });
                }
            }

            items.forEach(p => {
                if (!p.roles_asignados || !p.equipo) return;
                
                const rolesRaw = String(p.roles_asignados).split(',').map(r => r.trim().toLowerCase());
                const equiposRaw = String(p.equipo).split(',').map(e => e.trim().toLowerCase());

                const isPO = rolesRaw.includes('dueño de producto') || rolesRaw.includes('product owner');
                const isSM = rolesRaw.includes('scrum master') || rolesRaw.includes('team coach');
                const isRTE = rolesRaw.includes('release train engineer') || rolesRaw.includes('rte') || rolesRaw.includes('release train engineer (rte)');

                if (!isPO && !isSM && !isRTE) return;

                const childId = String(p.id_persona || p._tempId).trim();
                const contextoId = String(p._contexto_arista || '').trim();
                const edgeEstado = String(p._estado_arista || 'Activo').trim();

                equiposRaw.forEach(equipoNorm => {
                    if (equipoNorm === '') return;
                    let targetEquipoId = dbEquipos[equipoNorm];
                    
                    if (!targetEquipoId) {
                        targetEquipoId = 'EQUI-' + Math.random().toString(36).substring(2, 10).toUpperCase();
                        const stubEquipo = {
                            id_equipo: targetEquipoId,
                            nombre: toTitleCase(equipoNorm) + " (Por definir)",
                            estado: "Activo"
                        };
                        if (typeof Engine_DB !== 'undefined') {
                            try { Engine_DB.upsertBatch('Equipo', [stubEquipo], { muteTriggers: true }); } catch(e) {}
                        }
                        dbEquipos[equipoNorm] = targetEquipoId;
                    }

                    if (isPO) addEdge('EQUIPO_PO', targetEquipoId, childId, contextoId, edgeEstado);
                    if (isSM) addEdge('EQUIPO_SM', targetEquipoId, childId, contextoId, edgeEstado);
                    if (isRTE) addEdge('EQUIPO_RTE', targetEquipoId, childId, contextoId, edgeEstado);
                });
            });

            if (edgesBatch.length > 0 && typeof Engine_DB !== 'undefined') {
                try { 
                    Engine_DB.upsertBatch('Sys_Graph_Edges', edgesBatch, { muteTriggers: true }); 
                    if (typeof Logger !== 'undefined') Logger.log(`Se generaron ${edgesBatch.length} relaciones de Roles Agiles para Personas.`);
                } catch(e) {
                    if (typeof console !== 'undefined') console.error(`[CRITICAL] Error persistiendo aristas de Roles Agiles: ${e.message}`);
                }
            }
        },

    };

    function apply(entityName, items) {
        if (!items || items.length === 0) return;
        if (typeof getAppSchema === 'undefined') return;

        const schema = getAppSchema(entityName);
        
        // 1. Ejecutar Interceptores Tradicionales
        if (schema && schema.mutationInterceptors && Array.isArray(schema.mutationInterceptors)) {
            schema.mutationInterceptors.forEach(interceptorName => {
                if (typeof INTERCEPTORS[interceptorName] === 'function') {
                    if (typeof Logger !== 'undefined') Logger.log(`[Interceptor] Ejecutando ${interceptorName} para ${entityName} (${items.length} items)`);
                    INTERCEPTORS[interceptorName](entityName, items);
                }
            });
        }

        // 2. Ejecutar Provisión Relacional Dinámica (Schema-Driven)
        if (schema && schema.relationalProvisioners && Array.isArray(schema.relationalProvisioners)) {
            schema.relationalProvisioners.forEach(config => {
                if (typeof Logger !== 'undefined') Logger.log(`[RelationalProvisioner] Procesando aristas ${config.edgeType} para ${entityName} (${items.length} items)`);
                _provisionRelationalStubs(entityName, items, config);
            });
        }
    }

    return { apply: apply };
})();

if (typeof module !== 'undefined') {
    module.exports = { Business_Interceptors };
}
