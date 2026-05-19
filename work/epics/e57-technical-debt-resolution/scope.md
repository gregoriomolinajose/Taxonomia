# Epic E57: Technical Debt Resolution

## Objective
Resolver la deuda técnica principal encontrada durante el desarrollo de epicas anteriores, en particular erradicar la dependencia heredada de la hoja `Relacion_Dominios` y finalizar la unificación del modelo relacional en `Sys_Graph_Edges`.

## In Scope
- Refactorizar `Controller_Lookups.js` para usar `Sys_Graph_Edges` en la detección de dependencias `hasActiveParent` de Dominios.
- Refactorizar `Math_Engine.js` y `ECharts` Data Builders para que extraigan relaciones de `Sys_Graph_Edges` en vez de `Relacion_Dominios`.
- Eliminar referencias a `Relacion_Dominios` en `Engine_DB.js` y `ETL_Runner.js`.
- Eliminar el esquema obsoleto en `Schema_Engine.js`.
- Eliminación segura y final de la hoja `DB_Relacion_Dominios` en Google Sheets.

## Out of Scope
- Migración de datos o registros históricos (ya que los registros relacionales de dominios se asume que ya operan a través del nuevo Grafo en E31, y solo la vista/UI dependía del antiguo modelo).
- Cualquier cambio funcional o estructural no relacionado directamente con limpiezas de código obsoleto.

## Planned Stories
- [x] **S57.1**: Refactorización de dependencias `Relacion_Dominios` a `Sys_Graph_Edges` (Lookups, Data Builders, Engine_DB) ✓
- [x] **S57.2**: Auditoría de Despliegue, limpiezas secundarias y eliminación final de la hoja `DB_Relacion_Dominios` ✓
- [x] **S57.3**: Habilitar TXSearchable para relaciones jerárquicas y correcciones de contraste en Dominio ✓
- [x] **S57.4**: Refactorización Desacoplada de Componentes Relacionales (State-Driven Web Components) ✓
- [ ] **S57.5**: Cálculo Automático de Niveles Jerárquicos y Habilitación Permanente de Nodo Padre

## Implementation Plan

### Milestones
- **M1: Core Migration** (S57.1): Refactorización de lógica de backend en JS (Lookups, Data Builders) para depender solo de `Sys_Graph_Edges`.
- **M2: Epic Complete** (S57.2): Limpieza de esquemas, ETL, auditoría y borrado físico de la hoja.
- **M3: UI Refinements** (S57.3): Habilitar selectores avanzados (TXSearchable) para entidades core afectadas por S57.1.
- **M4: Architectural Cleanup** (S57.4): Desacoplar la lógica relacional y estandarizar componentes web guiados por estado (State-Driven).
- **M5: UX Optimization** (S57.5): Automatización del cálculo de herencia (`nivel_tipo`) y simplificación de captura de relaciones jerárquicas.

### Progress Tracking

| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|--------|----------|-------|
| 1 | S57.1 — Refactorización de Lookups y ECharts | M | Done | 45m | | |
| 2 | S57.2 — Limpieza final y Auditoría | S | Done | 15m | | Hoja eliminada, código auditado |
| 3 | S57.3 — Habilitar TXSearchable en UI jerárquica | XS | Done | 10m | | Desplegado en DEV y PROD |
| 4 | S57.4 — Refactorización Desacoplada Web Components | L | Done | | | Desplegado en DEV y PROD |
| 5 | S57.5 — Cálculo Automático de Niveles Jerárquicos | M | Todo | | | |

## Done Criteria
- [ ] No existen referencias a la palabra `Relacion_Dominios` en el código fuente de `/src`.
- [ ] La UI y reportes/dashboard renderizan la jerarquía de dominios correctamente consultando a `Sys_Graph_Edges`.
- [ ] La hoja es eliminada manualmente en la BD.
