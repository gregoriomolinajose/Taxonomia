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
    // Se extrae desde la caché efímera
    const personas = this._getCachedData('Persona');
    const _email = email.trim().toLowerCase();
    const persona = personas.find(p => (p.correo || "").toLowerCase() === _email);
    
    if (!persona) {
      // Usuario no registrado en el grafo. Devuelve permisos nulos.
      return { ownerOf: [], memberOf: [] };
    }
    
    let abacContext = {
      ownerOf: [],
      memberOf: [],
      permissions: {}
    };
    
    // Inyección del diccionario CUD de la matriz para el Frontend (S18.4)
    if (persona.id_rol) {
      const permisos = this._getCachedData('Sys_Permissions');
      const misReglas = permisos.filter(p => p.id_rol === persona.id_rol);
      misReglas.forEach(r => {
        abacContext.permissions[r.schema_destino] = r.nivel_acceso;
      });
    }
    
    const personaId = persona.id_persona || persona.id;
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
                const rows = this._getCachedData(entName) || [];
                
                rows.forEach(row => {
                    const isOwner = schema.topological_metadata.ownerFields.some(f => row[f] && row[f] === personaId);
                    if (isOwner) {
                        const rowId = String(row[pkField]);
                        if (rowId && rowId !== 'undefined' && !ownerSet.has(rowId)) {
                            ownerSet.add(rowId);
                            bfsQueue.push({ entity: entName, id: rowId });
                        }
                    }
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
                    const childRows = this._getCachedData(childEntName) || [];
                    
                    childRows.forEach(childRow => {
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
    
    const personas = this._getCachedData('Persona');
    const _email = email.trim().toLowerCase();
    const persona = personas.find(p => (p.correo || "").toLowerCase() === _email);
    
    // Usuario desconocido -> Fail Close estricto (Zero Match)
    if (!persona) {
      // Todo usuario debe tener representación en la BD para mutar.
      return false;
    }
    
    const roleId = persona.id_rol; 
    
    // Si la persona no tiene rol explícito asignado, opera el principio de Mínimo Privilegio (Solo Lectura)
    if (!roleId) return false;
    
    const permisos = this._getCachedData('Sys_Permissions');
    // Cruza exacto de ABAC
    const rule = permisos.find(p => p.id_rol === roleId && p.schema_destino === entityName);
    
    // S18.2: Regla Opcional Bypass. Si no hay regla Matrix definida explícitamente para esta entidad, 
    // somos tolerantes y permitimos el flujo clásico (Graceful Degradation de Gobernanza)
    if (!rule) {
      return true;
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
  }
};

// Exposición global para interoperabilidad en GAS y Jest
if (typeof module !== 'undefined') {
  module.exports = { Engine_ABAC };
}
