# Epic Design & ETL Migration Plan: E5 - Grafo Temporal Multi-Estructural

## 1. Análisis del Modelo Relacional (Temporal DAG)
El paso de un **Árbol N-ario Plano** a un **Grafo Dirigido Temporal** destruye la rigidez de un solo padre por registro y habilita dimensiones inmensas: matriciales (múltiples reportes) y redes colaborativas (cross-funcionalidad).
El requerimiento de *Slowly Changing Dimensions (SCD Tipo 2)* blinda la Historia de la Organización. Si el Departamento "X" pertenecía a "Logística" en 2024 y ahora pertenece a "Finanzas" en 2026, los KPIs de 2024 no se verán alterados ni huérfanos.

## 2. Plan de Migración de Datos (ETL)

El script de transición debe ejecutarse una única vez en el Servidor (App Script) aislando las operaciones para cumplir con el *Bulk Ops Imperative*.

### [E]xtract (Extracción O(1))
1. Se leerá la totalidad de la matriz de la hoja **Dominios** en una sola operación `getValues()`.
2. Se cargarán todos los registros en Memoria RAM (`RecordArray`).

### [T]ransform (Semántica SCD-2)
1. Se instanciará una nueva matriz in-memory vacía `newRelationsArray`.
2. Por cada `Dominio` en RAM que posea un `id_dominio_padre` válido:
   - Se creará un Objeto de Relación siguiendo la directiva de Llaves Primarias (UUID de 5 dígitos alfanumérico):
   - `id_relacion`: `RELA-X9A2M`
   - `id_nodo_padre`: `Dominio.id_dominio_padre`
   - `id_nodo_hijo`: `Dominio.id_dominio`
   - `tipo_relacion`: `"Militar_Directa"` (Legado actual).
   - `peso_influencia`: `1` (100% de influencia).
   - `valido_desde`: `Dominio.created_at` (Hereda la fecha de creación del dominio para respetar el SCD2 histórico).
   - `valido_hasta`: `NULL` (Significando "Al infinito / Vigente").
   - `es_version_actual`: `TRUE`.
   - Campos de Auditoría Mandatorios (`created_at`, `created_by`, `updated_at`, `updated_by`).

### [L]oad (Inserción O(1) y Depreciación)
1. El backend creará la nueva hoja física **`Relacion_Dominios`** si no existe, imprimiendo su Header-Row exacto.
2. Inyectará todo el `newRelationsArray` en un barrido masivo `setValues()`.
3. Posteriormente, correrá un barrido sobre la matriz original de Dominios y borrará (colocará a `NULL`) exclusivamente la columna `id_dominio_padre`. Se empujará este cambio a Google Sheets.

## 3. Impacto Arquitectónico y RoadMap Lógico

### Cascade Flattening (Auto-Herencia)
- **Descartar Soft-Delete Seguro (S4.3):** El método universal `delete(id)` interceptará el borrado de Nodos. Si el nodo a eliminar tiene hijos (Donde `es_version_actual === true`), lanzaremos una Sub-Query in-memory.
- Buscará si el nodo eliminado tiene a su vez un Padre (`id_nodo_padre`).
- Procederá a cerrar (`valido_hasta = NOW`, `es_version_actual = FALSE`) las relaciones de los nietos, e insertará **NUEVAS relaciones** directas entre los nietos y el "Abuelo".

### Interfaz (Treemap vs Force-Graph)
- **DataView:** Modificar la rutina de `getInitialPayload`. Dado que los padres ya no están en `Dominios`, el caché enviará ambas matrices unidas mediante un `LEFT JOIN` lógico en el cliente.
- El algoritmo que reconstruye los Nodos (Tree Builder) deberá filtrar exclusivamente los ejes que tengan `tipo_relacion === "Militar_Directa" && es_version_actual === true` para dibujar el Treemap clásico.
