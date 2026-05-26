/**
 * [E31-AR] API_Admin.gs
 *
 * SUPER_ADMIN GAS endpoints for Schema Governance.
 *
 * Responsibilities (single): expose callable functions for the Config Studio UI
 * (Schema_Studio_UI.html) via google.script.run.
 *
 * Intentionally separate from Schema_Engine.gs (data config) and
 * Adapter_Sheets_Provisioner.gs (infrastructure) to uphold SRP.
 *
 * Security:
 *   All functions here are SUPER_ADMIN-only. The client-side ABAC check
 *   prevents unauthorized invocation. Server-side guard planned in S31.9.
 *
 * Spreadsheet access:
 *   Uses SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID_DB) — required in
 *   WebApp context because getActiveSpreadsheet() returns null server-side.
 *
 * Requires (GAS global scope):
 *   - Schema_Engine.gs          → APP_SCHEMAS
 *   - Adapter_Sheets_Provisioner.gs → getProvisioningStatus(), reconcileAll()
 */

// ─── Schema Studio Endpoints ──────────────────────────────────────────────────

/**
 * Get DB provisioning status for all entities.
 * Called by Schema Studio → DB Health tab.
 *
 * @returns {Object[]} Array of entity health records from Schema Provisioner.
 */
function getSchemaProvisioningStatus() {
  return getProvisioningStatus(_getSpreadsheet());
}

/**
 * Run full schema reconciliation across all entities.
 * Called by Schema Studio → "Reconciliar DB" button.
 *
 * @returns {Object} Full reconciliation report.
 */
function runSchemaReconcile() {
  return reconcileAll(_getSpreadsheet());
}

/**
 * [S31.8 placeholder] Ensure a single entity is provisioned on first write.
 * Intended lazy-init call site: Adapter_Sheets.upsert() before first write.
 * Implementation pending — see story s31.8-ensureprovisioned-wiring.
 *
 * @param {string} entityName - Entity key in APP_SCHEMAS.
 * @returns {Object} Reconciliation result for the entity.
 */
function ensureEntityProvisioned(entityName) {
  return ensureProvisioned(entityName, _getSpreadsheet());
}

// ─── Global Config Endpoints ───────────────────────────────────────────────────

/**
 * Guarda una configuración global de la aplicación.
 * @param {string} configKey La clave de PropertiesService (ej. APP_BRANDING_CONFIG)
 * @param {Object} payload El objeto de configuración
 * @returns {Object} { success: boolean, message: string }
 */
function API_Admin_SaveGlobalConfig(configKey, payload) {
  try {
    payload = payload || {};
    if (!configKey) throw new Error("configKey es requerido");
    
    const VALID_KEYS = ['APP_BRANDING_CONFIG', 'APP_SECURITY_CONFIG', 'APP_WORKSPACE_CONFIG'];
    if (!VALID_KEYS.includes(configKey)) throw new Error("configKey no autorizado");

    PropertiesService.getScriptProperties().setProperty(configKey, JSON.stringify(payload));
    return { success: true, message: "Configuración global guardada correctamente." };
  } catch(e) {
    console.error("Error en API_Admin_SaveGlobalConfig:", e);
    return { success: false, message: "Error al guardar: " + e.message };
  }
}

/**
 * Recupera una configuración global de la aplicación.
 * @param {string} configKey La clave de PropertiesService
 * @returns {Object} { success: boolean, data: string|null }
 */
function API_Admin_GetGlobalConfig(configKey) {
  try {
    const VALID_KEYS = ['APP_BRANDING_CONFIG', 'APP_SECURITY_CONFIG', 'APP_WORKSPACE_CONFIG'];
    if (!VALID_KEYS.includes(configKey)) throw new Error("configKey no autorizado");

    const val = PropertiesService.getScriptProperties().getProperty(configKey);
    return { success: true, data: val };
  } catch(e) {
    return { success: false, message: e.message };
  }
}

/**
 * [S48.4] Obtiene la lista de dominios Workspace autorizados vía OAuth2.
 * @returns {Array<string>} Lista de dominios (ej. ["@dominio.com"])
 */
function API_Admin_GetConnectedDomains() {
  try {
    var props = PropertiesService.getScriptProperties().getProperties();
    var domains = [];
    var prefix = 'oauth2.Workspace_';
    
    for (var key in props) {
      if (key.indexOf(prefix) === 0) {
        var domain = key.substring(prefix.length);
        if (domains.indexOf(domain) === -1) {
          domains.push(domain);
        }
      }
    }
    return domains;
  } catch(e) {
    console.error("[API_Admin] Error obteniendo dominios: ", e);
    return [];
  }
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Returns the application spreadsheet using the explicit ID from CONFIG.
 * Required in WebApp server-side context — getActiveSpreadsheet() returns null
 * when not bound to a spreadsheet (Execution API / WebApp mode).
 * Pattern consistent with Adapter_Sheets.js, Engine_DB.js, Controller_Action.gs.
 */
function _getSpreadsheet() {
  if (typeof CONFIG === 'undefined' || !CONFIG.SPREADSHEET_ID_DB) {
    throw new Error('[API_Admin] CONFIG.SPREADSHEET_ID_DB not set. Check Global_Config.js.');
  }
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID_DB);
}

/**
 * [E6-S65] Persiste la configuración inicial del wizard de primer arranque.
 *
 * Escribe via Adapter_Config.setAll() (PropertiesService) y mantiene
 * compatibilidad retroactiva con ENV_CONFIG y APP_BRANDING_CONFIG para
 * que Code.js y API_Auth.js no necesiten refactorización adicional.
 *
 * @param {Object} payload - Datos del wizard:
 *   { config_id, tenant_name, spreadsheet_id, allowed_domains,
 *     app_title, favicon_url, db_adapter_id }
 * @returns {{ success: boolean, message: string }}
 */
function API_Admin_SaveFirstRunConfig(payload) {
  try {
    if (!payload || !payload.spreadsheet_id || !payload.spreadsheet_id.trim()) {
      throw new Error('spreadsheet_id es requerido para completar la configuración inicial.');
    }
    if (!payload.allowed_domains || payload.allowed_domains.trim().length === 0) {
      throw new Error('allowed_domains es requerido para completar la configuración inicial.');
    }

    // Normalizar dominios (puede venir como CSV string desde el wizard)
    var domainsArr = [];
    if (typeof payload.allowed_domains === 'string') {
      domainsArr = payload.allowed_domains.split(',')
        .map(function(d) { return d.trim().toLowerCase(); })
        .filter(function(d) { return d.length > 0 && d.startsWith('@'); });
    } else if (Array.isArray(payload.allowed_domains)) {
      domainsArr = payload.allowed_domains;
    }

    if (domainsArr.length === 0) {
      throw new Error('Ningún dominio válido. Los dominios deben comenzar con "@" (ej. @empresa.com).');
    }

    // ── 1. Persistir via Adapter_Config (fuente primaria E6) ──────────────
    if (typeof Adapter_Config !== 'undefined') {
      Adapter_Config.setAll({
        config_id:       payload.config_id       || 'SYS-CONFIG-001',
        tenant_name:     payload.tenant_name      || '',
        spreadsheet_id:  payload.spreadsheet_id.trim(),
        allowed_domains: domainsArr.join(','),
        app_title:       payload.app_title        || payload.tenant_name || '',
        favicon_url:     payload.favicon_url       || '',
        db_adapter_id:   payload.db_adapter_id    || 'sheets'
      });
    }

    var props = PropertiesService.getScriptProperties();

    // ── 2. Retrocompatibilidad — ENV_CONFIG ───────────────────────────────
    var currentEnvStr = props.getProperty('ENV_CONFIG');
    var currentEnv = {};
    try { if (currentEnvStr) currentEnv = JSON.parse(currentEnvStr); } catch(e) {}
    currentEnv.SPREADSHEET_ID_DB = payload.spreadsheet_id.trim();
    currentEnv.ALLOWED_DOMAINS   = domainsArr;
    currentEnv.AuthMode          = currentEnv.AuthMode || 'SSO';
    props.setProperty('ENV_CONFIG', JSON.stringify(currentEnv));

    // ── 3. Retrocompatibilidad — APP_BRANDING_CONFIG ───────────────────────
    if (payload.app_title || payload.favicon_url) {
      var branding = {};
      try {
        var bStr = props.getProperty('APP_BRANDING_CONFIG');
        if (bStr) branding = JSON.parse(bStr);
      } catch(e) {}
      if (payload.app_title)  branding.appTitle  = payload.app_title;
      if (payload.favicon_url) branding.faviconUrl = payload.favicon_url;
      props.setProperty('APP_BRANDING_CONFIG', JSON.stringify(branding));
    }

    console.log('[S65] First-run config guardada. Tenant:', payload.tenant_name,
                '| Sheet:', payload.spreadsheet_id, '| Dominios:', domainsArr);

    return { success: true, message: 'Configuración inicial guardada correctamente.' };

  } catch(e) {
    console.error('[S65] Error en API_Admin_SaveFirstRunConfig:', e);
    return { success: false, message: e.message };
  }
}

