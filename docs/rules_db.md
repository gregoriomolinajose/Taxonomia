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