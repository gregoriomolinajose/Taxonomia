---
type: module
name: DB_Layer
purpose: "Agnostic persistence facade implementing Cache-Aside, Dual-Write, and nested orchestration (maestro-detalle) without coupling to any specific database vendor."
status: active
depends_on: [GAS_Server, Data_Schemas]
depended_by: [GAS_Server]
components:
  - Engine_DB.js (facade router, cache invalidation, nested save orchestrator)
  - Adapter_Sheets.js (Google Sheets ORM with upsert, list, remove, audit injection)
  - Adapter_CloudDB.js (Cloud NoSQL stub for Dual-Write resilience)
---

## Purpose

This module decouples the application from any specific database backend. It exists to enforce **Guardrail GR-01 and GR-02**: Engine_DB must be a pure routing façade (no direct API calls), and all writes must go to Sheets AND optionally CloudDB simultaneously.

## Architecture

**Adapter Pattern:**
```
Engine_DB.save(tableName, payload, config)
  ├── config.useSheets → Adapter_Sheets.upsert(...)   [sync]
  └── config.useCloudDB → Adapter_CloudDB.upsert(...) [async, non-blocking]
```

**Cache-Aside (Guardrail GR-07):**
- Before any Sheets read, checks `CacheService.getScriptCache()` (key: `CACHE_LIST_{entity}`)
- After any write, calls `_invalidateCache(entity)` to bust the RAM entry

**Nested Orchestration (Maestro-Detalle):**
`orchestrateNestedSave` auto-extracts child records from the payload (based on `Schema.type === 'relation'`), saves the parent first, injects the FK, runs an orphan diffing pass, and upserts children in batch — all in a single transaction.

**Audit Trail Injection (Guardrail GR-07):**
`Adapter_Sheets.upsert` silently stamps `created_at`, `updated_at`, `created_by`, `updated_by` on every row write. The frontend is **never** the source of these fields.

## Key Files

| File | Role |
|------|------|
| `Engine_DB.js` | Facade. CRUD dispatcher, cache invalidator, nested orchestrator. |
| `Adapter_Sheets.js` | Google Sheets ORM. Row header mapping, upsert, batch upsert, audit injection. |
| `Adapter_CloudDB.js` | Stub for dual-write to cloud NoSQL. Graceful degradation if unreachable. |

## Dependencies

- **Upstream:** `Data_Schemas` (reads `APP_SCHEMAS` to traverse relations)
- **Downstream:** Google Sheets (SpreadsheetApp API)

## Conventions

- **snake_case headers** enforced by Adapter_Sheets (Guardrail GR-03)
- **PK Convention:** `id_{singular_entity}` — e.g. `id_dominio`, `id_portafolio`
- **Logical delete:** `.remove()` sets `deleted_at` timestamp, never physically deletes rows
