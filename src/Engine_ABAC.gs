/**
 * Motor de Control de Acceso Basado en Atributos Topológicos (ABAC)
 * Resuelve la jerarquía de pertenencia en tiempo real para el empleado activo.
 */

const Engine_ABAC = {
  /**
   * Procesa la Taxonomía para un email dado y devuelve los Nodos de los que es Dueño
   * o Miembro.
   * @param {string} email - Correo del usuario a consultar
   * @returns {Object} ABAC Context con arrays ownerOf y memberOf
   */
  resolveTopologyFor: function(email) {
    if (!email) return { ownerOf: [], memberOf: [] };
    
    // 1. Obtener la Persona (Identidad) asociada al Correo
    // Se extrae directamente de la base de datos o caché principal de 'Persona'
    const personas = Engine_DB.readAll('Persona') || [];
    const _email = email.trim().toLowerCase();
    const persona = personas.find(p => (p.correo || "").toLowerCase() === _email);
    
    if (!persona) {
      // Usuario no registrado en el grafo. Devuelve permisos nulos.
      return { ownerOf: [], memberOf: [] };
    }
    
    let abacContext = {
      ownerOf: [],
      memberOf: []
    };
    
    const personaId = persona.id;

    // 2. Extraer todos los Nodos posibles
    // Esto se mejoraría en S18.3 subiendo los árboles (Hierarchical Escalation).
    // Por ahora iteramos todos los Equipos y Trenes (S18.1: Nodos Principales)
    const equipos = Engine_DB.readAll('Equipo') || [];
    const trenes = Engine_DB.readAll('Tren') || [];
    
    // Buscar pertenencia directa y propiedad:
    // a) Equipos
    equipos.forEach(eq => {
      // Scrum Master es en este diseño el "Owner" del Nodo
      if (eq.scrum_master_id === personaId) {
        abacContext.ownerOf.push(eq.id);
        abacContext.memberOf.push(eq.id); // Si soy dueño, soy miembro implicito
      } else if (eq.product_owner_id === personaId) {
        // El PO también funge como Owner del Equipo
        abacContext.ownerOf.push(eq.id);
        abacContext.memberOf.push(eq.id);
      }
    });

    // b) Trenes
    trenes.forEach(tren => {
      if (tren.rte_id === personaId) {
        abacContext.ownerOf.push(tren.id);
        abacContext.memberOf.push(tren.id);
      } else if (tren.pm_id === personaId) {
        abacContext.ownerOf.push(tren.id);
        abacContext.memberOf.push(tren.id);
      }
    });
    
    // Limpiar duplicados por precaución
    abacContext.ownerOf = [...new Set(abacContext.ownerOf)];
    abacContext.memberOf = [...new Set(abacContext.memberOf)];

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
    
    const personas = Engine_DB.readAll('Persona') || [];
    const _email = email.trim().toLowerCase();
    const persona = personas.find(p => (p.correo || "").toLowerCase() === _email);
    
    // Usuario desconocido -> Fail Close (A menos que sea admin db)
    if (!persona) {
      if (email.includes('@humansys.ai') || email.includes('admin')) return true; 
      return false;
    }
    
    const roleId = persona.id_rol; 
    
    // Si la persona no tiene rol explícito asignado, opera el principio de Mínimo Privilegio (Solo Lectura)
    if (!roleId) return false;
    
    const permisos = Engine_DB.readAll('Sys_Permissions') || [];
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
      const topology = this.resolveTopologyFor(email);
      
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
