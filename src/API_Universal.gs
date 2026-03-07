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
      // responseData = _handleRead(entity, data);
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
 * _handleCreate
 * Inyecta campos obligatorios (Time-Travel / Auditoría) y llama a Engine_DB.
 */
function _handleCreate(entityName, payload) {
  // Inyección de campos de auditoría (Regla docs/rules_db.md #4)
  payload.created_at = new Date().toISOString();
  
  // En el entorno de GAS, tenemos Session. En Jest, usamos el mock global.
  payload.updated_by = Session.getActiveUser().getEmail();

  // Llamar al motor agnóstico
  const result = Engine_DB.create(entityName, payload);
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
      // Si el id está vacío desde el front-end (comportamiento normal de creación nueva), autoasignar:
      const pkField = 'id_' + entityName.toLowerCase();
      if (!payload[pkField] || String(payload[pkField]).trim() === '') {
        payload[pkField] = entityName.toUpperCase().substring(0,4) + '-' + new Date().getTime();
      }
      
      responseData = _handleCreate(entityName, payload);
    } else if (action === 'read') {
      // responseData = _handleRead(entityName, payload);
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

// Bloque de Protección Híbrida (Jest vs GAS) - Regla 5 de docs/rules_db.md
if (typeof module !== 'undefined') {
  module.exports = {
    _handleCreate,
    API_Universal_Router
  };
}
