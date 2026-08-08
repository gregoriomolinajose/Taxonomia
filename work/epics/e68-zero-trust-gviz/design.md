# Epic Design: E68

## Architecture Topology
El rediseño implica un acoplamiento intencional a la API oculta de `gviz/tq` (Google Visualization) para empujar los cálculos relacionales y de filtrado directamente al servidor de la base de datos (Google Sheets).

## Component Design
1. `Adapter_Sheets.query(entityName, config, sqlString)`: Toma la abstracción de SQL y la inyecta mediante `UrlFetchApp`. Procesa el string mágico de respuesta `/*O_o*/` de Google.
2. `Engine_DB.listBy(entityName, fieldName, value)`: Actúa como proxy que mapea los índices estructurales del esquema abstracto de la aplicación (en JavaScript) a letras de columna (A, B, C) de Google Sheets.
3. `Engine_ABAC.validatePermission`: Aplica el Zero-Trust eliminando la posibilidad de tolerar permisos ausentes.

## Data Model & Interfaces
El parser de GViz reordena los objetos `{"c":[{"v":"ID"},...]}` en el mismo arreglo de objetos clave-valor (`[{ id: 1, name: 'A' }]`) que utilizan `_getCachedData` y `.getValues()`, manteniendo la compatibilidad hacia atrás estricta.
