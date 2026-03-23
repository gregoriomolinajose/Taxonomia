# Reglas de Base de Datos y Persistencia (Backend)

## 1. Arquitectura Agnóstica (Dual-Write & Adapters)
- `Engine_DB.gs` es completamente agnóstico y es estrictamente un **Enrutador (Facade)**. NUNCA DEBE contener llamadas directas a la API de `SpreadsheetApp`, `Jdbc`, ni `UrlFetchApp`.
- Su única responsabilidad es recibir el JSON validado, leer *Feature Flags*, y despachar el payload a los adaptadores (`Adapter_Sheets`, `Adapter_CloudDB`).
- Durante la fase actual de pruebas, el sistema operará en modo **Dual-Write**. Si un adaptador falla en la nube, NO debe bloquear la escritura en el adaptador de respaldo (Sheets).

## 2. Mapeo Estricto y Normalización
- Todo encabezado leído de Google Sheets DEBE ser transformado mediante un algoritmo estricto a formato `snake_case` antes de hacer match con las claves de `JS_Schemas_Config`.
- El Regex de `_normalizeHeader` debe convertir a minúsculas, remover tildes, reemplazar espacios por guiones bajos y eliminar caracteres no alfanuméricos. 
- El flujo de lectura (READ) DEBE incluir una validación contra columnas duplicadas (Manejo de Colisiones).

## 3. Idempotencia y Upsert Obligatorio
- Todas las escrituras en `Engine_DB` DEBEN ser idempotentes. NUNCA deben resultar en registros duplicados si se envía el mismo payload.
- **Mandato para Adapter_Sheets:** Dado que Google Sheets no tiene `ON CONFLICT DO UPDATE`, el adaptador debe identificar la Llave Primaria, buscar dinámicamente en la columna, y hacer un Update si existe o un Insert si no. Queda estrictamente prohibido usar `appendRow()` a ciegas.

## 4. Inmutabilidad y Trazabilidad (Audit Trail Estricto)
- Todo modelo de datos y operación CRUD (en cualquier tabla) DEBE registrar un rastro de auditoría silencioso e inmutable. Las tablas deben contener estas 4 columnas obligatorias: `created_at`, `created_by`, `updated_at`, `updated_by`.
- **Regla de Seguridad (Backend-Only):** El Frontend (JS/UI) NUNCA debe enviar datos de auditoría en el payload. El Backend es la Autoridad Absoluta y el responsable de inyectar estos valores.
- **Mecánica Upsert:** En un Insert se llenan los 4 campos. En un Update, se sobrescriben ÚNICAMENTE `updated_at` y `updated_by`.

## 5. Compatibilidad Híbrida (Jest vs GAS)
- Queda Categóricamente Prohibido usar `module.exports` sin validarlo contra el entorno de ejecución (evitar error "module is not defined").
- Todo export DEBE utilizar la condicional: `if (typeof module !== 'undefined') { ... }`.

## 6. Generación de Identificadores Únicos (Convención de PKs)
- **Estructura Estricta:** Toda Llave Primaria (PK) generada automáticamente DEBE seguir el patrón: `[PREFIJO]-[UUID_CORTO]`.
- **Prefijo de Entidad:** Debe ser de 4 letras en mayúsculas (ej. `PORT`, `GRUP`, `PROD`, `UNID`).
- **Sufijo UUID:** Debe ser alfanumérico (Base36), de 5 caracteres y siempre en MAYÚSCULAS (ej. `UNID-X9K2P`).
- **Prohibición de Timestamps:** Se prohíbe el uso de milisegundos o números largos como IDs visibles; el sistema debe priorizar la legibilidad humana y la estética de la base de datos relacional.

## 7. Optimización de Red y Latencia (Single RPC & Caching)
- **Ley del Payload Único (Hydration):** Queda ESTRICTAMENTE PROHIBIDO realizar múltiples llamadas a `google.script.run` para inicializar una vista (Patrón Chatty). El frontend DEBE realizar una única petición (Single RPC) llamada `getInitialPayload(entity)` que retorne un objeto maestro con: metadatos, registros principales y todos los catálogos/lookups necesarios.
- **Uso Obligatorio de CacheService:** Todo catálogo, lista desplegable o tabla de búsqueda (Lookups) DEBE ser almacenado en `CacheService.getScriptCache()` por un mínimo de 1 hora. El backend solo debe leer la Spreadsheet si el caché está vacío (Cache Miss).
- **Compresión de Matrices (Tuplas):** Para listados de más de 100 registros, el backend NO DEBE retornar Arrays de Objetos. Debe retornar Arrays de Arrays (Tuplas) donde el índice 0 contenga los encabezados, delegando la reconstrucción de objetos al frontend para ahorrar ancho de banda.
- **Ley de Invalidación de Caché (Cache Busting):** Todo uso de `CacheService` para listas o catálogos DEBE estar acompañado de un mecanismo de purga. Toda operación de mutación de datos (Insert, Update, Delete) en el backend DEBE invalidar/borrar explícitamente la llave de caché correspondiente a esa entidad para evitar servir datos estancados (Stale Data).

## 8. Gestión de Estado en Cliente (Zero-Latency SPA)
- **Ley de Memoria UI:** El Frontend DEBE actuar como una verdadera Single Page Application (SPA). Todo `MasterPayload` descargado desde el servidor DEBE ser almacenado en la memoria temporal del navegador (ej. `window.__APP_CACHE__`).
- **Prohibición de Re-fetching y Purgado Ciego:** Queda ESTRICTAMENTE PROHIBIDO volver a llamar a `google.script.run` para inicializar una vista si los datos ya existen, y queda PROHIBIDO purgar el caché local tras una mutación exitosa.
- **Mutación Inyectada (Local Cache Mutation):** Toda operación de mutación (Crear, Editar) confirmada por el servidor, DEBE inyectarse de forma inmutable y directa en el Arreglo Raíz del caché del cliente (`window.__APP_CACHE__[entityName]`). Esto garantiza un redibujado de tabla en 0.1s sin latencia de red.

## 9. Manejo de Relaciones y Grafo de Entidades (Master-Detail)
- **Normalización Estricta (DB):** Las tablas físicas NUNCA deben guardar arreglos anidados. Toda relación 1:N se persiste almacenando la Llave Foránea (`foreignKey`) en la tabla hija.
- **Transaccionalidad del Payload:** El Frontend está autorizado a enviar un "Payload Anidado" (Padre e Hijos en un solo JSON) para mejorar la UX. 
- **Orquestación en Engine_DB:** El Backend DEBE desempaquetar el payload. DEBE insertar/actualizar primero a la entidad Padre, capturar su Llave Primaria, inyectar dicha llave en los registros Hijos, y finalmente delegar la inserción de los Hijos a sus respectivos adaptadores.
- **Tipos de Relación Visual:**
  - `1:N` (Jerarquía): Se renderiza como un `subgrid` (Tabla anidada editable).
  - `M:N` (Grafo Simple): Se renderiza como un `multi-select` (Selector de etiquetas/chips).

  ## 10. Sanitización de Salida (Prevención de Colapso RPC)
- **El Límite del postMessage:** Google Apps Script utiliza clonación estructurada para enviar datos del Backend al Frontend. Queda ESTRICTAMENTE PROHIBIDO retornar objetos complejos no serializables (como objetos `Date` nativos generados por la base de datos o referencias circulares) en las respuestas de éxito.
- **Sanitización Obligatoria:** Toda respuesta de éxito en mutaciones (ej. el return de `upsertBatch` en `API_Universal.gs`) que incluya el registro completo, DEBE ser aplanada y sanitizada (ej. `JSON.parse(JSON.stringify(responseData))`) antes de ser enviada al cliente. 
- **Objetivo:** Prevenir el fallo silencioso y críptico `dropping postMessage.. deserialize threw error` en la consola del navegador, el cual rompe el ciclo de vida de la inyección de caché.