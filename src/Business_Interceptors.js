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
                const res = Adapter_Sheets.list(config.targetEntity, { rawFilterFn: rawFilter, limit: 1 });
                if (res && res.rows && res.rows.length > 0) {
                    config.extractCacheValuesFn(res.rows[0], memoryMap);
                }
            }
        } else {
            if (typeof Engine_DB !== 'undefined') {
                const res = Engine_DB.list(config.targetEntity, 'objects');
                const all = (res && res.rows) ? res.rows : [];
                all.forEach(r => config.extractCacheValuesFn(r, memoryMap));
            }
        }

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

    const INTERCEPTORS = {
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
                    
                    while (currentEmail && currentEmail !== '') {
                        const normKey = currentEmail.toLowerCase();
                        if (map[normKey] || cache[normKey]) {
                            break; 
                        }

                        // Check DB Cache for existing record (to prevent duplicates if they were not in memoryMap)
                        if (typeof Engine_DB !== 'undefined') {
                            try {
                                const dbRes = Engine_DB.list('Persona', 'objects');
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
                                estado: "Activo"
                            });
                        }
                        if (r.lider_directo) {
                            const liderEmailNorm = String(r.lider_directo).trim().toLowerCase();
                            const liderUUID = map[liderEmailNorm] || cache[liderEmailNorm] || liderEmailNorm;
                            edgesBatch.push({
                                id_relacion: "RELA-" + (Math.random().toString(36).substring(2, 10).toUpperCase()),
                                id_nodo_padre: liderUUID,
                                id_nodo_hijo: r.id_persona,
                                tipo_relacion: "PERSONA_LIDER_DIRECTO",
                                valido_desde: sysDate,
                                valido_hasta: "",
                                es_version_actual: true,
                                estado: "Activo"
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
        }
    };

    function apply(entityName, items) {
        if (!items || items.length === 0) return;
        if (typeof getAppSchema === 'undefined') return;

        const schema = getAppSchema(entityName);
        if (schema && schema.mutationInterceptors && Array.isArray(schema.mutationInterceptors)) {
            schema.mutationInterceptors.forEach(interceptorName => {
                if (typeof INTERCEPTORS[interceptorName] === 'function') {
                    if (typeof Logger !== 'undefined') Logger.log(`[Interceptor] Ejecutando ${interceptorName} para ${entityName} (${items.length} items)`);
                    INTERCEPTORS[interceptorName](entityName, items);
                }
            });
        }
    }

    return { apply: apply };
})();

if (typeof module !== 'undefined') {
    module.exports = { Business_Interceptors };
}
