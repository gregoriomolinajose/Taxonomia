# Epic E57: Technical Debt Resolution

## Hypothesis
Si resolvemos la deuda técnica relacionada con componentes heredados (como la dependencia en la hoja `Relacion_Dominios`), unificaremos toda la lógica relacional en `Sys_Graph_Edges`. Esto facilitará el mantenimiento, prevendrá errores de consistencia de datos y reducirá la carga cognitiva al estandarizar el Universal Graph.

## Success Metrics
- Eliminación de la hoja de Google Sheets `DB_Relacion_Dominios` sin impactar la UI ni la funcionalidad.
- Todos los métodos que leen/escriben relaciones en Dominios y Capacidades deben apuntar estrictamente a `Sys_Graph_Edges`.
- Eliminación de deuda técnica explícita detectada en `Schema_Engine.js`, `Controller_Lookups.js`, `Math_Engine.js`, `Engine_DB.js`, y `ETL_Runner.js`.

## Appetite
- Duración estimada: Corta/Media (1 a 2 historias principales focalizadas en refactorización y despliegue iterativo).

## Rabbit Holes
- No refactorizar otras entidades no relacionadas directamente con el grafo jerárquico SCD-2.
- Evitar rehacer todo el sistema de UI Rendering en `Math_Engine.js` o `ECharts`. Solo re-apuntar la lectura a la nueva estructura de datos.
