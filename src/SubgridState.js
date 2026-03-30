/**
 * SubgridState.js
 * Pure state management functions for the Subgrid (Master-Detail) component.
 *
 * These functions have zero side-effects and zero DOM dependencies.
 * They are the single source of truth for the Subgrid's business logic
 * and can be unit-tested independently from the UI.
 *
 * Rule: ALL subgrid operations in FormEngine_UI.html MUST delegate
 *       to these functions instead of using inline logic.
 */

'use strict';

/**
 * Normalizes an ID string for robust comparison.
 * Handles dirty IDs (leading/trailing spaces, mixed case).
 * @param {*} id
 * @returns {string}
 */
function _normalizeId(id) {
    return String(id || '').trim().toUpperCase();
}

/**
 * initSubgridState(parentData, fieldName)
 * Hydrates the initial subgrid state from a parent record.
 *
 * @param {Object|null} parentData  - The full parent record (e.g. Portafolio).
 * @param {string}      fieldName   - The relation field name (e.g. 'grupos_hijos').
 * @returns {Array} - A NEW array of child records (never the original reference).
 */
function initSubgridState(parentData, fieldName) {
    if (parentData && Array.isArray(parentData[fieldName])) {
        return [...parentData[fieldName]]; // defensive copy — immutable hydration
    }
    return [];
}

/**
 * filterAvailableOptions(allOptions, linkedRecords, pkField, rulesContext)
 * Returns only the options that are NOT already linked in the subgrid and are topologically valid.
 * Used to populate the selection modal.
 *
 * @param {Array}  allOptions     - Full catalog of { value, label, nivel_tipo, hasActiveParent }.
 * @param {Array}  linkedRecords  - Records already in the subgrid.
 * @param {string} pkField        - PK field name within linkedRecords.
 * @param {Object} rulesContext   - { topologyRules: {}, currentLevel: Number, relationType: 'padre' | 'hijo' } (S8.5)
 * @returns {Array} - Filtered options safe to show in the modal.
 */
function filterAvailableOptions(allOptions, linkedRecords, pkField, rulesContext = null) {
    let filtered = (allOptions || []).filter(opt => {
        const normalizedValue = _normalizeId(opt.value);
        return !(linkedRecords || []).some(r => _normalizeId(r[pkField]) === normalizedValue);
    });

    // [S8.5] UI Dumbness Guards (Topological Pre-Filters)
    if (rulesContext && rulesContext.topologyRules) {
        const rules = rulesContext.topologyRules;
        const cLevel = Number(rulesContext.currentLevel) || 0;
        const isHijo = rulesContext.relationType === 'hijo';
        const isPadre = rulesContext.relationType === 'padre';

        // 1. Orphan Stealing Ban (Graph M:N restricted to 1:N exclusively via steal banning)
        if (isHijo && rules.allowOrphanStealing === false) {
            filtered = filtered.filter(opt => opt.hasActiveParent !== true);
        }

        // 2. Depth Mathematical Guard (Restricting visual options preventing loop-jumps)
        if (rules.levelFiltering === true && cLevel > 0) {
            if (rules.strictLevelJumps === true) {
                // Strict Mode: Exactly +1 or -1
                if (isHijo) {
                    filtered = filtered.filter(opt => Number(opt.nivel_tipo) === cLevel + 1);
                } else if (isPadre) {
                    const targetPadreLevel = cLevel - 1;
                    if (targetPadreLevel > 0) {
                         filtered = filtered.filter(opt => Number(opt.nivel_tipo) === targetPadreLevel);
                    } else if (targetPadreLevel === 0 && rules.rootRequiresNoParent) {
                         // Node is Root (Level 1), no parents allowed
                         filtered = [];
                    }
                }
            } else {
                // Lax Mode: Asymmetric Proximity (Any level below for child, any level above for parent)
                if (isHijo) {
                    filtered = filtered.filter(opt => Number(opt.nivel_tipo) > cLevel);
                } else if (isPadre) {
                    if (cLevel === 1 && rules.rootRequiresNoParent) {
                         filtered = [];
                    } else {
                         filtered = filtered.filter(opt => Number(opt.nivel_tipo) < cLevel);
                    }
                }
            }
        }
    }

    return filtered;
}

/**
 * linkRecord(childRecords, newRecord)
 * Adds a record to the subgrid state immutably.
 * Guarantees no duplicates by checking the pkField before adding.
 *
 * @param {Array}  childRecords - Current subgrid state.
 * @param {Object} newRecord    - Record to add (must have a pkField).
 * @param {string} pkField      - PK field name in newRecord.
 * @returns {Array} - NEW array with the new record appended.
 */
function linkRecord(childRecords, newRecord, pkField) {
    // Idempotency check: don't add if already linked
    if ((childRecords || []).some(r => _normalizeId(r[pkField]) === _normalizeId(newRecord[pkField]))) {
        return [...(childRecords || [])];
    }
    return [...(childRecords || []), { ...newRecord }];
}

/**
 * unlinkRecord(childRecords, pkField, targetId)
 * Removes a record from the subgrid state immutably.
 *
 * @param {Array}  childRecords - Current subgrid state.
 * @param {string} pkField      - PK field name.
 * @param {string} targetId     - ID of the record to remove.
 * @returns {{ state: Array, removed: Object|null }}
 *   - state:   NEW array without the removed record.
 *   - removed: The removed record (for backend diffing awareness), or null.
 */
function unlinkRecord(childRecords, pkField, targetId) {
    const normalizedTarget = _normalizeId(targetId);
    const removed = (childRecords || []).find(r => _normalizeId(r[pkField]) === normalizedTarget) || null;
    const state = (childRecords || []).filter(r => _normalizeId(r[pkField]) !== normalizedTarget);
    return { state, removed };
}

/**
 * buildSavePayload(flatParentData, fieldName, childRecords, foreignKey, parentPK)
 * Merges the subgrid state back into the parent payload for saving.
 * Each child is enriched with the foreignKey pointing to the parent.
 *
 * @param {Object} flatParentData - Parent form data (without children).
 * @param {string} fieldName      - Relation field name (e.g. 'grupos_hijos').
 * @param {Array}  childRecords   - Current subgrid state.
 * @param {string} foreignKey     - FK field name on each child.
 * @param {string} parentPK       - ID value of the parent record.
 * @returns {Object} - Complete payload ready for Engine_DB.orchestrateNestedSave.
 */
function buildSavePayload(flatParentData, fieldName, childRecords, foreignKey, parentPK) {
    const enrichedChildren = (childRecords || []).map(child => ({
        ...child,
        [foreignKey]: parentPK
    }));
    return {
        ...flatParentData,
        [fieldName]: enrichedChildren
    };
}

// Universal Wrapper: soporta Node.js (Tests/Jest) y Browser (GAS HTML Service)
if (typeof module !== 'undefined' && module.exports) {
    // Entorno Node.js / CommonJS
    module.exports = { _normalizeId, initSubgridState, filterAvailableOptions, linkRecord, unlinkRecord, buildSavePayload };
} else if (typeof window !== 'undefined') {
    // Entorno Browser (GAS)
    window.SubgridState = { _normalizeId, initSubgridState, filterAvailableOptions, linkRecord, unlinkRecord, buildSavePayload };
}
