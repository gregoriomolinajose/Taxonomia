/**
 * @file Engine_Workspace.gs
 * 
 * [S15.1] Smart Directory Integration
 * Proporciona hidratación Zero-Touch desde el Directorio Activo (Google Workspace).
 * Requiere que la API avanzada "Admin Directory" esté habilitada en appsscript.json.
 */

/**
 * Evalúa si la sincronización Workspace está habilitada,
 * revisando tanto el flag estático (CONFIG) como la configuración dinámica del Admin.
 */
function isWorkspaceSyncEnabled() {
  if (typeof CONFIG !== 'undefined' && CONFIG.WORKSPACE_INTEGRATION === false) return false;
  try {
    if (typeof PropertiesService !== 'undefined') {
      var cfgStr = PropertiesService.getScriptProperties().getProperty('APP_WORKSPACE_CONFIG');
      if (cfgStr) {
        var cfg = JSON.parse(cfgStr);
        if (cfg.syncEnabled === false) return false;
      }
    }
  } catch (e) {
    Logger.log("Error parseando APP_WORKSPACE_CONFIG: " + e.message);
  }
  return true;
}

/**
 * Devuelve el mapa completo de configuraciones de Workspace
 */
function getAllDomainConfigs() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get("config_workspaces_map_v2");
    var map;
    
    if (cached) {
      map = JSON.parse(cached);
    } else {
      if (typeof Adapter_Sheets === 'undefined' || typeof CONFIG === 'undefined') return {};
      
      var dbConfig = { SPREADSHEET_ID_DB: CONFIG.SPREADSHEET_ID_DB, useSheets: true };
      var list = Adapter_Sheets.list('Config_Workspace', dbConfig, 'objects', false);
      var rows = list ? list.rows : [];
      map = {};
      
      rows.forEach(function(r) {
         var active = (String(r.activar_consulta_directorio).toLowerCase() === 'true');
         var cfg = {
            enabled: active,
            webhookUrl: r.webhook_url || null,
            webhookSecret: r.webhook_secret || null
         };
         
         if (r.dominio) {
             map[String(r.dominio).trim().toLowerCase()] = cfg;
         }
         if (r.alias_alternativos) {
             String(r.alias_alternativos).split(',').forEach(function(alias) {
                 var a = alias.trim().toLowerCase();
                 if (a) map[a] = cfg;
             });
         }
      });
      cache.put("config_workspaces_map_v2", JSON.stringify(map), 900); // 15 minutos de TTL
    }
    return map;
  } catch(e) {
    Logger.log("Error en getAllDomainConfigs: " + e.message);
    return {};
  }
}

/**
 * [S59.5] Evalúa si un dominio específico tiene activada la consulta al directorio,
 * leyendo la configuración desde Config_Workspace (cacheados en RAM) e incluyendo Webhooks.
 */
function getDomainConfig(domain) {
  try {
    if (!domain) return { enabled: false };
    var searchDomain = String(domain).trim().toLowerCase();
    var map = getAllDomainConfigs();
    return map[searchDomain] || { enabled: false };
  } catch(e) {
    Logger.log("Error checking getDomainConfig para " + domain + ": " + e.message);
    return { enabled: false };
  }
}

/**
 * Busca a un usuario por correo electrónico en el AdminDirectory y extrae su DTO.
 * Se expone al cliente mediante google.script.run
 * 
 * @param {string} queryEmail - Correo corporativo del empleado
 * @returns {Object|null} DTO con campos mapeados al formato del Schema_Engine
 */
function resolverDirectorioWorkspace(queryEmail) {
  try {
    // Zero-Touch CI/CD Environment & Admin Config flag guard
    if (!isWorkspaceSyncEnabled()) {
      Logger.log("Workspace API Bypassed: Sync is disabled globally or by admin config.");
      return { __status: "DISABLED" };
    }
    
    var user;
    var domain = queryEmail.substring(queryEmail.indexOf('@'));
    var dCfg = getDomainConfig(domain);
    
    // S59.5: Barrera lógica estricta por dominio
    if (!dCfg.enabled) {
      Logger.log("Workspace API Bypassed: Sync is disabled explicitly for domain " + domain);
      return { __status: "DISABLED" };
    }

    if (dCfg.webhookUrl) {
      // Modo Microservicio Puente Nativo
      var apiUrl = dCfg.webhookUrl + "?q=" + encodeURIComponent(queryEmail) + "&secret=" + encodeURIComponent(dCfg.webhookSecret || '');
      var response = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
      if (response.getResponseCode() === 200) {
        var respBody = JSON.parse(response.getContentText());
        if (respBody.error) {
            Logger.log("[Webhook] Error remoto: " + respBody.error);
            return null;
        }
        if (respBody && respBody.length > 0) {
           // We expect an array of users, or the exact match. Usually the webhook returns the list of users that match q.
           // Since we queried EXACT email, we look for it in the array or take the first.
           user = respBody.find(function(u) { return u.primaryEmail === queryEmail; }) || respBody[0];
        }
      } else {
        Logger.log("Error en Webhook Puente: " + response.getResponseCode());
        return null;
      }
    } else {
      // Modo Nativo (Solo si el script owner tiene permisos directos, ej: mismo dominio)
      if (typeof AdminDirectory === 'undefined' || !AdminDirectory.Users) return null;
      user = AdminDirectory.Users.get(queryEmail, { projection: "full", viewType: "domain_public" });
    }
    
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
    
    var locParts = [];
    if (user.locations && user.locations.length > 0) {
      var baseLoc = user.locations[0];
      if (baseLoc.buildingId) locParts.push(baseLoc.buildingId);
      if (baseLoc.area) locParts.push(baseLoc.area);
      if (baseLoc.deskCode) locParts.push(baseLoc.deskCode);
    }
    var orgLocation = (user.organizations && user.organizations.length > 0) ? user.organizations[0].location : "";
    var location = locParts.length > 0 ? locParts.join(" - ") : (orgLocation || "");
    
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

      // [S44.9] Mapeo de Cargo. Delegate creation to Engine_ETL (SRP)
      if (title && String(title).trim() !== '') {
          dto.cargo = String(title).trim();
      }
    
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
    if (!isWorkspaceSyncEnabled()) {
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
    
    // query compuesta (Nativo + OAuth2 Externos)
    var users = [];

    // 1. Nativo (Sujeto a S59.4)
    var sessionEmail = "";
    try { sessionEmail = Session.getActiveUser().getEmail(); } catch(e){}
    var nativeDomain = sessionEmail ? sessionEmail.substring(sessionEmail.indexOf('@')) : null;
    
    var runNative = true;
    if (nativeDomain) {
       runNative = getDomainConfig(nativeDomain).enabled;
    }

    if (runNative && typeof AdminDirectory !== 'undefined' && AdminDirectory.Users) {
        try {
            var response = AdminDirectory.Users.list({
              customer: 'my_customer',
              query: "name:" + q + "*",
              maxResults: 15,
              projection: "full",
              viewType: "domain_public"
            });
            if (response.users) users = users.concat(response.users);
        } catch(e){
            Logger.log("[Typeahead] Error nativo: " + e.message);
        }
    }

    // 2. Webhooks Externos (S59.5)
    var allConfigs = getAllDomainConfigs();
    var processedWebhookUrls = {}; // Para evitar llamar al mismo webhook varias veces por alias
    
    for (var key in allConfigs) {
      var dCfg = allConfigs[key];
      // Si está encendido, no es el dominio nativo y tiene webhook
      if (dCfg.enabled && dCfg.webhookUrl && !processedWebhookUrls[dCfg.webhookUrl]) {
         processedWebhookUrls[dCfg.webhookUrl] = true;
         try {
            var apiUrl = dCfg.webhookUrl + "?q=" + encodeURIComponent(q) + "&secret=" + encodeURIComponent(dCfg.webhookSecret || '');
            var res = UrlFetchApp.fetch(apiUrl, { muteHttpExceptions: true });
            if (res.getResponseCode() === 200) {
               var payload = JSON.parse(res.getContentText());
               if (!payload.error && Array.isArray(payload)) {
                  users = users.concat(payload);
               }
            }
         } catch(err) {
            Logger.log("[Typeahead Webhook Error]: " + err.message);
         }
      }
    }
    
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
