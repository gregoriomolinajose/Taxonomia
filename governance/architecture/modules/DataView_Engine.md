---
type: module
name: DataView_Engine
purpose: "Zero-latency, in-memory data grid renderer. Drives all entity list views from window.__APP_CACHE__ without server round-trips. Wires create/edit/delete actions to FormEngine and provides bulk import via CSV."
status: active
depends_on: [UI_Shell, Data_Schemas]
depended_by: [Form_Engine]
components:
  - DataView_UI.html (DataViewEngine object, table renderer, column sorter, search)
  - SubgridState.js (persistent open/close state for nested subgrid panels)
---

## Purpose

This module exists to give the application **perceived instantaneity**. Since all data is pre-loaded into `window.__APP_CACHE__` at boot, the DataView can re-render entire tables without any server call. This is the "0ms latency" promise of the architecture.

## Architecture

**DataViewEngine Object (`DataView_UI.html`):**
```js
DataViewEngine.render(entityName, containerId)
  → Reads ENTITY_META[entityName] for columns, labels, actions
  → Reads window.__APP_CACHE__[entityName] for data rows
  → Builds ion-grid table with sort headers and search bar
  → Wires "Nuevo" button → renderForm(entityName)
  → Wires "Editar" icon → openEditForm(id)
  → Wires "Eliminar" icon → API delete → cache splice
```

**Cache Injection (Post-Save, Zero-Latency):**
After a successful save, `FormEngine_UI.html` injects the new/updated record directly into `window.__APP_CACHE__[entityName]` and calls `DataViewEngine.render()` again — no server refetch needed.

**Subgrid State (`SubgridState.js`):**
Manages the expanded/collapsed state of nested relation subgrids per entity per record. Prevents layout jumps when re-rendering.

## Key Files

| File | Role |
|------|------|
| `DataView_UI.html` | Full data grid renderer, column config, search, CRUD action wiring. |
| `SubgridState.js` | Persistent accordion state manager for relation subgrids. |

## Dependencies

- **Runtime:** `window.__APP_CACHE__` and `window.ENTITY_META` (set by UI_Shell bootstrap)
- **Backend (write only):** `google.script.run.API_Universal_Router('delete', ...)` for logical deletes

## Conventions

- **`ENTITY_META` config:** Each entity defines `{ label, idField, columns[], iconName, order }` — the data grid renders from this, not from the raw schema
- **PK Resolution (3-tier):** Server reply `response.pk` → payload field starting with `id_` → `ENTITY_META.idField` — prevents orphaned cache entries
