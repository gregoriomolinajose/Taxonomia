---
type: module
name: Data_Schemas
purpose: "The Single Source of Truth brain of the system. Defines all entity field models, validators, lookupSources, event triggers, and hierarchy calcParams without any UI or persistence coupling."
status: active
depends_on: []
depended_by: [GAS_Server, DB_Layer, Form_Engine, DataView_Engine]
components:
  - Schema_Engine.gs (APP_SCHEMAS constant — the global entity registry)
---

## Purpose

This module is the **metadata brain** of the entire platform. It exists because every other module (FormEngine, DataView, Engine_DB) must derive its behavior from a single, authoritative definition — not from hardcoded logic scattered across files. Changes to an entity (adding a field, adding a hierarchy) require only editing this file.

## Architecture

`APP_SCHEMAS` is a global constant `Object` where each key is an entity name:

```js
APP_SCHEMAS.Dominio = {
  primaryKey: "id_dominio",
  titleField:  "n0_es",
  fields: [
    { name: "id_dominio", type: "hidden", primaryKey: true },
    { name: "id_dominio_padre", type: "select", lookupSource: "getDominiosPadreOptions",
      triggers_refresh_of: ["orden_path", "path_completo_es"] },
    { name: "orden_path", type: "text", readonly: true,
      calculatedValue: "getGenericOrdenPath",
      calcParams: { entity: "Dominio", parentField: "id_dominio_padre", levelField: "nivel_tipo", orderField: "orden_path" } },
    ...
  ]
}
```

**Key Schema Features:**
- `triggers_refresh_of`: Wires field change events to downstream calculated fields (Zero-Touch UI)
- `lookupSource`: Points to a server-side options function fetched via RPC or in-memory cache
- `calculatedValue + calcParams`: Injects the generic hierarchy engine functions at runtime — **no hardcoding per entity**
- `relation` type: Declares 1:N relationships for the Nested Orchestrator in Engine_DB

## Key Files

| File | Role |
|------|------|
| `Schema_Engine.gs` | Defines all `APP_SCHEMAS` entities. Runs in both GAS and Node (Jest) contexts. |

## Conventions

- **Guardrail GR-06:** Every entity must be an Object with a `fields` array — no exceptions
- **SSOT Rule:** One `orden_path`, one `path_completo_es` per entity — duplication is a schema violation
- **FK Convention:** Adjacency List fields are named `id_{singular_parent}` (e.g. `id_dominio_padre`)
- **calcParams API:** `{ entity, parentField, levelField, orderField, nameField, pathField }` — the hierarchy engine reads these, never hardcodes entity names
