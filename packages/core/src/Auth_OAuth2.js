/**
 * @file Auth_OAuth2.js
 * 
 * [S48.4] Motor de Integración OAuth2 (3-Legged)
 * Maneja el flujo de autorización y almacenamiento de tokens para dominios externos de Google Workspace.
 * Requiere la librería OAuth2 de Apps Script instalada.
 */

/**
 * Obtiene las credenciales del cliente configuradas por el administrador.
 */
function Auth_GetCredentials() {
  var props = PropertiesService.getScriptProperties();
  return {
    clientId: props.getProperty('OAUTH_CLIENT_ID') || '',
    clientSecret: props.getProperty('OAUTH_CLIENT_SECRET') || ''
  };
}

/**
 * Crea el servicio OAuth temporal utilizado exclusivamente para iniciar el flujo
 * y atrapar el callback antes de conocer a qué dominio pertenece.
 */
function Auth_GetTempService() {
  var creds = Auth_GetCredentials();
  return OAuth2.createService('Workspace_Temp')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setClientId(creds.clientId)
    .setClientSecret(creds.clientSecret)
    .setCallbackFunction('doGet') // Redirige de vuelta al Web App
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope('https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/userinfo.email')
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}

/**
 * Crea el servicio OAuth asociado a un dominio específico.
 * Se utiliza para refrescar y obtener el token de manera transpartente.
 */
function Auth_GetDomainService(domain) {
  var creds = Auth_GetCredentials();
  return OAuth2.createService('Workspace_' + domain)
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://oauth2.googleapis.com/token')
    .setClientId(creds.clientId)
    .setClientSecret(creds.clientSecret)
    .setPropertyStore(PropertiesService.getScriptProperties())
    .setScope('https://www.googleapis.com/auth/admin.directory.user.readonly https://www.googleapis.com/auth/userinfo.email');
}

/**
 * [Endpoint API] Genera la URL de autorización para el Frontend.
 */
function Auth_GetWorkspaceAuthUrl() {
  var creds = Auth_GetCredentials();
  if (!creds.clientId || !creds.clientSecret) {
    throw new Error('Las credenciales OAuth (OAUTH_CLIENT_ID y OAUTH_CLIENT_SECRET) no están configuradas en Script Properties.');
  }
  var service = Auth_GetTempService();
  return service.getAuthorizationUrl();
}

/**
 * Maneja el callback de Google tras una autorización exitosa.
 * Extrae el dominio del usuario autenticado y asocia el Refresh Token a ese dominio.
 */
function Auth_HandleOAuthCallback(request) {
  var service = Auth_GetTempService();
  var authorized = service.handleCallback(request);
  
  if (authorized) {
    try {
      // 1. Obtener información del administrador que autorizó para conocer su dominio
      var res = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { 'Authorization': 'Bearer ' + service.getAccessToken() }
      });
      var userInfo = JSON.parse(res.getContentText());
      var email = userInfo.email;
      var domain = email.substring(email.indexOf('@')); // ej: @dominio.com
      
      // 2. Extraer el token crudo del servicio temporal
      var token = service.getToken();
      
      // 3. Inyectar el token en el servicio de dominio destino
      // OAuth2 library guarda los tokens bajo la llave "oauth2.<serviceName>"
      PropertiesService.getScriptProperties().setProperty('oauth2.Workspace_' + domain, JSON.stringify(token));
      
      // 4. Limpiar el token temporal para futuras autorizaciones
      service.reset();
      
      // Html de Éxito
      var html = '<div style="font-family: sans-serif; text-align: center; padding: 40px; color: #333;">' +
                 '<h2 style="color: #2dd36f;">Conexión Exitosa</h2>' +
                 '<p>El dominio <b>' + domain + '</b> ha sido autorizado correctamente.</p>' +
                 '<p style="font-size: 0.85em; color: #666;">Puedes cerrar esta ventana y regresar a Taxonomia.</p>' +
                 '</div>' +
                 '<script>setTimeout(function(){ window.close(); }, 4000);</script>';
                 
      return HtmlService.createHtmlOutput(html).setTitle('Taxonomia - Conexión Exitosa');
      
    } catch(e) {
      return HtmlService.createHtmlOutput('<h3 style="color:red; font-family:sans-serif;">Error Interno: ' + e.message + '</h3>');
    }
  } else {
    return HtmlService.createHtmlOutput('<h3 style="color:red; font-family:sans-serif;">Acceso Denegado por el Usuario.</h3>');
  }
}

/**
 * Obtiene un Access Token válido para un dominio externo.
 * @param {string} domain El dominio, ej. "@dominio.com"
 * @returns {string|null} Access Token si está autorizado, o null.
 */
function Auth_GetTokenForDomain(domain) {
  var svc = Auth_GetDomainService(domain);
  if (svc.hasAccess()) {
    return svc.getAccessToken();
  }
  return null;
}
