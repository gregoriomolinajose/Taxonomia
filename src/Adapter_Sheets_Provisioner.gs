/**
 * [E31-S31.7] Adapter_Sheets_Provisioner.gs
 *
 * Schema Provisioner — Self-healing database structure reconciliation.
 *
 * Responsibilities:
 *   1. Create a Sheets tab if it doesn't exist (create-if-missing).
 *   2. Add missing columns derived from canonical schema (add-missing).
 *   3. Mark orphaned columns as _ORPHAN_<name> for human review (quarantine).
 *   4. Mark managed sheets with DeveloperMetadata + tab color (mark-managed).
 *   5. Detect orphaned sheets (tabs with no matching entity in APP_SCHEMAS).
 *
 * Triggers:
 *   - On-demand: admin runs reconcileAll() from Config Studio (S31.5/S31.6).
 *   - Lazy: Adapter_Sheets calls ensureProvisioned(entityName) on first write.
 *
 * Tab color convention:
 *   - Blue  (#4285F4): Managed + fully reconciled.
 *   - Yellow (#FDD835): Managed + has orphaned columns needing review.
 *   - Red   (#E53935): Orphaned sheet (no matching entity in schema).
 *
 * Metadata keys (DeveloperMetadata, invisible to end users):
 *   - TAXONOMIA_ENTITY    : Entity name (e.g. "Portafolio")
 *   - TAXONOMIA_MANAGED   : "true"
 *   - TAXONOMIA_PROVISIONED_AT : ISO timestamp of last reconciliation
 *   - TAXONOMIA_ORPHAN    : "true" (orphaned sheets only)
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const PROVISIONER_CONFIG = Object.freeze({
  ORPHAN_PREFIX:     "_ORPHAN_",
  TAB_COLOR_MANAGED: "#4285F4",   // Google Blue — fully reconciled
  TAB_COLOR_WARN:    "#FDD835",   // Yellow — has orphaned columns
  TAB_COLOR_ORPHAN:  "#E53935",   // Red — sheet not in schema
  META_KEY_ENTITY:   "TAXONOMIA_ENTITY",
  META_KEY_MANAGED:  "TAXONOMIA_MANAGED",
  META_KEY_PROV_AT:  "TAXONOMIA_PROVISIONED_AT",
  META_KEY_ORPHAN:   "TAXONOMIA_ORPHAN",
  // Field types that represent real DB columns (excluded: divider, relation)
  EXCLUDED_FIELD_TYPES: ["divider", "relation", "avatar"]
});

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Reconcile all known entities against the active spreadsheet.
 * Called on-demand by admin from Config Studio.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] - Target spreadsheet (defaults to active).
 * @returns {Object} Full reconciliation report.
 */
function reconcileAll(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const report = {
    timestamp: new Date().toISOString(),
    entities: {},
    orphanedSheets: []
  };

  // 1. Provision all known entities
  const entityNames = Object.keys(APP_SCHEMAS).filter(k => k !== '_UI_CONFIG');
  entityNames.forEach(entityName => {
    try {
      report.entities[entityName] = _reconcileEntity(ss, entityName);
    } catch (e) {
      report.entities[entityName] = { error: e.message };
    }
  });

  // 2. Detect orphaned sheets
  ss.getSheets().forEach(sheet => {
    const sheetName = sheet.getName();
    if (!entityNames.includes(sheetName)) {
      _markSheetAsOrphan(sheet);
      report.orphanedSheets.push(sheetName);
    }
  });

  Logger.log('[Provisioner] reconcileAll complete: ' + JSON.stringify(report));
  return report;
}

/**
 * Ensure a single entity is provisioned.
 * Called lazily by Adapter_Sheets before the first write.
 *
 * @param {string} entityName - Entity key in APP_SCHEMAS.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss] - Target spreadsheet.
 * @returns {Object} Reconciliation report for this entity.
 */
function ensureProvisioned(entityName, ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  try {
    return _reconcileEntity(ss, entityName);
  } catch (e) {
    Logger.log('[Provisioner] ensureProvisioned failed for ' + entityName + ': ' + e.message);
    return { error: e.message };
  }
}

// ─── Core Reconciliation ─────────────────────────────────────────────────────

/**
 * Reconcile a single entity against its sheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} entityName
 * @returns {Object} { added, orphaned, alreadyCorrect }
 */
function _reconcileEntity(ss, entityName) {
  const schema   = getAppSchema(entityName);
  const canonical = _getCanonicalHeaders(schema);
  const sheet    = _getOrCreateSheet(ss, entityName);
  const current  = _getCurrentHeaders(sheet);

  const report = {
    entity:         entityName,
    added:          [],
    orphaned:       [],
    alreadyCorrect: []
  };

  // ── Step 1: Add missing columns ──────────────────────────────────────────
  const missingCols = canonical.filter(col => !current.includes(col));
  missingCols.forEach(col => {
    const lastCol = sheet.getLastColumn();
    sheet.insertColumnAfter(Math.max(lastCol, 1));
    const newCol = sheet.getLastColumn();
    sheet.getRange(1, newCol).setValue(col);
    report.added.push(col);
  });

  // ── Step 2: Detect orphaned columns (in sheet but not in canonical schema) ─
  current.forEach(col => {
    if (col.startsWith(PROVISIONER_CONFIG.ORPHAN_PREFIX)) return; // already quarantined
    if (!canonical.includes(col)) {
      _quarantineColumn(sheet, col);
      report.orphaned.push(col);
    } else {
      report.alreadyCorrect.push(col);
    }
  });

  // ── Step 3: Mark / update sheet metadata ────────────────────────────────
  const hasOrphans = report.orphaned.length > 0;
  _markSheetAsManaged(sheet, entityName, hasOrphans);

  return report;
}

// ─── Column Helpers ───────────────────────────────────────────────────────────

/**
 * Derive the ordered list of column names from a schema.
 * Excludes UI-only field types (dividers, relations, avatars).
 *
 * @param {Object} schema - Entity schema object from APP_SCHEMAS.
 * @returns {string[]} Array of column names in declaration order.
 */
function _getCanonicalHeaders(schema) {
  return (schema.fields || [])
    .filter(f => !PROVISIONER_CONFIG.EXCLUDED_FIELD_TYPES.includes(f.type))
    .map(f => f.name);
}

/**
 * Read the current header row (row 1) of a sheet.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {string[]} Non-empty header values.
 */
function _getCurrentHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return headerRow.filter(h => h !== '' && h !== null && h !== undefined);
}

/**
 * Rename an orphaned column header to _ORPHAN_<name>.
 * Data is preserved. Column is visually distinguishable for review.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} colName - Original column name to quarantine.
 */
function _quarantineColumn(sheet, colName) {
  const headers = _getCurrentHeaders(sheet);
  const colIndex = headers.indexOf(colName) + 1; // 1-based
  if (colIndex > 0) {
    sheet.getRange(1, colIndex).setValue(PROVISIONER_CONFIG.ORPHAN_PREFIX + colName);
    // Light orange background to visually flag the column
    sheet.getRange(1, colIndex).setBackground("#FFE0B2");
  }
}

// ─── Sheet Helpers ────────────────────────────────────────────────────────────

/**
 * Find an existing sheet or create a new one with the entity name.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @param {string} entityName
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function _getOrCreateSheet(ss, entityName) {
  let sheet = ss.getSheetByName(entityName);
  if (!sheet) {
    sheet = ss.insertSheet(entityName);
    Logger.log('[Provisioner] Created new sheet: ' + entityName);
  }
  return sheet;
}

/**
 * Mark a sheet as a managed Taxonomia entity.
 * Sets tab color and DeveloperMetadata (invisible to users).
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} entityName
 * @param {boolean} hasOrphans - If true, uses warning color.
 */
function _markSheetAsManaged(sheet, entityName, hasOrphans) {
  const color = hasOrphans
    ? PROVISIONER_CONFIG.TAB_COLOR_WARN
    : PROVISIONER_CONFIG.TAB_COLOR_MANAGED;

  sheet.setTabColor(color);

  // Write/update DeveloperMetadata (invisible key-value store on the sheet)
  _upsertDeveloperMetadata(sheet, PROVISIONER_CONFIG.META_KEY_MANAGED, "true");
  _upsertDeveloperMetadata(sheet, PROVISIONER_CONFIG.META_KEY_ENTITY, entityName);
  _upsertDeveloperMetadata(sheet, PROVISIONER_CONFIG.META_KEY_PROV_AT, new Date().toISOString());
  // Clear orphan flag if previously set
  _removeDeveloperMetadata(sheet, PROVISIONER_CONFIG.META_KEY_ORPHAN);
}

/**
 * Mark a sheet as an orphaned (unmanaged) tab.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 */
function _markSheetAsOrphan(sheet) {
  sheet.setTabColor(PROVISIONER_CONFIG.TAB_COLOR_ORPHAN);
  _upsertDeveloperMetadata(sheet, PROVISIONER_CONFIG.META_KEY_ORPHAN, "true");
  Logger.log('[Provisioner] Orphaned sheet flagged: ' + sheet.getName());
}

// ─── DeveloperMetadata Helpers ────────────────────────────────────────────────

/**
 * Insert or update a DeveloperMetadata entry on a sheet.
 * DeveloperMetadata is invisible to end users in the Sheets UI.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} key
 * @param {string} value
 */
function _upsertDeveloperMetadata(sheet, key, value) {
  try {
    const existing = sheet.getDeveloperMetadata().find(m => m.getKey() === key);
    if (existing) {
      existing.setValue(value);
    } else {
      sheet.addDeveloperMetadata(
        key,
        value,
        SpreadsheetApp.DeveloperMetadataVisibility.DOCUMENT
      );
    }
  } catch (e) {
    // DeveloperMetadata may not be available in all execution contexts (e.g., Vitest)
    Logger.log('[Provisioner] DeveloperMetadata write skipped: ' + e.message);
  }
}

/**
 * Remove a DeveloperMetadata entry from a sheet if it exists.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} key
 */
function _removeDeveloperMetadata(sheet, key) {
  try {
    const existing = sheet.getDeveloperMetadata().find(m => m.getKey() === key);
    if (existing) existing.remove();
  } catch (e) {
    // Silently skip — non-critical cleanup
  }
}

// ─── Query API ────────────────────────────────────────────────────────────────

/**
 * Get the current provisioning status of all known entity sheets.
 * Used by Config Studio to display the DB health view.
 *
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} [ss]
 * @returns {Object[]} Array of { entity, exists, managed, orphanedColumns, provisionedAt }
 */
function getProvisioningStatus(ss) {
  ss = ss || SpreadsheetApp.getActiveSpreadsheet();
  const entityNames = Object.keys(APP_SCHEMAS).filter(k => k !== '_UI_CONFIG');

  return entityNames.map(entityName => {
    const sheet = ss.getSheetByName(entityName);
    if (!sheet) return { entity: entityName, exists: false, managed: false };

    const meta = _readDeveloperMetadata(sheet);
    const canonical = _getCanonicalHeaders(getAppSchema(entityName));
    const current = _getCurrentHeaders(sheet);
    const orphanedColumns = current.filter(c =>
      c.startsWith(PROVISIONER_CONFIG.ORPHAN_PREFIX)
    );
    const missingColumns = canonical.filter(c => !current.includes(c));

    return {
      entity:           entityName,
      exists:           true,
      managed:          meta[PROVISIONER_CONFIG.META_KEY_MANAGED] === "true",
      provisionedAt:    meta[PROVISIONER_CONFIG.META_KEY_PROV_AT] || null,
      orphanedColumns,
      missingColumns,
      isHealthy:        orphanedColumns.length === 0 && missingColumns.length === 0
    };
  });
}

/**
 * Read all DeveloperMetadata from a sheet into a plain object.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {Object} key → value map
 */
function _readDeveloperMetadata(sheet) {
  const result = {};
  try {
    sheet.getDeveloperMetadata().forEach(m => {
      result[m.getKey()] = m.getValue();
    });
  } catch (e) {
    // Silently return empty metadata (non-GAS environments)
  }
  return result;
}

// ─── Node.js export (for unit tests) ─────────────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = {
    reconcileAll,
    ensureProvisioned,
    getProvisioningStatus,
    _getCanonicalHeaders,
    _getCurrentHeaders,
    _quarantineColumn,
    PROVISIONER_CONFIG
  };
}
