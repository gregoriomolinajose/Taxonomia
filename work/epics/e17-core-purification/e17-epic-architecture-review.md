## Architecture Review: E17 (scope: epic)

### Critical (fix before merge)
No se encontraron violaciones críticas en el cierre de esta épica. El pipeline de inicialización transpiló sin errores en la validación `Attempt 1 of 3` de Node.

### Recommended (simplify before next cycle)
- **H5 (Dead Exports):** Actualmente exportamos `window.formatEntityName` que es un simple alias de `window.formatLabelString` dentro de `UI_FormUtils.html`. Podríamos simplificar las referencias futuras usando una única función y eliminando el alias si ninguna interfaz externa lo prefiere.

### Questions (require human judgment)
- **H8 (Configuration Over Convention):** Mudar la configuración de colores de ApexCharts a `Theme_Engine` (S17.2) fue acertado. Sin embargo, ¿Debería el `Theme_Engine` tener conocimiento implícito de `window.chartTopology.updateOptions`? ¿O debería limitarse a despachar un evento genérico `THEME::CHANGED` a través del `AppEventBus` y que el Dashboard actualice los gráficos? (Actualmente el motor de Temas acopla el ID del gráfico directamente).

### Observations (patterns noted)
- **H11 (Change Reason Count - Resuelto):** Al inicio de la Epic, `JS_Core.html` era un "God Object" que se modificaba por motivos de Tema, Autenticación, Ruteo, Sidebar y Matemáticas. Tras S17.1-S17.4, el core cuenta únicamente con su `AppEventBus` y el disparador de eventos inicial, garantizando alta cohesión.
- **H14 (Coupling Direction - Resuelto):** El motor Topológico Isomórfico (`Topology_Strategies.js`) dependía de la interfaz global de UI (`JS_Core.html` -> `TopologyGuard`). Esta inversión mortal fue corregida en la S17.4 enviando las matemáticas de grafos directas a `Math_Engine.js`.

### Verdict
- [x] PASS WITH QUESTIONS
