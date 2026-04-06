/**
 * @file Engine_Workspace.gs
 * 
 * [S15.1] Smart Directory Integration
 * Proporciona hidratación Zero-Touch desde el Directorio Activo (Google Workspace).
 * Requiere que la API avanzada "Admin Directory" esté habilitada en appsscript.json.
 */

/**
 * Busca a un usuario por correo electrónico en el AdminDirectory y extrae su DTO.
 * Se expone al cliente mediante google.script.run
 * 
 * @param {string} queryEmail - Correo corporativo del empleado
 * @returns {Object|null} DTO con campos mapeados al formato del Schema_Engine
 */
function resolverDirectorioWorkspace(queryEmail) {
  try {
    // Zero-Touch CI/CD Environment flag guard
    if (typeof CONFIG !== 'undefined' && CONFIG.WORKSPACE_INTEGRATION === false) {
      Logger.log("Workspace API Bypassed: WORKSPACE_INTEGRATION is disabled in ENV_CONFIG");
      return { __status: "DISABLED" };
    }
    if (!AdminDirectory || !AdminDirectory.Users) {
      throw new Error("AdminDirectory SDK no está inyectado o habilitado.");
    }
    
    // Obtenemos el perfil completo desde Workspace usando la vista pública del dominio
    // Esto permite que usuarios Non-Admin puedan consultar perfiles de compañeros (Zero-Trust/Least Privilege)
    var user = AdminDirectory.Users.get(queryEmail, { projection: "full", viewType: "domain_public" });
    if (!user) return null;
    
    // Mapeo defensivo de los Nodos del SDK hacia los Campos del UI (Schema_Engine)
    // Extraemos de arrays debido a la estructura de Google (phones[], organizations[], etc)
    var fullName = user.name ? user.name.fullName : "";
    var phone = (user.phones && user.phones.length > 0) ? user.phones[0].value : "";
    var title = (user.organizations && user.organizations.length > 0) ? user.organizations[0].title : "";
    var dept = (user.organizations && user.organizations.length > 0) ? user.organizations[0].department : "";
    var location = (user.locations && user.locations.length > 0) ? user.locations[0].deskCode : "";
    
    // Extracción de ID de Empleado y Líder
    var numEmpleado = "";
    if (user.externalIds) {
      for (var i = 0; i < user.externalIds.length; i++) {
        if (user.externalIds[i].type === "organization") {
          numEmpleado = user.externalIds[i].value;
          break;
        }
      }
    }
    
    var manager = "";
    if (user.relations) {
      for (var j = 0; j < user.relations.length; j++) {
        if (user.relations[j].type === "manager") {
          manager = user.relations[j].value;
          break;
        }
      }
    }
    
    var dto = {
      nombre_completo: fullName,
      telefono: phone,
      departamento: dept,
      cargo: title,
      ubicacion: location,
      numero_empleado: numEmpleado,
      lider_directo: manager
    };
    
    Logger.log("Workspace Lookup Exitoso: " + queryEmail + " -> " + JSON.stringify(dto));
    return dto;
    
  } catch (e) {
    Logger.log("Workspace API Error [" + queryEmail + "]: " + e.message);
    return { __status: "ERROR", message: e.message }; // Notificamos a la UI del fallo subyacente
  }
}
