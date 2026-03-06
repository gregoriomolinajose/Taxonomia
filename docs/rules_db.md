# Reglas de Base de Datos y Persistencia (Backend)

## 1. Arquitectura Agnóstica (Dual-Write & Adapters)
- [cite_start]`Engine_DB.gs` es completamente agnóstico y es estrictamente un **Enrutador (Facade)**[cite: 46, 98]. NUNCA DEBE contener llamadas directas a la API de `SpreadsheetApp`, `Jdbc`, ni `UrlFetchApp`[cite: 47].
- [cite_start]Su única responsabilidad es recibir el JSON validado, leer *Feature Flags*, y despachar el payload a los adaptadores (`Adapter_Sheets`, `Adapter_CloudDB`)[cite: 48].
- [cite_start]Durante la fase actual de pruebas, el sistema operará en modo **Dual-Write**[cite: 53]. [cite_start]Si un adaptador falla en la nube, NO debe bloquear la escritura en el adaptador de respaldo (Sheets)[cite: 55].

## 2. Mapeo Estricto y Normalización
- [cite_start]Todo encabezado leído de Google Sheets DEBE ser transformado mediante un algoritmo estricto a formato `snake_case` antes de hacer match con las claves de `JS_Schemas_Config`[cite: 37].
- [cite_start]El Regex de `_normalizeHeader` debe convertir a minúsculas, remover tildes, reemplazar espacios por guiones bajos y eliminar caracteres no alfanuméricos[cite: 38, 39, 40]. 
- [cite_start]El flujo de lectura (READ) DEBE incluir una validación contra columnas duplicadas (Manejo de Colisiones)[cite: 42].

## 3. Idempotencia y Upsert Obligatorio
- [cite_start]Todas las escrituras en `Engine_DB` DEBEN ser idempotentes[cite: 65]. [cite_start]NUNCA deben resultar en registros duplicados si se envía el mismo payload[cite: 66].
- [cite_start]**Mandato para Adapter_Sheets:** Dado que Google Sheets no tiene `ON CONFLICT DO UPDATE`, el adaptador debe identificar la Llave Primaria [cite: 68][cite_start], buscar dinámicamente en la columna [cite: 69][cite_start], y hacer un Update si existe o un Insert si no[cite: 70, 71]. [cite_start]Queda estrictamente prohibido usar `appendRow()` a ciegas[cite: 72].

## 4. Inmutabilidad y Trazabilidad
- [cite_start]Todo cambio en cualquier tabla debe inyectar `created_at`, `updated_at` y `updated_by`[cite: 21].
- [cite_start]`T_Audit_Log` llevará el diario inmutable del sistema[cite: 22].