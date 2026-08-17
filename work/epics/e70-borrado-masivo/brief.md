# Epic E70: Borrado Masivo (Bulk Delete)

## Hipótesis
Si proporcionamos a los usuarios la capacidad de eliminar múltiples registros simultáneamente desde la vista de lista del DataGrid, reduciremos significativamente la fricción operativa y el tiempo requerido para el mantenimiento y limpieza de datos (especialmente tras cargas de ETL fallidas o desactualizadas).

## Métricas de Éxito
- Reducción del tiempo promedio requerido para eliminar lotes de datos.
- Ejecución de la eliminación de forma segura, respetando los permisos de usuario (ABAC).
- Prevención de huérfanos topológicos al usar la cascada de eliminación del grafo.

## Apetito
1 Story (S70.1). Estimado: 1-2 horas de desarrollo.

## Rabbit Holes (Riesgos a Evitar)
- **Timeouts de Apps Script:** Evitar realizar bucles de 1 a 1 mediante HTTP requests; delegar a Google Sheets Bulk Update.
- **Errores Topológicos:** No ignorar el motor de grafos. Debe seguir utilizando la lógica que cierra relaciones para evitar nodos huérfanos.
