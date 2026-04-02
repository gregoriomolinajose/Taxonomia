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
  }
};

// Exposición global para interoperabilidad en GAS y Jest
if (typeof module !== 'undefined') {
  module.exports = { Engine_ABAC };
}
