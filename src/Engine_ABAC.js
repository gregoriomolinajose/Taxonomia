/**
 * Motor de Control de Acceso Basado en Atributos Topológicos (ABAC)
 * Resuelve la jerarquía de pertenencia en tiempo real para el empleado activo.
 */

const Engine_ABAC = {
  // Caché efímera que sobrevive únicamente durante el tiempo de ejecución de la petición actual
  _requestCache: {},
  
  _getCachedData: function(entityName) {
    if (!this._requestCache[entityName]) {
      const dbResponse = Engine_DB.list(entityName, 'objects');
      this._requestCache[entityName] = (dbResponse && dbResponse.rows) ? dbResponse.rows : [];
    }
    return this._requestCache[entityName];
  },

  _queryWithFallback: function(entName, fieldName, value) {
    const cacheKey = `query_${entName}_${fieldName}_${value}`;
    
    // L1: Caché efímera en memoria (per-request)
    if (this._requestCache[cacheKey]) {
        return this._requestCache[cacheKey];
    }
    
    // L2: CacheService compartida (cross-request)
    // Se cambia a ABAC_V3 para invalidar cachés corruptos/vacíos que duraban 5 mins.
    const l2Key = `ABAC_V3_${cacheKey}`.substring(0, 250);
    if (typeof CacheService !== 'undefined') {
        try {
            const cache = CacheService.getScriptCache();
            const cached = cache.get(l2Key);
            if (cached) {
                const parsed = JSON.parse(cached);
                this._requestCache[cacheKey] = parsed; // Hidratar L1
                return parsed;
            }
        } catch (e) {
            if (typeof Logger !== 'undefined') Logger.log(`[ABAC_L2] Error leyendo caché L2: ${e.message}`);
        }
    }

    // L3: Live DB Query (GViz)
    let rows = [];
    if (typeof Engine_DB !== 'undefined' && typeof Engine_DB.listBy === 'function') {
        try {
            const dbRes = Engine_DB.listBy(entName, fieldName, value, { caseInsensitive: true });
            if (dbRes && dbRes.rows) rows = dbRes.rows;
        } catch (e) {
            if (typeof Logger !== 'undefined') Logger.log(`[ABAC_GViz] Fallback a caché para ${entName}. Error GViz: ${e.message}`);
            const allRows = this._getCachedData(entName) || [];
            rows = allRows.filter(r => String(r[fieldName]).toLowerCase() === String(value).toLowerCase());
        }
    } else {
        const allRows = this._getCachedData(entName) || [];
        rows = allRows.filter(r => String(r[fieldName]).toLowerCase() === String(value).toLowerCase());
    }
    
    // Hidratar L1 y L2
    this._requestCache[cacheKey] = rows;
    if (typeof CacheService !== 'undefined') {
        try {
            const cache = CacheService.getScriptCache();
            const payload = JSON.stringify(rows);
            // Máximo 100KB en CacheService
            if (payload.length < 100000) {
                cache.put(l2Key, payload, 300); // TTL: 5 minutos
            }
        } catch (e) {
            if (typeof Logger !== 'undefined') Logger.log(`[ABAC_L2] Error escribiendo caché L2: ${e.message}`);
        }
    }
    
    return rows;
  },

  _getCachedTopology: function(email) {
    const key = "topology_" + email;
    if (!this._requestCache[key]) {
      this._requestCache[key] = this.resolveTopologyFor(email);
    }
    return this._requestCache[key];
  },

  /**
   * Procesa la Taxonomía para un email dado y devuelve los Nodos de los que es Dueño
   * o Miembro.
   * @param {string} email - Correo del usuario a consultar
   * @returns {Object} ABAC Context con arrays ownerOf y memberOf
   */
  resolveTopologyFor: function(email) {
    if (!email) return { ownerOf: [], memberOf: [] };
    
    // 1. Obtener la Persona (Identidad) asociada al Correo
    // Se usa GViz para evitar Full Table Scan de miles de empleados
    const _email = email.trim().toLowerCase();
    const personaRows = this._queryWithFallback('Persona', 'email', _email);
    // Soporte legacy por si el campo principal es 'correo' en esquemas viejos
    const persona = personaRows.length > 0 ? personaRows[0] : (this._queryWithFallback('Persona', 'correo', _email)[0] || null);
    
    if (!persona) {
      // Usuario no registrado en el grafo. Devuelve permisos nulos.
      return { ownerOf: [], memberOf: [], permissions: {}, hasRole: false };
    }
    
    let abacContext = {
      ownerOf: [],
      memberOf: [],
      permissions: {},
      hasRole: false
    };
    
    // Inyección del diccionario CUD de la matriz para el Frontend (S18.4)
    if (persona.id_rol) {
      abacContext.hasRole = true;
      const misReglas = this._queryWithFallback('Sys_Permissions', 'id_rol', persona.id_rol);
      misReglas.forEach(r => {
        abacContext.permissions[r.schema_destino] = r.nivel_acceso;
      });
    }
    
    const personaId = persona.email || persona.numero_empleado || persona.id_persona || persona.id;
    if (!personaId) return abacContext;

    // --- S18.3: HIERARCHICAL ESCALATION MODULE (Top-Down BFS) ---
    // Mantenemos un Set 'ownerSet' como registro de visitados y escudo anti-ciclos.
    let ownerSet = new Set();
    let bfsQueue = [];

    const getPkField = (schema, entName) => schema.primaryKey || (schema.metadata && schema.metadata.idField) || `id_${entName.toLowerCase()}`;

    // Paso 1: Base Ownership (¿Dónde soy dueño directo de manera explícita?)
    if (typeof APP_SCHEMAS !== 'undefined') {
        Object.keys(APP_SCHEMAS).forEach(entName => {
            const schema = APP_SCHEMAS[entName];
            if (schema.topological_metadata && Array.isArray(schema.topological_metadata.ownerFields)) {
                const pkField = getPkField(schema, entName);
                
                schema.topological_metadata.ownerFields.forEach(ownerField => {
                    const rows = this._queryWithFallback(entName, ownerField, personaId);
                    
                    rows.forEach(row => {
                        const rowId = String(row[pkField]);
                        if (rowId && rowId !== 'undefined' && !ownerSet.has(rowId)) {
                            ownerSet.add(rowId);
                            bfsQueue.push({ entity: entName, id: rowId });
                        }
                    });
                });
            }
        });

        // Paso 2: Cascaded Ownership (Travesía en Anchura para descender por el árbol FK)
        let safeLoopBrake = 0;
        
        while (bfsQueue.length > 0 && safeLoopBrake < 50000) {
            safeLoopBrake++;
            const current = bfsQueue.shift();
            
            Object.keys(APP_SCHEMAS).forEach(childEntName => {
                const childSchema = APP_SCHEMAS[childEntName];
                // Buscamos hijos que declaren formalmente a nuestra Entidad Actual como Padre
                if (childSchema.topological_metadata && childSchema.topological_metadata.parentEntity === current.entity) {
                    const parentField = childSchema.topological_metadata.parentField;
                    if (!parentField) return;

                    const childPkField = getPkField(childSchema, childEntName);
                    
                    // ENTERPRISE SCALABILITY REFACTOR:
                    // En lugar de descargar todo el arreglo (Full Table Scan O(N)) y filtrarlo en memoria,
                    // le pedimos a la DB (vía GViz API) que nos devuelva exclusivamente los hijos relevantes mediante el helper unificado.
                    const childRows = this._queryWithFallback(childEntName, parentField, current.id);
                    
                    childRows.forEach(childRow => {
                        // Mantenemos la aserción estricta por seguridad y compatibilidad con el fallback
                        if (String(childRow[parentField]) === current.id) {
                            const childId = String(childRow[childPkField]);
                            // Shield: Detección de Ciclo O(1). Si el nodo ya fue visitado en la cascada, lo ignora (Rompe los infinite loops).
                            if (childId && childId !== 'undefined' && !ownerSet.has(childId)) {
                                ownerSet.add(childId);
                                bfsQueue.push({ entity: childEntName, id: childId });
                            }
                        }
                    });
                }
            });
        }
        
        if (safeLoopBrake >= 50000 && typeof Logger !== 'undefined') {
            Logger.log("[Engine_ABAC] Alarma Topológica: Ruptura de seguridad (timeout brake) activada en cascada BFS.");
        }
    }

    // Convertir de regreso a arreglos serializables.
    // Propiedades explícitas o por herencia topológica garantizan estatus CUD
    abacContext.ownerOf = Array.from(ownerSet);
    abacContext.memberOf = Array.from(ownerSet);

    return abacContext;
  },

  /**
   * Middleware de Validación (Guard)
   * Evalúa si un usuario tiene privilegios para realizar una acción CUD sobre una entidad.
   * Depende jerárquicamente de las reglas dictadas en Sys_Permissions.
   * 
   * @param {string} email - Identidad del usuario
   * @param {string} action - 'create', 'update', 'delete'
   * @param {string} entityName - Nombre de la entidad (ej. 'Equipo', 'Grupo_Productos')
   * @param {string} targetId - ID del registro que será mutado (en caso de update/delete)
   * @returns {boolean} true si la acción está permitida, false abortará la I/O
   */
  validatePermission: function(email, action, entityName, targetId) {
    if (!email) return false;
    
    // Ignorar sistema y lecturas para este Firewall de mutaciones
    if (action === 'read') return true;
    
    const _email = email.trim().toLowerCase();
    const personaRows = this._queryWithFallback('Persona', 'email', _email);
    const persona = personaRows.length > 0 ? personaRows[0] : (this._queryWithFallback('Persona', 'correo', _email)[0] || null);

    // Usuario desconocido -> Fail Close estricto (Zero Match)
    if (!persona) {
      // Todo usuario debe tener representación en la BD para mutar.
      return false;
    }
    
    const roleId = persona.id_rol; 
    
    // Si la persona no tiene rol explícito asignado, opera el principio de Mínimo Privilegio (Solo Lectura)
    if (!roleId) return false;
    
    const misReglas = this._queryWithFallback('Sys_Permissions', 'id_rol', roleId);
    // Cruza exacto de ABAC
    const rule = misReglas.find(p => p.schema_destino === entityName);
    
    // ENTERPRISE ZERO-TRUST STRICT MODE: 
    // Si no hay regla Matrix definida explícitamente para esta entidad, denegamos el acceso.
    if (!rule) {
      if (typeof Logger !== 'undefined') {
        Logger.log(`[ABAC_FIREWALL] Acceso denegado: No existe regla explícita en Sys_Permissions para el Rol '${roleId}' hacia la entidad '${entityName}'.`);
      }
      return false;
    }
    
    const nivel = rule.nivel_acceso || "NONE (Denegado)";
    
    // Aserciones Directas Base
    if (nivel.startsWith("ALL")) return true;
    if (nivel.startsWith("NONE")) return false;
    if (nivel.startsWith("READ_ONLY")) return false; 
    
    // Evaluaciones Topológicas de Frontera (ABAC Contextual)
    if (action === 'update' || action === 'delete') {
      const topology = this._getCachedTopology(email);
      
      if (nivel.startsWith("OWNER_ONLY")) {
        return topology.ownerOf.includes(targetId);
      }
      if (nivel.startsWith("MEMBER_ONLY")) {
        return topology.memberOf.includes(targetId) || topology.ownerOf.includes(targetId);
      }
    }
    
    // Para un CREATE topológico, basta que el rol dicte 'OWNER' o 'MEMBER' a nivel global estructural.
    // (Ej. Un Scrum Master puede crear un equipo si es un "Owner").
    if (action === 'create') {
        if (nivel.startsWith("OWNER") || nivel.startsWith("MEMBER")) return true;
    }
    
    return false; // Default safe closed
  },

  /**
   * Field-Level Security (FLS) Stripper
   * Escanea el Payload en busca de campos que tengan una regla declarativa \`abacRule\`.
   * Si el emisor no posee los privilegios dictados por el campo, lo borra silenciosamente del payload.
   */
  stripProtectedFields: function(email, entityName, payload) {
    if (!payload || typeof payload !== 'object' || typeof APP_SCHEMAS === 'undefined') return payload;
    const schema = APP_SCHEMAS[entityName];
    if (!schema || !schema.fields) return payload;

    schema.fields.forEach(field => {
      if (field.abacRule && field.name in payload) {
        const targetPerm = field.abacRule.target;
        const targetAction = field.abacRule.action;
        if (targetPerm && targetAction) {
          const isAllowed = this.validatePermission(email, targetAction, targetPerm, null);
          if (!isAllowed) {
            delete payload[field.name];
            if (typeof Logger !== 'undefined') {
              Logger.log(`[ABAC_FLS] Security Exception interceptada: Campo '${field.name}' segregado en '${entityName}' por usuario ${email}.`);
            }
          }
        }
      }
    });

    return payload;
  }
};

// Exposición global para interoperabilidad en GAS y Jest
if (typeof module !== 'undefined') {
  module.exports = { Engine_ABAC };
}
