/**
 * API_Universal.gs
 * 
 * Enrutador principal purificado (SRP) para las solicitudes POST/GET desde el HTML frontend.
 * Delega toda lógica de negocio, cacheo e hidratación a Controller_Action y Controller_Lookups.
 */

/**
 * doPost
 * Punto de entrada HTTP POST para la Web App de Google Apps Script.
 */
function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const entity = request.entity;
    const action = request.action; // create, read, update, delete
    const data = request.data;    // Payload

    let responseData = null;

    // Delegación estricta hacia Controller_Action.gs
    if (action === 'getDashboardCounters') {
      responseData = getDashboardCounters();
    } else if (action === 'create') {
      responseData = _handleCreate(entity, data);
    } else if (action === 'read') {
      responseData = _handleRead(entity);
    } else if (action === 'update') {
      responseData = _handleUpdate(entity, data.id, data);
    } else if (action === 'delete') {
      responseData = _handleDelete(entity, data.id || data);
    } else {
      throw new Error("Action not supported yet.");
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      data: responseData
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * API_Universal_Router
 * Punto de entrada exclusivo para google.script.run (Frontend HTML a Backend GAS)
 */
function API_Universal_Router(action, entityName, payload) {
  try {
    let responseData = null;

    // Custom non-entity specific endpoints
    if (action === 'getDashboardCounters') {
      responseData = getDashboardCounters();
      return JSON.parse(JSON.stringify({ status: "success", data: responseData }));
    }

    if (!entityName) throw new Error("Entidad no especificada para la accion " + action);

    const schema = (typeof getAppSchema === 'function') ? getAppSchema(entityName) : null;
    let pkField = schema && schema.primaryKey ? schema.primaryKey : null;

    if (!pkField) {
      const tableKey = entityName.toLowerCase();
      const singularKey = tableKey.endsWith('es') ? tableKey.slice(0, -2) : (tableKey.endsWith('s') ? tableKey.slice(0, -1) : tableKey);
      pkField = 'id_' + singularKey;
    }

    if (action === 'create') {
      if (!payload[pkField] || String(payload[pkField]).trim() === '') {
        payload[pkField] = _generateShortUUID(entityName);
      }
      responseData = _handleCreate(entityName, payload);
      responseData = JSON.parse(JSON.stringify(responseData)); // Destruir Date Nativos (Regla 10)

      // Enrich response with confirmed PK so the frontend cache injection
      // can build the newRecord without guessing the adapter's internal shape.
      const confirmedPkValue = payload[pkField];
      const itemName = payload.nombre || payload.nombre_producto || entityName;
      Logger.log('Persistencia completada para: ' + itemName);
      
      const sanitizedReturn = JSON.parse(JSON.stringify({
        status: "success",
        data: responseData,
        Entity: entityName,
        pk: pkField,
        pkValue: confirmedPkValue
      }));
      return sanitizedReturn;
    } else if (action === 'read') {
      const id = (typeof payload === 'object') ? payload[pkField] || payload.id : payload;
      if (id) {
        responseData = Engine_DB.readFull(entityName, id);
      } else {
        responseData = _handleRead(entityName);
      }
    } else if (action === 'update') {
      const id = payload[pkField];
      responseData = _handleUpdate(entityName, id, payload);
    } else if (action === 'delete') {
      // Para delete, el payload puede ser solo el ID como string o un obj {id: ...}
      const id = (typeof payload === 'object') ? payload[pkField] || payload.id : payload;
      responseData = _handleDelete(entityName, id);
    } else {
      throw new Error(`Action '${action}' not supported yet.`);
    }

    const itemName = payload.nombre || payload.id_portafolio || entityName;
    Logger.log('Persistencia completada para: ' + itemName);

    // Destruir Date Nativos (Regla 10) previo a postMessage
    const sanitizedReturn = JSON.parse(JSON.stringify({
      status: "success",
      data: responseData
    }));
    return sanitizedReturn;
  } catch (error) {
    Logger.log('🚀 ERROR Atrapado en Servidor: ' + error.message + '\n' + error.stack);
    const sanitizedReturn = JSON.parse(JSON.stringify({
      status: "error",
      success: false,
      errorType: (error.message && error.message.indexOf('ERROR_CONCURRENCY') !== -1) ? 'CONCURRENCY' : 'GENERAL',
      message: error.message
    }));
    return sanitizedReturn;
  }
}

// Bloque de Protección Híbrida (Jest vs GAS) - Regla 5 de docs/rules_db.md
if (typeof module !== 'undefined') {
  module.exports = {
    API_Universal_Router
  };
}

/**
 * Persiste configuración global (White-Label) en las Script Properties.
 * Protegido por validación Engine_ABAC sobre Config_Typography.
 */
function API_UpdateGlobalConfig(config) {
  try {
    var email = "";
    if (typeof Session !== 'undefined') email = Session.getActiveUser().getEmail();
    
    // Authorization Check: Must be ALL for Config_Typography
    var ctx = (typeof Engine_ABAC !== 'undefined') 
        ? Engine_ABAC.resolveTopologyFor(email) 
        : { permissions: {} };
        
    var authLvl = ctx.permissions['Config_Typography'] || "";
    if (authLvl.startsWith('ALL')) {
      // Basic Sanity Validation (No strict allowlist since CRUD manages it)
      if (typeof config !== 'object') {
          throw new Error("Estructura de payload inválida.");
      }
      
      const sanitizeRegex = /^[\w\s\,\-\'\"\.]+$/i;
      const cleanConfig = {};
      
      // Iterate over allowed fields to prevent arbitrary property injection
      const allowedKeys = ['font_display', 'font_h1', 'font_h2', 'font_h3', 'font_body', 'font_sub', 'font_caption', 'font_mini', 'bodyFont', 'displayFont'];
      
      for (const key of Object.keys(config)) {
          if (allowedKeys.indexOf(key) !== -1 && typeof config[key] === 'string') {
              if (sanitizeRegex.test(config[key])) {
                  cleanConfig[key] = config[key];
              } else {
                  throw new Error(`Security Exception: Tipografía solicitada en [${key}] contiene caracteres inválidos para CSS.`);
              }
          }
      }
      
      PropertiesService.getScriptProperties().setProperty('WHITE_LABEL_CONFIG', JSON.stringify(cleanConfig));
      
      return { status: 'success', message: 'Configuración Global Actualizada' };
    } else {
      throw new Error("ABAC Error: Permisos insuficientes (Nivel ALL requerido en Config_Typography).");
    }
  } catch(e) {
    throw new Error("ConfigError: " + e.message);
  }
}
