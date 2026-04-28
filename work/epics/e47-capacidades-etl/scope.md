# Scope: ETL Carga Masiva de Capacidades (E47)

## Objective
Desarrollar un ETL para la carga masiva de capacidades desde un archivo plano, transformando la estructura de 4 niveles (Macrocapacidad, Capacidad, Subcapacidad, Componente) al esquema interno del sistema con auto-generación de rutas lógicas (`order_path` y `path_completo_es`).

## In Scope
- **Auto-detección en Modal ETL:** Capacidad del modal de importación existente para detectar proactivamente la firma de este archivo (ej. columnas específicas o título "Modelo de Capacidades de Grupo 2.0" en las primeras filas) y enrutarlo automáticamente a este nuevo parser, simplificando la UX.
- **Parsing Avanzado:** Lógica para ignorar las primeras 5 filas (títulos/logos), leer los headers en la fila 6 y resolver la herencia de celdas combinadas (merged cells) en las columnas de niveles superiores.
- Adaptación o creación del parser ETL para leer el archivo de capacidades en su formato origen.
- Lógica de mapeo y transformación:
  - Nivel 0: Macrocapacidad (Etiqueta "Macrocapacidad"). Sin descripción.
  - Nivel 1: Capacidad (Etiqueta "Capacidad"). Sin descripción.
  - Nivel 2: Subcapacidad (Etiqueta "Sub capacidad"). Mapea "Descripción de la Subcapacidad".
  - Nivel 3: Componente (Etiqueta "Componente"). Mapea "Descripción del componente".
- Auto-generación del campo `order_path` y `path_completo_es` consumiendo estrictamente las funciones pre-existentes `buildOrdenPath` y `buildPathName` del `Math_Engine.html` (re-evaluando su compatibilidad para ingesta masiva si es necesario, pero evitando re-desarrollarlas).
- Tratamiento explícito de campos no mapeados como vacíos: `external_id`, `nombre_en_ingles`, `abreviacion`, `contexto_completo`.
- Persistencia de los datos en la entidad de Capacidades.

## Out of Scope
- Modificación de la estructura de la base de datos más allá de lo necesario para esta ingesta.
- Alteración a los permisos del ABAC sobre capacidades.
- Exportación del catálogo a este mismo formato.

## Stories
- [x] S47.1: ETL Parser y Mapeo Estructural Básico (Niveles 0-3).
- [x] S47.2: Algoritmos de auto-generación de topología (`order_path` y `path_completo_es`) integrando un índice Hash Map O(1) en el `Math_Engine` para evitar bloqueos por complejidad O(N^2) en grandes volúmenes.
- [x] S47.3: Integración y pruebas de carga con la base de datos / UI.
- [x] S47.4: Importación de Capacidades vía Sincronización Google Drive.

## Implementation Plan

### Sequencing Rationale
Hemos priorizado un enfoque "Walking Skeleton" (S47.1) para mitigar el riesgo de que el Excel no pueda ser leído correctamente o las celdas combinadas fallen. Una vez garantizada la lectura, agregamos la complejidad topológica (S47.2) y cerramos con la integración de Inyección Masiva (S47.3). Posteriormente se acopló la S47.4 para omitir el uso de archivos locales a favor de la sincronización Drive.

| Seq | Story | Descripción | Riesgo/Dependencia | T-Shirt |
|---|---|---|---|---|
| 1 | S47.1 | UI File Interception & Offset Parser (Fill-Down) | Riesgo Frontend (Lectura Excel nativa) | M |
| 2 | S47.2 | Graph Flattening & Math_Engine Consumption | Depende de S47.1 | M |
| 3 | S47.3 | Database Batch Dispatch & E2E Verification | Depende de S47.2 (PAT-E-539 E2E req) | S |
| 4 | S47.4 | Importación desde Google Drive Sync | Depende de S47.3 | S |

### Milestones
- **M1: File Parser (Fin de S47.1):** Capacidad de leer archivos `.xlsx` y exportar un log en consola con los renglones extraídos.
- **M2: Data Integrator (Fin de S47.2):** Los registros del archivo cuentan con metadata obligatoria lista (`_nivel`, `_order_path`, etc.) pero aún no persisten.
- **M3: Feature Complete (Fin de S47.3):** Integración E2E. El modal inyecta de 50 en 50 registros hacia Google Sheets mediante `_dispatchChunks`.
- **M4: Drive Sync (Fin de S47.4):** Capacidad de inyectar sin intermediario local, bajando la matriz pura directamente desde Google Sheets (Drive Sync).

### Progress Tracking
| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|--------|--------|----------|-------|
| S47.1 | M | Done | 45m | 🚀 | Fill-down parser implementado |
| S47.2 | M | Done | 55m | 🚀 | Flattening + Math_Engine O(1) completado |
| S47.3 | S | Done | 20m | 🚀 | Dispatcher asíncrono y UX acoplada |
| S47.4 | S | Done | 35m | 🚀 | Sincronización de Drive y abstracción de ETL completada |
