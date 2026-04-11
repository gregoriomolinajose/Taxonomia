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
 *   All functions here are SUPER_ADMIN-only. Access is enforced by the
 *   Execution API — the client-side ABAC check prevents unauthorized invocation.
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
  return getProvisioningStatus(SpreadsheetApp.getActiveSpreadsheet());
}

/**
 * Run full schema reconciliation across all entities.
 * Called by Schema Studio → "Reconciliar DB" button.
 *
 * @returns {Object} Full reconciliation report.
 */
function runSchemaReconcile() {
  return reconcileAll(SpreadsheetApp.getActiveSpreadsheet());
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
  return ensureProvisioned(entityName, SpreadsheetApp.getActiveSpreadsheet());
}
