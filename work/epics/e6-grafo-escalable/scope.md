# Epic E6: Arquitectura Escalable de Grafos

## Objective
Desacoplar las operaciones SCD-2 N:M del motor CRUD generalizando el enfoque "Config-Driven" y aislando las mutaciones de Grafo en un Service Layer.

## Boundaries
**In Scope:**
- Extensión Config-Driven (`isTemporalGraph` y `topology` en `Schema_Engine`).
- Creación de `Engine_Graph.js` para manipulación de aristas SCD-2.
- Diccionario de Estructuras (Lineal, Funcional, Matricial, Equipos, etc.) con validación de cardinalidad (1:N, M:N).
- Refactorización de `orchestrateNestedSave` en `Engine_DB`.

**Out Scope:**
- Alteraciones en UI de componentes (FormEngine_UI) — ya fueron agnostizados.
- Refactor visual de Treemaps.

## Planned Stories
### Progress Tracking
| Story | Size | Status | Actual | Velocity | Notes |
|-------|------|--------|--------|----------|-------|
| S6.1 - Config-Driven SCD-2 | M | Done | - | - | Esquema Dinámico en Schema_Engine |
| S6.2 - Diccionario de Topologías | S | Done | - | - | Engine_Graph Validador de Cardinalidad Estructural |
| S6.3 - Engine_Graph Service | M | Done | - | - | Single Responsibility cumplido prematuramente en S6.1 (ADR-002) |
| S6.4 - Convention Defaulting (H8) | S | Done | - | - | Default implícito a JERARQUICA_LINEAL |
| S6.5 - Polymorphic Handlers (H1) | M | Pending | - | - | Strategy Pattern para topologías dinámicas |

## Definition of Done
- `npm test` verde.
- Inserción y Modificación de aristas DAG validadas.
- Eliminación total de comparadores estáticos `if (entity === 'Relacion_Dominios')`.
