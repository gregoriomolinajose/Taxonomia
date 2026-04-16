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
    if (action === 'create') {
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

    if (!entityName) throw new Error("Entidad no especificada para la accion " + action);

    const schema = (typeof getAppSchema === 'function') ? getAppSchema(entityName) : null;
    let pkField = schema && schema.primaryKey ? schema.primaryKey : null;

    if (!pkField) {
      pkField = 'id';
    }

    if (action === 'etl_generate_template') {
      if (typeof _guardAbac === 'function') {
         _guardAbac('create', entityName, null);
      }
      responseData = Engine_ETL.generateDriveTemplate(entityName);
      return JSON.stringify({ status: "success", data: responseData, action });
    }

    if (action === 'etl_extract_sheet_data') {
      if (typeof _guardAbac === 'function') {
         // Extracción masiva presupone Upsert, demandando permisos conjuntos.
         _guardAbac('create', entityName, null);
         _guardAbac('update', entityName, null); 
      }
      if (!payload || !payload.url) throw new Error("Parámetro URL faltante en request ETL.");
      responseData = Engine_ETL.extractDataFromDrive(entityName, payload.url);
      return JSON.stringify({ status: "success", data: responseData, action });
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
      if (typeof Logger !== 'undefined') Logger.log('Persistencia completada para: ' + itemName);
      
      const sanitizedReturn = JSON.stringify({
        status: "success",
        data: responseData,
        Entity: entityName,
        pk: pkField,
        pkValue: confirmedPkValue
      });
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
    } else if (action === 'bulkInsert') {
      if (!Array.isArray(payload)) {
        throw new Error("Payload for bulkInsert must be an array of objects.");
      }
      
      // Auto-generación de UUIDs temporales para la ráfaga
      payload.forEach(record => {
        if (!record[pkField] || String(record[pkField]).trim() === '') {
          record[pkField] = _generateShortUUID(entityName);
        }
      });
      
      // [S38.5] Pre-procesamiento de Batch: Deduplicación Lógica e Hidratación Automática
      // Delegamos la Inteligencia de Dominio a la capa especializada ETL (Transform)
      if (typeof Engine_ETL !== 'undefined' && typeof Engine_ETL.hydrateAndDeduplicate === 'function') {
          Engine_ETL.hydrateAndDeduplicate(entityName, payload);
      }
      
      // Delegamos la unidad de trabajo cruda (Unit of Work) al backend
      responseData = Engine_DB.upsertBatch(entityName, payload);
      
      if (typeof Logger !== 'undefined') Logger.log(`Batch Persistencia completada p/${entityName}: ${payload.length} records.`);
      
      return JSON.stringify({
        status: "success",
        data: responseData,
        insertedCount: payload.length
      });
    } else {
      throw new Error(`Action '${action}' not supported yet.`);
    }

    const itemName = payload.nombre || payload.id_portafolio || entityName;
    if (typeof Logger !== 'undefined') Logger.log('Persistencia completada para: ' + itemName);

    // Emitir como String previene Google Apps Script IPC Deserialize Threw Error Native Bug
    const sanitizedReturn = JSON.stringify({
      status: "success",
      data: responseData
    });
    return sanitizedReturn;
  } catch (error) {
    if (typeof Logger !== 'undefined') Logger.log('🚀 ERROR Atrapado en Servidor: ' + error.message + '\n' + error.stack);
    
    // Categorización Semántica del Error para el Cliente
    let errorType = 'GENERAL';
    const msg = error.message || '';
    if (msg.indexOf('ERROR_CONCURRENCY') !== -1) errorType = 'CONCURRENCY';
    else if (msg.indexOf('ABAC Error') !== -1) errorType = 'UNAUTHORIZED';
    else if (msg.indexOf('not supported') !== -1 || msg.indexOf('must be an array') !== -1 || msg.indexOf('no especificada') !== -1) errorType = 'BAD_REQUEST';

    const sanitizedReturn = JSON.stringify({
      status: "error",
      success: false,
      errorType: errorType,
      message: error.message
    });
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
