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
    } else if (action === 'read') {
      responseData = _handleRead(entityName);
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

    return {
      status: "success",
      data: responseData
    };
  } catch (error) {
    Logger.log('🚀 ERROR Atrapado en Servidor: ' + error.message + '\n' + error.stack);
    return {
      status: "error", // Según el if(response.status === 'success') de UI
      success: false,   // Por seguridad
      message: error.message
    };
  }
}

// Bloque de Persistencia Dinámicas (Relacional 1:N)
function getGruposProductosOptions() {
  try {
    if (typeof SpreadsheetApp === 'undefined') {
      return [{ value: "MOCK-1", label: "Local SaaS Mock" }, { value: "MOCK-2", label: "Local B2B Mock" }];
    }
    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { SPREADSHEET_ID_DB: '' };
    if (!config.SPREADSHEET_ID_DB) return [];
    
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID_DB);
    const sheet = ss.getSheetByName('DB_Grupo_Productos');
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return []; // Solo cabeceras
    
    // Normalizar headers (Regla normalización)
    const headers = data[0].map(h => h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
    const idIndex = headers.indexOf('id_grupo_producto');
    const nameIndex = headers.indexOf('nombre');
    
    if (idIndex === -1 || nameIndex === -1) return [];
    
    const options = [];
    for (let i = 1; i < data.length; i++) { // Salta cabecera
      const id = String(data[i][idIndex]).trim();
      const nombre = String(data[i][nameIndex]).trim();
      if (id && nombre) {
        options.push({ value: id, label: nombre });
      }
    }
    return options;
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
    if (typeof SpreadsheetApp === 'undefined') {
      return [{ value: "MOCK-PORT1", label: "Portafolio Mock Local" }];
    }
    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { SPREADSHEET_ID_DB: '' };
    if (!config.SPREADSHEET_ID_DB) return [];

    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID_DB);
    const sheet = ss.getSheetByName('DB_Portafolio');
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0].map(h => h.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
    const idIndex   = headers.indexOf('id_portafolio');
    const nameIndex = headers.indexOf('nombre');

    if (idIndex === -1 || nameIndex === -1) return [];

    const options = [];
    for (let i = 1; i < data.length; i++) {
      const id     = String(data[i][idIndex]).trim();
      const nombre = String(data[i][nameIndex]).trim();
      if (id && nombre) options.push({ value: id, label: nombre });
    }
    return options;
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
    if (typeof SpreadsheetApp === 'undefined') {
      return [{ value: "MOCK-P1", label: "Producto Mock Local" }];
    }
    const config = (typeof CONFIG !== 'undefined') ? CONFIG : { SPREADSHEET_ID_DB: '' };
    if (!config.SPREADSHEET_ID_DB) return [];

    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID_DB);
    const sheet = ss.getSheetByName('DB_Producto');
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) return [];

    const headers = data[0].map(h => h.toLowerCase().trim()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
    const idIndex   = headers.indexOf('id_producto');
    const nameIndex = headers.indexOf('nombre_producto');

    if (idIndex === -1 || nameIndex === -1) return [];

    const options = [];
    for (let i = 1; i < data.length; i++) {
      const id     = String(data[i][idIndex]).trim();
      const nombre = String(data[i][nameIndex]).trim();
      if (id && nombre) options.push({ value: id, label: nombre });
    }
    return options;
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
