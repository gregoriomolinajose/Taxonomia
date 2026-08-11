# E69: Refactorización ETL GViz - Scope

## Objective
Refactorizar el Motor ETL (Ingesta Masiva) para emplear la API GViz en la fase de extracción y deduplicación, habilitando cargas de nivel empresarial sin impactar los límites del runtime V8.

## In Scope
- Creación de wrapper interno `_fetchGVizExternal` para hojas remotas con Autenticación.
- Refactorización de `extractDataFromDrive` para consumir el JSONP de GViz.
- Optimización de `hydrateAndDeduplicate` para hacer proyecciones de campos únicos vía SQL GViz en vez de traer la tabla completa.
- Parseo de fechas y casteos automáticos de GViz.

## Out of Scope
- Interfaz Gráfica del Wizard de Carga.
- Dead Letter Queue (DLQ) y Async Job Runners (están previstos para E61/Otra épica).

## Planned Stories
### Progress Tracking

| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|:------:|:--------:|-------|
| 1 | S69.1 — Wrapper GViz en Adapter_Sheets | S | Done | - | - | Implementado en PR anterior. |
| 2 | S69.2 — Implementar `_fetchGVizExternal` y GViz Parsing | M | Pending | - | - | |
| 3 | S69.3 — Refactor `hydrateAndDeduplicate` (GViz Projection) | M | Pending | - | - | |

## Done Criteria
- [ ] ETL extrae registros remotamente vía `UrlFetchApp` en lugar de `SpreadsheetApp.getDataRange()`.
- [ ] La deduplicación utiliza `listBy` o query con `uniqueFields` proyectados.
- [ ] Todas las pruebas end-to-end de topología siguen funcionando de forma idempotente.
