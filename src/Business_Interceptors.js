/**
 * Business_Interceptors.gs
 * Capa de abstracción para reglas de negocio previas a la persistencia en DB.
 * Maneja lógicas como el Auto-Provisionamiento de entidades hijas.
 */

var Business_Interceptors = (function() {

    const INTERCEPTORS = {
        /**
         * AutoProvisionCargo
         * Resuelve cargos virtuales desde strings crudos. Genera Cargos temporales 
         * si no existen, garantizando que Engine_DB siempre reciba IDs válidos.
         */
        AutoProvisionCargo: function(entityName, items) {
            if (entityName !== 'Persona' || !items || items.length === 0) return;

            let cargoExternoMap = {};
            let batchCargosToCreate = [];
            let createdCargosCache = {};

            // Optimización de Memoria (S44.18/S44.14)
            if (items.length === 1) {
                // Mutación atómica (1 registro): Solo buscamos coincidencia exacta mediante rawFilter
                const rawCargo = items[0].cargo !== undefined ? items[0].cargo : items[0].id_cargo;
                if (rawCargo && typeof Engine_DB !== 'undefined' && typeof Adapter_Sheets !== 'undefined') {
                    const normalizedSearch = String(rawCargo).trim().toLowerCase();
                    const rawFilter = (rowArray, headerMap) => {
                        const hIdExt = headerMap['id_externo_workspace'];
                        const hNombre = headerMap['nombre'];
                        const valExt = hIdExt !== undefined ? String(rowArray[hIdExt] || '').toLowerCase() : '';
                        const valNom = hNombre !== undefined ? String(rowArray[hNombre] || '').replace(' (Por definir)', '').trim().toLowerCase() : '';
                        return valExt === normalizedSearch || valNom === normalizedSearch;
                    };
                    const cargoList = Adapter_Sheets.list('Cargo', { rawFilterFn: rawFilter, limit: 1 });
                    if (cargoList && cargoList.rows && cargoList.rows.length > 0) {
                        const c = cargoList.rows[0];
                        if (c.nombre) cargoExternoMap[String(c.nombre).replace(' (Por definir)', '').trim().toLowerCase()] = c.id_cargo;
                        if (c.id_externo_workspace) cargoExternoMap[String(c.id_externo_workspace).trim().toLowerCase()] = c.id_cargo;
                    }
                }
            } else {
                // Sincronización Masiva (N registros): Cargamos todo el catálogo a memoria para O(1)
                if (typeof Engine_DB !== 'undefined') {
                    const cargoList = Engine_DB.list('Cargo', 'objects');
                    const allCargos = (cargoList && cargoList.rows) ? cargoList.rows : [];
                    allCargos.forEach(c => {
                        if (c.id_cargo) {
                            if (c.nombre) cargoExternoMap[String(c.nombre).replace(' (Por definir)', '').trim().toLowerCase()] = c.id_cargo;
                            if (c.id_externo_workspace) cargoExternoMap[String(c.id_externo_workspace).trim().toLowerCase()] = c.id_cargo;
                        }
                    });
                }
            }

            // Aplicar lógica
            items.forEach(payload => {
                const rawCargo = payload.cargo !== undefined ? payload.cargo : payload.id_cargo;
                if (rawCargo !== undefined && rawCargo !== null && rawCargo !== '') {
                    const rawKey = String(rawCargo).trim();
                    const normalizedKey = rawKey.toLowerCase();
                    if (cargoExternoMap[normalizedKey]) {
                        payload.id_cargo = cargoExternoMap[normalizedKey];
                    } else if (!String(payload.id_cargo || '').startsWith('CARG-')) {
                        if (!createdCargosCache[normalizedKey]) {
                            const tempCargoId = "CARG-" + (Math.random().toString(36).substring(2, 10).toUpperCase());
                            batchCargosToCreate.push({
                                id_cargo: tempCargoId,
                                nombre: rawKey + " (Por definir)",
                                nivel: "Nivel Base",
                                id_externo_workspace: rawKey,
                                estado: "Activo"
                            });
                            createdCargosCache[normalizedKey] = tempCargoId;
                            payload.id_cargo = tempCargoId;
                            cargoExternoMap[normalizedKey] = tempCargoId;
                        } else {
                            payload.id_cargo = createdCargosCache[normalizedKey];
                        }
                    }
                }
            });

            // Commit batch creations before closing pipeline
            if (batchCargosToCreate.length > 0 && typeof Engine_DB !== 'undefined') {
                try {
                    Engine_DB.upsertBatch('Cargo', batchCargosToCreate, { muteTriggers: true });
                    if (typeof Logger !== 'undefined') Logger.log(`Se auto-generaron ${batchCargosToCreate.length} cargos nuevos "Por definir" (Interceptor).`);
                } catch(e) {
                    if (typeof Logger !== 'undefined') Logger.log("Error creando batch de cargos en interceptor: " + e.message);
                }
            }
        }
    };

    /**
     * apply
     * Invoca secuencialmente todos los interceptores declarados en el esquema de la entidad.
     */
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

    return {
        apply: apply
    };

})();

// Export for Node.js environments (Jest)
if (typeof module !== 'undefined') {
    module.exports = { Business_Interceptors };
}
