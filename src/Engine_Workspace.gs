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
    var givenName = user.name ? user.name.givenName : "";
    var familyName = user.name ? user.name.familyName : "";
    var phone = (user.phones && user.phones.length > 0) ? user.phones[0].value : "";
    var title = (user.organizations && user.organizations.length > 0) ? user.organizations[0].title : "";
    var dept = (user.organizations && user.organizations.length > 0) ? user.organizations[0].department : "";
    var orgName = (user.organizations && user.organizations.length > 0) ? user.organizations[0].name : "";
    var costCenter = (user.organizations && user.organizations.length > 0) ? user.organizations[0].costCenter : "";
    var location = (user.locations && user.locations.length > 0) ? user.locations[0].deskCode : "";
    var avatar = user.thumbnailPhotoUrl || "";
    
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
      nombre: givenName,
      apellidos: familyName,
      telefono: phone,
      avatar: avatar,
      departamento: dept,
      centro_costo: costCenter,
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

/**
 * [S37.4] Typeahead Proxy para Directorio Workspace
 * Busca usuarios por nombre o apellido con caché asertivo.
 * 
 * @param {string} queryName - Fragmento del nombre
 * @returns {Array|Object} Lista de DTOs mínimos o Error
 */
function searchDirectoryByName(queryName) {
  try {
    if (typeof CONFIG !== 'undefined' && CONFIG.WORKSPACE_INTEGRATION === false) {
      return { __status: "DISABLED" };
    }
    if (!AdminDirectory || !AdminDirectory.Users) {
      throw new Error("AdminDirectory SDK no está inyectado o habilitado.");
    }
    
    var q = (queryName || "").trim();
    if (q.length < 3) return []; // Evitar barridos costosos
    
    // Caché Script-Level para evitar cuotas de Límite (1500 per day admin API)
    var cache = CacheService.getScriptCache();
    var cacheKey = "ws_search_" + Utilities.base64Encode(q.toLowerCase());
    var cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // query simple
    var response = AdminDirectory.Users.list({
      customer: 'my_customer',
      query: "name:" + q + "*",
      maxResults: 15,
      projection: "full",
      viewType: "domain_public"
    });
    
    var users = response.users || [];
    var dtos = users.map(function(u) {
      return {
         email: u.primaryEmail,
         nombre: u.name ? u.name.givenName : "",
         apellidos: u.name ? u.name.familyName : "",
         cargo: (u.organizations && u.organizations.length > 0) ? u.organizations[0].title : "",
         avatar: u.thumbnailPhotoUrl || ""
       };
    });
    
    // TTL Caché: 4 Horas (14400s)
    cache.put(cacheKey, JSON.stringify(dtos), 14400);
    return dtos;
    
  } catch (e) {
    Logger.log("Workspace Typeahead Error [" + queryName + "]: " + e.message);
    return { __status: "ERROR", message: e.message };
  }
}
