# Epic E6: Arquitectura Escalable de Grafos

## Objective
Desacoplar las operaciones SCD-2 N:M del motor CRUD generalizando el enfoque "Config-Driven" y aislando las mutaciones de Grafo en un Service Layer.

## Boundaries
**In Scope:**
- Extensión Config-Driven (`isTemporalGraph` en `Schema_Engine`).
- Creación de `Engine_Graph.js` para manipulación de aristas SCD-2.
- Refactorización de `orchestrateNestedSave`.

**Out Scope:**
- Componentes UI (FormEngine_UI) — ya fueron agnostizados en E5.
- Front-end Treemaps.

## Planned Stories
### Progress Tracking
| Story | Size | Status | Actual | Velocity | Notes |
|-------|------|--------|--------|----------|-------|
| S6.1 - Config-Driven SCD-2 | M | Pending | - | - | Esquema Dinámico |
| S6.2 - Engine_Graph Service | M | Pending | - | - | Single Responsibility |

## Definition of Done
- `npm test` verde.
- Grafo transacciona limpiamente sin If hardcodeados en el orquestador principal.
