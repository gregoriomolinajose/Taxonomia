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
    
    // OBLIGATORIO: Sanitización JSON.parse(stringify) para destruir proxies nativos
    const sanitizedReturn = JSON.parse(JSON.stringify({
      status: "success",
      data: payload
    }));
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

    const sanitizedReturn = JSON.parse(JSON.stringify({
      status: "success",
      schema: schema,
      data: dataResponse,
      lookups: lookups,
      executionTimeMs: executionTime
    }));
    return sanitizedReturn;
  } catch (error) {
    Logger.log(`[Hydration Error] ${error.message}`);
    return { status: "error", message: error.message };
  }
}

/**
 * bulkInsert (Operating as Bulk Upsert in Memory)
 * Inserción y actualización masiva de registros en hoja (Universal Bulk Data Engine)
 */
function bulkInsert(entityName, recordsArray) {
    const user = Session.getActiveUser().getEmail();
    const timestamp = new Date();
    
    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { SPREADSHEET_ID_DB: '' };
    if (!config.SPREADSHEET_ID_DB) {
        throw new Error('Configuración Crítica: SPREADSHEET_ID_DB no se encuentra definido o es nulo.');
    }
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000); // 30s timeout for massive unpaginated bulk
    } catch(e) {
        return { status: 'error', message: 'Sistema saturado realizando inserciones masivas concurrentes. Reintente pronto.' };
    }

    try {
        const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID_DB);
        if (!ss) return { status: 'error', message: 'No se pudo conectar a la base de datos (Spreadsheet nulo).' };

        // Auto-Aprovisionamiento explícito usando el Adapter
        const sheet = Adapter_Sheets._ensureSheetExists(ss, entityName);
        if (!sheet) return { status: 'error', message: `No se pudo acceder a la hoja ${entityName}` };

    const dataRange = sheet.getDataRange();
    const allValues = dataRange.getValues();
    const headers = allValues[0];
    let existingData = allValues.slice(1);
    
    if (headers.length === 0 || headers[0] === "") {
       return { status: 'error', message: `La entidad ${entityName} no está aprovisionada (faltan cabeceras).` };
    }
    
    // Determinar Primary Key dinámicamente desde los headers o la convención
    let pkField = headers.find(h => h.toString().startsWith('id_'));
    if (!pkField) {
        const tableKey = entityName.toLowerCase();
        const singularKey = tableKey.endsWith('s') ? tableKey.slice(0, -1) : tableKey;
        pkField = 'id_' + singularKey;
    }

    let idIndex = headers.indexOf(pkField);
    if(idIndex === -1) idIndex = 0; // Fallback to first column

    let existingMap = {};
    existingData.forEach((row, index) => {
        if (row[idIndex]) existingMap[row[idIndex]] = index;
    });

    let newRecordsCount = 0;
    let updatedRecordsCount = 0;

    recordsArray.forEach(record => {
        const recordId = record[pkField] || record['id'];
        
        // Es un UPDATE
        if (recordId && existingMap.hasOwnProperty(recordId)) {
            _guardAbac('update', entityName, recordId);
            const rowIndex = existingMap[recordId];
            
            // Mantener datos de creación originales
            record.created_at = existingData[rowIndex][headers.indexOf('created_at')] || timestamp;
            record.created_by = existingData[rowIndex][headers.indexOf('created_by')] || user;
            // Actualizar auditoría
            record.updated_at = timestamp;
            record.updated_by = user;
            record.estado = record.estado || existingData[rowIndex][headers.indexOf('estado')] || 'Activo';
            
            // Reconstruir la fila preservando el orden de las cabeceras
            const updatedRow = headers.map(colName => record[colName] !== undefined ? record[colName] : existingData[rowIndex][headers.indexOf(colName)]);
            existingData[rowIndex] = updatedRow;
            updatedRecordsCount++;
        } 
        // Es un INSERT
        else {
            _guardAbac('create', entityName, null);
            const newId = recordId || _generateShortUUID(entityName);
            record[pkField] = newId; 
            record.created_at = timestamp;
            record.created_by = user;
            record.updated_at = timestamp;
            record.updated_by = user;
            record.estado = record.estado || 'Activo';
            
            const newRow = headers.map(colName => record[colName] !== undefined ? record[colName] : '');
            existingData.push(newRow);
            existingMap[newId] = existingData.length - 1;
            newRecordsCount++;
        }
    });

    // Escribir de vuelta TODO a la base de datos en 1 sola operación (Flash Write)
    if (existingData.length > 0) {
        if(sheet.getLastRow() > 1) {
            sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
        }
        sheet.getRange(2, 1, existingData.length, headers.length).setValues(existingData);
        SpreadsheetApp.flush(); // Garantiza la atomicidad cruzada
    }
    
    // BUGFIX: Invalida explícitamente la memoria RAM y metadatos luego de una inyección masiva para evitar Phantom Ghosting!
    if (typeof _invalidateCache === 'function') {
        _invalidateCache(entityName);
    }
    
    Logger.log(`BulkUpsert completado para ${entityName}: ${newRecordsCount} insertados, ${updatedRecordsCount} actualizados.`);
    
    return { status: 'success', insertedCount: (newRecordsCount + updatedRecordsCount), newRecords: newRecordsCount, updatedRecords: updatedRecordsCount };
    } finally {
        lock.releaseLock();
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

/**
 * getDashboardCounters
 * Retorna contadores optimizados usando caché L1 para las tarjetas del dashboard
 */
function getDashboardCounters() {
  const p = Engine_DB.list('Portafolio');
  const e = Engine_DB.list('Equipo');
  const per = Engine_DB.list('Persona');
  
  const cleanP = (p && p.rows) ? p.rows.filter(r => r?.estado !== 'Eliminado').length : 0;
  const cleanE = (e && e.rows) ? e.rows.filter(r => r?.estado !== 'Eliminado').length : 0;
  const cleanPer = (per && per.rows) ? per.rows.filter(r => r?.estado !== 'Eliminado').length : 0;

  return {
    Portafolios: cleanP,
    Equipos: cleanE,
    Personas: cleanPer
  };
}

// Bloque de Protección Híbrida (Jest)
if (typeof module !== 'undefined') {
  module.exports = {
    _handleCreate,
    _handleUpdate,
    _handleDelete,
    _handleRead,
    getDashboardCounters,
    _generateShortUUID
  };
}
