---
type: module
name: Form_Engine
purpose: "Metadata-driven, reactive form generator that reads APP_SCHEMAS to build multi-step wizard forms with Ionic Web Components. Includes the generic Adjacency List hierarchy engine (S4.x)."
status: active
depends_on: [UI_Shell, Data_Schemas, DataView_Engine]
depended_by: []
components:
  - FormEngine_UI.html (renderForm, openEditForm, _patchFrontendCache)
  - Math_Engine.js (buildOrdenPath, buildPathName)
---

## Purpose

This module renders every create/edit form in the application without any per-entity HTML. It exists because writing a separate form for `Dominio`, `Portafolio`, `Equipo`, etc. would create massive duplication and break on schema changes. The FormEngine reads `APP_SCHEMAS` at runtime and constructs the Ionic component tree dynamically.

## Architecture

**Rendering Pipeline:**
```
renderForm(entityName, record?)
  → Read APP_SCHEMAS[entityName].fields
  → Build ion-modal with multi-step wizard (ion-content)
  → For each field: create ion-input | ion-select | ion-textarea | subgrid
  → Attach event listeners with 300ms debounce (S4.3)
```

**Hierarchy Engine (S4.x — Adjacency List Model):**
- `buildOrdenPath(payload, parentLookup, parentEdgeField)` (in `Math_Engine.js`) — Derives the logical string path combining parent order and sibling counts, pure function.
- `buildPathName(payload, parentLookup, parentEdgeField, nameField)` (in `Math_Engine.js`) — Resolves the human-readable hierarchy path recursively.

**0ms Pre-Hydration (Edit Mode):**
Before assigning `record[name]` to `<ion-select>`, the engine first injects `<ion-select-option>` elements from the local lookup resolver, then assigns the value. This prevents Ionic's WebComponent from rendering an empty string instead of the selected label.

**Debounce Guard (S4.3):**
The dual event listener `['ionChange','ionInput']` shares a single `debounceTimer`. Calculations execute only after 300ms silence, protecting Event Loop saturation on low-end devices.

## Key Files

| File | Role |
|------|------|
| `FormEngine_UI.html` | ~1500 lines. All form logic, hierarchy engine, save pipeline, edit hydration. |

## Dependencies

- **Runtime:** `window.__APP_CACHE__` (populated by Bootstrap RPC) for in-memory sibling counts
- **Schema:** `APP_SCHEMAS` via global scope (serves both server and client via scriptlet injection)
- **Backend:** `google.script.run.API_Universal_Router('create'|'update', entity, payload)`

## Conventions

- **Payload Sanitization:** `JSON.parse(JSON.stringify(payload))` before every `google.script.run` call
- **Audit Strip:** `delete payload.created_at / updated_at / created_by / updated_by` before dispatch
- **Re-entrancy Guard:** `isSaving` boolean blocks duplicate save clicks
- **Modal Pattern:** All forms open in `<ion-modal>` (never inline) for keyboard-aware mobile layout
