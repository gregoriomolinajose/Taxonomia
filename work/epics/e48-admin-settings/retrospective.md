# Epic Retrospective: E48 Admin Settings (Schema-Driven ETL)

**Completed:** 2026-05-04
**Duration:** 7 days (started ~2026-04-28)
**Stories:** 7 stories delivered

---

## Summary

Se logró la migración exitosa de la arquitectura ETL hacia un modelo completamente declarativo (Schema-Driven). Se refactorizó la lógica de negocio y de los interceptores, removiendo "wrappers" redundantes en favor de reglas de metadatos dictadas por el `Schema_Engine.js`. Adicionalmente, se logró una optimización profunda de rendimiento en I/O con Google Sheets mediante consolidación de lotes (O(1)) y deduplicación en memoria.

## Metrics

| Metric | Value | Notes |
|--------|-------|-------|
| Stories Delivered | 7 | S48.1 a S48.7 |
| Tests Added/Fixed | 15+ | Múltiples regresiones de ETL y Base de Datos solucionadas |
| Calendar Days | ~7 | |

### Story Breakdown

| Story | Size | SP | Key Learning |
|-------|:----:|:--:|--------------|
| S48.1 | M | 3 | Despliegue de interceptores iniciales y estandarización UUID. |
| S48.2 | S | 2 | Feedback visual (highlighting) de éxito/error en hojas de cálculo. |
| S48.3 | M | 3 | Resolución de problemas de Idempotencia en relaciones 1:N y M:N (SCD-2). |
| S48.4 | L | 5 | Refactorización de topología para Capacidad y Dominios. |
| S48.5 | M | 3 | Migración de la sincronización de Workspaces a Interceptores (Fail-open JIT). |
| S48.6 | S | 2 | Despliegue y validación del nuevo motor _provisionRelationalStubs. |
| S48.7 | M | 3 | Migración completa a Schema-Driven, eliminación de wrappers hardcoded. Estabilización Vitest. |

## What Went Well

- La consolidación de la topología en `Schema_Engine.js` reduce drásticamente el código repetitivo en la capa de negocio.
- Los tests de regresión, especialmente `MasterDetail_Regression.test.js`, fueron invaluables para verificar que las optimizaciones O(1) no alteraran la integridad del grafo SCD-2.
- La colaboración asistida por IA identificó y corrigió las discrepancias de Vitest de manera ágil.

## What Could Be Improved

- La deuda técnica de dependencias `.gs` vs `.js` en los tests causó fricción.
- Tiempos muertos de estabilización de CI/CD (pruebas) por el mock desactualizado del `CacheService` y `global.Engine_DB`. 

## Patterns Discovered

| ID | Pattern | Context |
|----|---------|---------|
| PAT-188 | Schema-Driven Edge Provisioning | Definir M:N y 1:N en Schema_Engine en vez de Business Interceptors. |
| PAT-189 | Batch Consolidation in Memory | Consolidar inserciones y desvinculaciones huérfanas en un solo payload hacia Sheet API para evitar Rate Limits y contención de cerrojos (Locks). |

## Process Insights

- Las pruebas unitarias deben evolucionar en tándem con el motor. Las pruebas que se enfocaban en el *cómo* (ej. número exacto de llamadas `upsertBatch` atómicas) fallaron artificialmente cuando el código de producción se optimizó. 

## Artifacts

- **Scope:** `work/epics/e48-admin-settings/scope.md` (Referencial)
- **Stories:** `work/epics/e48-admin-settings/stories/`

## Next Steps

- Refinar reglas ABAC si es necesario para las nuevas interfaces.
- Continuar con el pipeline evolution o las siguientes épicas de Gobernanza/Pipeline.
