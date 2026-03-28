---
type: module
name: GAS_Server
purpose: "Google Apps Script server layer that bootstraps the SPA and routes all RPC calls from the frontend."
status: active
depends_on: [Data_Schemas]
depended_by: [DB_Layer, UI_Shell]
components:
  - Code.js (entry point, doGet/doPost handlers)
  - API_Universal.gs (API_Universal_Router, CRUD dispatchers, lookup functions)
  - API_Auth.js (getUserIdentity, domain allowlist)
  - Cache_Utils.gs (CacheService helpers)
---

## Purpose

This module is the **server-side gateway** of the Taxonomia SPA. It exists because Google Apps Script (GAS) is the only runtime capable of:
1. Serving authenticated HTML via `doGet()` (the SPA shell)
2. Executing server-side logic called from the browser via `google.script.run` RPC (no HTTP overhead, no CORS)

Without this module, the frontend would be a static page with no data connectivity.

## Architecture

**Entry Points**
- `doGet(e)` → Renders `Index.html` using `createTemplateFromFile` + `evaluate()` (mandatory for scriptlet injection via `<?!= include('...') ?>`).
- `API_Universal_Router(action, entity, payload)` → The single RPC endpoint called by `google.script.run` from `FormEngine_UI.html`.

**Router Flow**
```
google.script.run.API_Universal_Router('create', 'Dominio', {...})
  → Resolves PK via _generateShortUUID if missing
  → _handleCreate(entity, payload)
  → Engine_DB.create(entity, payload)
  → Adapter_Sheets.upsert(...)
```

**Lookup Functions**
`getPortafoliosOptions()`, `getDominiosPadreOptions()`, etc. are called **synchronously** from the frontend via `react trigger` dependency injection in `FormEngine_UI`. They use `CacheService` to avoid Sheets re-reads (TTL=1h).

## Key Files

| File | Role |
|------|------|
| `Code.js` | GAS Web App entry point. Renders HTML shell. |
| `API_Universal.gs` | Routes all CRUD and bulk operations. Generates UUIDs. Serializes payloads. |
| `API_Auth.js` | Domain-based access guard. Returns `{authorized:true/false, email}`. |
| `Cache_Utils.gs` | Thin wrapper over `CacheService.getScriptCache()` for module reuse. |

## Dependencies

- **Upstream:** `Data_Schemas` (reads APP_SCHEMAS to identify PKs, relations, lookup functions)
- **Downstream:** `DB_Layer` (dispatches persistence), `UI_Shell` (consumes RPC responses)

## Conventions

- **UUID Format:** `PREFIX-XXXXX` where prefix = first 4 chars of entity name. e.g. `DOMI-4QCX6`
- **Serialization:** All server responses use `JSON.parse(JSON.stringify(...))` to destroy GAS native Date proxies (Regla 10) before `postMessage`.
- **Audit Trail:** `created_at`, `updated_at`, `updated_by` are injected server-side by `Adapter_Sheets` — never accepted from the frontend payload.
