# E69: Refactorización ETL GViz - Brief

## Hypothesis
Si cambiamos el motor de extracción ETL nativo (SpreadsheetApp) por peticiones directas a la API GViz usando UrlFetchApp, eliminaremos los errores OOM (Out Of Memory) del runtime V8 y permitiremos la carga de miles de registros en tiempo O(1) de memoria, habilitando una verdadera capacidad empresarial (Enterprise).

## Success Metrics
- Cero errores OOM al cargar plantillas con >5,000 registros.
- Reducción del uso de RAM durante la fase de deduplicación en >80%.
- Capacidad de ejecutar procesos ETL simultáneos para operaciones de sólo lectura/extracción sin que la memoria colapse.

## Appetite
1-2 semanas de un Senior Engineer.

## Rabbit Holes (Riesgos a evitar)
- Reescribir la validación de cabeceras de `extractDataFromDrive`: es mejor mantener un enfoque híbrido usando SpreadsheetApp solo para obtener las cabeceras.
- Manejo de tipos de datos anidados en el JSONP de GViz.
