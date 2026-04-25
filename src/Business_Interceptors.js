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
                        const stub = config.stubFactory(String(rawKey).trim());
                        batchToCreate.push(stub.record);
                        createdCache[normKey] = stub.id;
                        resolvedId = stub.id;
                        memoryMap[normKey] = stub.id;
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
                    if (row.email) map[String(row.email).trim().toLowerCase()] = row.email;
                },
                stubFactory: (key) => ({
                    id: key, // Usamos el email como ID
                    record: {
                        id_persona: key,
                        email: key,
                        nombre: key.split('@')[0] + " (Pendiente Sync)",
                        estado: "Activo",
                        workspace_sync_status: 'pending'
                    }
                }),
                logMessage: 'Se auto-generaron {N} líderes stubs "Pendiente Sync" (Interceptor DRY).'
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
