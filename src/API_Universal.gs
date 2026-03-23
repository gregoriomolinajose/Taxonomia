/**
 * API_Universal.gs
 * 
 * Controlador universal para las solicitudes POST/GET desde el HTML frontend.
 * Contiene el hook de enrutamiento y la lógica básica de negocio y auditoría.
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
 * _handleRead
 * Retorna todos los registros de una entidad desde Engine_DB.list.
 * @returns {{ headers: string[], rows: Object[] }}
 */
function _handleRead(entityName) {
  return Engine_DB.list(entityName);
}

/**
 * _handleCreate
 * Llama a Engine_DB (la inyección de auditoría ocurre en Adapter_Sheets).
 */
function _handleCreate(entityName, payload) {
  // Llamar al motor agnóstico
  const result = Engine_DB.create(entityName, payload);
  return result;
}

/**
 * _handleUpdate
 * Llama a Engine_DB (la inyección de auditoría ocurre en Adapter_Sheets).
 */
function _handleUpdate(entityName, id, payload) {
  const result = Engine_DB.update(entityName, id, payload);
  return result;
}

/**
 * _handleDelete
 * Llama a Engine_DB.delete() para un borrado logico.
 */
function _handleDelete(entityName, id) {
  const result = Engine_DB.delete(entityName, id);
  return result;
}

/**
 * API_Universal_Router
 * Punto de entrada exclusivo para google.script.run (Frontend HTML a Backend GAS)
 */
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

    return {
      status: "success",
      schema: schema,
      data: dataResponse,
      lookups: lookups,
      executionTimeMs: executionTime
    };
  } catch (error) {
    Logger.log(`[Hydration Error] ${error.message}`);
    return { status: "error", message: error.message };
  }
}

/**
 * _getCachedLookup(sourceFnName)
 * Implementa CacheService para evitar lecturas repetitivas de Sheets.
 */
function _getCachedLookup(sourceFnName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `CACHE_LOOKUP_${sourceFnName}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    Logger.log(`[Cache] HIT para ${sourceFnName}`);
    return JSON.parse(cached);
  }
  
  Logger.log(`[Cache] MISS para ${sourceFnName}. Leyendo de DB...`);
  const result = this[sourceFnName]();
  cache.put(cacheKey, JSON.stringify(result), 3600); // 1 hora
  return result;
}

function API_Universal_Router(action, entityName, payload) {
  try {
    let responseData = null;

    if (action === 'create') {
      let pkField = Object.keys(payload).find(k => k.startsWith('id_'));
      if (!pkField) {
        const tableKey = entityName.toLowerCase();
        const singularKey = tableKey.endsWith('s') ? tableKey.slice(0, -1) : tableKey;
        pkField = 'id_' + singularKey;
      }

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
      return JSON.stringify({
        status: "success",
        data: responseData,
        Entity: entityName,
        pk: pkField,
        pkValue: confirmedPkValue
      });
    } else if (action === 'read') {
      const id = (typeof payload === 'object') ? payload[Object.keys(payload).find(k => k.startsWith('id_'))] || payload.id : payload;
      if (id) {
        responseData = Engine_DB.readFull(entityName, id);
      } else {
        responseData = _handleRead(entityName);
      }
    } else if (action === 'update') {
      const idField = Object.keys(payload).find(k => k.startsWith('id_'));
      const id = payload[idField];
      responseData = _handleUpdate(entityName, id, payload);
    } else if (action === 'delete') {
      // Para delete, el payload puede ser solo el ID como string o un obj {id: ...}
      const id = (typeof payload === 'object') ? payload[Object.keys(payload).find(k => k.startsWith('id_'))] || payload.id : payload;
      responseData = _handleDelete(entityName, id);
    } else {
      throw new Error(`Action '${action}' not supported yet.`);
    }

    const itemName = payload.nombre || payload.id_portafolio || entityName;
    Logger.log('Persistencia completada para: ' + itemName);

    // Destruir Date Nativos (Regla 10) previo a postMessage
    responseData = JSON.parse(JSON.stringify(responseData));

    return JSON.stringify({
      status: "success",
      data: responseData
    });
  } catch (error) {
    Logger.log('🚀 ERROR Atrapado en Servidor: ' + error.message + '\n' + error.stack);
    return JSON.stringify({
      status: "error", // Según el if(response.status === 'success') de UI
      success: false,   // Por seguridad
      message: error.message
    });
  }
}

// Bloque de Persistencia Dinámicas (Relacional 1:N)
function getPersonasOptions() {
  try {
    const result = Engine_DB.list('Persona');
    if (!result || !result.rows) return [];
    
    const options = result.rows
      .filter(row => row.estado !== 'Eliminado')
      .map(row => ({
        value: row.id_persona,
        label: row.nombre_completo + (row.rol_organizacional ? ` (${row.rol_organizacional})` : '')
      }));
    return JSON.parse(JSON.stringify(options));
  } catch(e) {
    Logger.log("Error en getPersonasOptions: " + e.message);
    return [];
  }
}

function getGruposProductosOptions() {
  try {
    const result = Engine_DB.list('Grupo_Productos');
    if (!result || !result.rows) return [];
    
    return result.rows.map(row => ({
      value: row.id_grupo_producto,
      label: row.nombre
    })).filter(opt => opt.value && opt.label);
  } catch (error) {
    Logger.log("Error en getGruposProductosOptions: " + error.message);
    return [];
  }
}

/**
 * getPortafoliosOptions
 * Devuelve [{value: id_portafolio, label: nombre}] desde DB_Portafolio.
 * Usado por el Dependency Resolver de FormEngine para el campo id_portafolio en Grupo_Productos.
 */
function getPortafoliosOptions() {
  try {
    const result = Engine_DB.list('Portafolio');
    if (!result || !result.rows) return [];

    return result.rows.map(row => ({
      value: row.id_portafolio,
      label: row.nombre
    })).filter(opt => opt.value && opt.label);
  } catch (error) {
    Logger.log("Error en getPortafoliosOptions: " + error.message);
    return [];
  }
}

/**
 * getProductosOptions
 * Devuelve [{value: id_producto, label: nombre_producto}] desde DB_Producto.
 * Usado por el Dependency Resolver de FormEngine para el campo productos_asociados.
 */
function getProductosOptions() {
  try {
    const result = Engine_DB.list('Producto');
    if (!result || !result.rows) return [];

    const options = result.rows.map(row => ({
      value: row.id_producto,
      label: row.nombre_producto
    })).filter(opt => opt.value && opt.label);
    return JSON.parse(JSON.stringify(options));
  } catch (error) {
    Logger.log("Error en getProductosOptions: " + error.message);
    return [];
  }
}

/**
 * _generateShortUUID
 * Genera un ID con prefijo de 4 letras + sufijo de 5 caracteres alfanuméricos.
 * Ejemplo: UNID-X8R2P
 */
function _generateShortUUID(entityName) {
  var prefix = entityName.toUpperCase().substring(0, 4);
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var suffix = '';
  for (var i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + '-' + suffix;
}

// Bloque de Protección Híbrida (Jest vs GAS) - Regla 5 de docs/rules_db.md
if (typeof module !== 'undefined') {
  module.exports = {
    _handleCreate,
    _handleUpdate,
    _handleDelete,
    _generateShortUUID,
    API_Universal_Router
  };
}
