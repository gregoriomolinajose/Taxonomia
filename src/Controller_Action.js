/**
 * Controller_Action.gs
 * 
 * Controlador purificado (SRP) para las mutaciones CUD y Datasets Masivos.
 * Recibe peticiones del Enrutador y las aplica contra el Engine_DB.
 */

/**
 * _guardAbac (Middleware Interno)
 * Dispara una Excepción 403 si Engine_ABAC resuelve que el usuario no tiene los privilegios
 * topológicos correspondientes (OWNER, MEMBER).
 */
function _guardAbac(action, entityName, targetId) {
  if (typeof Engine_ABAC === 'undefined') return;
  let email = ""; // Cerrado por defecto (Fail-Close Security)
  try {
     if (typeof Session !== 'undefined') email = Session.getActiveUser().getEmail();
  } catch(e) {
     console.warn("[Gobernanza] Error resolviendo identidad activa.", e);
  }
  
  const isAllowed = Engine_ABAC.validatePermission(email, action, entityName, targetId);
  if (!isAllowed) {
     throw new Error("ABAC_403_FORBIDDEN: Carece de privilegios gubernamentales («" + action + "» sobre " + entityName + "). Su rol de seguridad no le permite alterar este nodo.");
  }
}

/**
 * _handleRead
 * Retorna todos los registros de una entidad desde Engine_DB.list.
 * @returns {{ headers: string[], rows: Object[] }}
 */
function _handleRead(entityName) {
  // Las lecturas son permitidas por defecto (Visibilidad completa del Grafo)
  return Engine_DB.list(entityName);
}

/**
 * _handleCreate
 * Llama a Engine_DB (la inyección de auditoría ocurre en Adapter_Sheets).
 */
function _handleCreate(entityName, payload) {
  _guardAbac('create', entityName, null);
  _applyAdminBypass(entityName, payload);
  
  if (typeof Business_Interceptors !== 'undefined') {
      try {
          Business_Interceptors.apply(entityName, [payload]);
      } catch(e) { 
          throw new Error("FALLO DE INTEGRIDAD (Middleware): No se pudo provisionar entidades relacionadas. " + e.message); 
      }
  }
  
  if (typeof Engine_ABAC !== 'undefined') {
    let email = "";
    try { if (typeof Session !== 'undefined') email = Session.getActiveUser().getEmail(); } catch(e) {}
    payload = Engine_ABAC.stripProtectedFields(email, entityName, payload);
  }

  const result = Engine_DB.create(entityName, payload);
  return result;
}

/**
 * _handleUpdate
 * Llama a Engine_DB (la inyección de auditoría ocurre en Adapter_Sheets).
 */
function _handleUpdate(entityName, id, payload) {
  _guardAbac('update', entityName, id);
  _applyAdminBypass(entityName, payload);
  
  if (typeof Business_Interceptors !== 'undefined') {
      try {
          Business_Interceptors.apply(entityName, [payload]);
      } catch(e) { 
          throw new Error("FALLO DE INTEGRIDAD (Middleware): No se pudo provisionar entidades relacionadas. " + e.message); 
      }
  }
  
  if (typeof Engine_ABAC !== 'undefined') {
    let email = "";
    try { if (typeof Session !== 'undefined') email = Session.getActiveUser().getEmail(); } catch(e) {}
    payload = Engine_ABAC.stripProtectedFields(email, entityName, payload);
  }

  const result = Engine_DB.update(entityName, id, payload);
  return result;
}

/**
 * _handleDelete
 * Llama a Engine_DB.delete() para un borrado logico.
 */
function _handleDelete(entityName, id) {
  _guardAbac('delete', entityName, id);
  const result = Engine_DB.delete(entityName, id);
  return result;
}

/**
 * _applyAdminBypass (SRP Helper)
 * Implícitamente salta controles de concurrencia y despliega override 
 * para acciones CUD previamente autenticadas sobre matrices estructurales.
 */
function _applyAdminBypass(entityName, payload) {
  if (entityName === 'Sys_Permissions') {
      payload._overrideConcurrency = true;
  }
}

/**
 * getAppBootstrapPayload()
 * Endpoint consolidado para Precarga Global (Global Prefetch).
 * Retorna diccionarios de datos ya desempacados (Arreglo de Objetos) para todas las entidades.
 */
function getAppBootstrapPayload() {
  const t0 = Date.now();
  try {
    const payload = {};
    const schemas = getAppSchema();
    const entities = Object.keys(schemas);
    
    for (let i = 0; i < entities.length; i++) {
        const entityName = entities[i];
        const result = Engine_DB.list(entityName, 'tuples'); // Tuples for internal speed
        
        // Desempacar tuplas a objetos en el backend para evitar bloqueos de renderizado en UI
        if (result && result.headers && result.rows) {
            const headers = result.headers;
            const rows = result.rows.map(tuple => {
                const obj = {};
                headers.forEach((h, j) => obj[h] = tuple[j]);
                return obj;
            });
            payload[entityName] = rows;
        } else {
            payload[entityName] = [];
        }
    }
    
    // OBLIGATORIO: Transmitir formato String crudo para evadir el bug de IPC Deserialize de Google Apps Script V8 en diccionarios profundos
    const sanitizedReturn = JSON.stringify({
      status: "success",
      data: payload
    });
    const executionTime = Date.now() - t0;
    Logger.log(`[Perf] getAppBootstrapPayload completado en ${executionTime}ms`);
    
    return sanitizedReturn;
  } catch (error) {
    Logger.log(`[Bootstrap Error] ${error.message}`);
    return { status: "error", message: error.message };
  }
}

/**
 * getInitialPayload(entityName)
 * Endpoint maestro para Data Hydration. Consolida schema, data y lookups en un solo RPC.
 */
function getInitialPayload(entityName) {
  const t0 = Date.now();
  try {
    Logger.log(`[Hydration] Iniciando carga para: ${entityName}`);
    
    // 1. Obtener Schema
    const schema = getAppSchema(entityName);
    
    // 2. Obtener Data (en formato Tuplas para optimizar peso)
    const dataResponse = Engine_DB.list(entityName, 'tuples');
    
    // 3. Obtener Lookups requeridos
    const lookups = {};
    const fields = schema.fields || Object.keys(schema).filter(k => typeof schema[k] === 'object').map(k => ({...schema[k], name: k}));
    
    fields.forEach(field => {
      if (field.lookupSource) {
        lookups[field.name] = _getCachedLookup(field.lookupSource);
      } else if (field.lookupTarget) {
        // Mapear lookupTarget a su función de opciones (convención)
        const sourceFn = `get${field.lookupTarget}sOptions`;
        if (typeof this[sourceFn] === 'function') {
          lookups[field.name] = _getCachedLookup(sourceFn);
        }
      } else if (field.targetEntity) {
        // Soporte para subgrid selections (Select OR Create)
        const sourceFn = `get${field.targetEntity}Options`;
        const pluralFn = `get${field.targetEntity.replace(/o$/i, 'os').replace(/a$/i, 'as')}Options`; // Handle common plurals
        
        if (typeof this[sourceFn] === 'function') {
          lookups[field.name] = _getCachedLookup(sourceFn);
        } else if (typeof this[pluralFn] === 'function') {
          lookups[field.name] = _getCachedLookup(pluralFn);
        } else {
          // Fallback manual para Grupos_Productos -> getGruposProductosOptions
          const clean = field.targetEntity.replace(/_/g, '');
          const manualFn = `get${clean}Options`;
          const altManualFn = `get${clean.replace(/o/i, 'os')}Options`; // e.g. GrupoProductos -> GruposProductos
          
          if (typeof this[manualFn] === 'function') {
            lookups[field.name] = _getCachedLookup(manualFn);
          } else if (typeof this[altManualFn] === 'function') {
            lookups[field.name] = _getCachedLookup(altManualFn);
          }
        }
      }
    });

    const executionTime = Date.now() - t0;
    Logger.log(`[Perf] getInitialPayload(${entityName}) completado en ${executionTime}ms`);

    // Transmitir en formato String crudo para evadir el crash del Serializador IPC de GAS
    const sanitizedReturn = JSON.stringify({
      status: "success",
      schema: schema,
      data: dataResponse,
      lookups: lookups,
      executionTimeMs: executionTime
    });
    return sanitizedReturn;
  } catch (error) {
    Logger.log(`[Hydration Error] ${error.message}`);
    return { status: "error", message: error.message };
  }
}

/**
 * Helper interno para estandarizar el consumo de la pasarela API Universal.
 * Resuelve el parseo de JSON y el manejo de errores fatal a nivel RPC.
 */
function _proxyRpcCall(route, entityName, payload) {
    const resString = API_Universal_Router(route, entityName, payload);
    const res = JSON.parse(resString);
    if (res.status === 'error') {
        throw new Error(res.message);
    }
    return res;
}

/**
 * bulkInsert (Operating as Bulk Upsert in Memory)
 * Inserción y actualización masiva de registros en hoja (Universal Bulk Data Engine)
 */
function bulkInsert(entityName, recordsArray) {
    // [BugFix S40.3] Redireccionamos la llamada legacy del frontend hacia nuestro enrutador principal universal
    const res = _proxyRpcCall('bulkInsert', entityName, recordsArray);
    return {
        status: 'success',
        insertedCount: res.insertedCount || recordsArray.length,
        newRecords: recordsArray.length, // Compat
        updatedRecords: 0,
        details: (res.data && res.data.details) ? res.data.details : (res.data || [])
    };
}

/**
 * Endpoint expuesto para Google Apps Script RPC que procesa el feedback visual hacia la hoja de cálculo.
 * @param {string} entityName 
 * @param {Object} payload - { sheetId, feedback }
 * @returns {Object} 
 */
function etl_writeback_feedback(entityName, payload) {
    const res = _proxyRpcCall('etl_writeback_feedback', entityName, payload);
    return res.data;
}

/**
 * _generateShortUUID
 * Genera un ID con prefijo de 4 letras + sufijo de 5 caracteres alfanuméricos.
 * Ejemplo: UNID-X8R2P
 */
function _generateShortUUID(entityName) {
    const safeName = entityName || 'uuid';
    const prefix = safeName.substring(0, 4).toUpperCase();
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let suffix = '';
    for (let i = 0; i < 5; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${suffix}`;
}



// Bloque de Protección Híbrida (Jest)
if (typeof module !== 'undefined') {
  module.exports = {
    _handleCreate,
    _handleUpdate,
    _handleDelete,
    _handleRead,
    _generateShortUUID
  };
}
