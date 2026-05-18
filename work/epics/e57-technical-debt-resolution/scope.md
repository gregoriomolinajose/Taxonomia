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
- **S57.1**: Refactorización de dependencias `Relacion_Dominios` a `Sys_Graph_Edges` (Lookups, Data Builders, Engine_DB).
- **S57.2**: Auditoría de Despliegue, limpiezas secundarias y eliminación final de la hoja `DB_Relacion_Dominios`.

## Done Criteria
- [ ] No existen referencias a la palabra `Relacion_Dominios` en el código fuente de `/src`.
- [ ] La UI y reportes/dashboard renderizan la jerarquía de dominios correctamente consultando a `Sys_Graph_Edges`.
- [ ] La hoja es eliminada manualmente en la BD.
