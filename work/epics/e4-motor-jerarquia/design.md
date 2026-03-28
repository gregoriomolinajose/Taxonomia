# Epic Design: E4 - Motor de Jerarquía Grado Industrial

Este documento establece los patrones arquitectónicos bajo los cuales las Historias S4.1, S4.2 y S4.3 operarán, acatando en todo momento el mandato *Zero-Touch HTML* (UI reactiva por Metadatos) y *Bulk Ops Imperative* (Backend O(1)).

## 1. Diseño Lógico S4.1: Prevención de Ciclos (UI Circular Dependency Guard)
**El Veto Arquitectónico:** El *Business Model* prohíbe explícitamente "hardcodear" filtros custom en los templates de Forms (Reglas de Oro UI). El filtro debe interceptarse dinámicamente en el tiempo de ejecución.
**Solución Técnica:**
- El esquema en `JS_Schemas_Config` define el padre mediante `lookupSource: "getDominioOptions"`.
- Cuando `FormEngine_UI.html` invoca el constructor de campos Select, el motor recibe el valor de las *Opciones*.
- **Intercepción Dinámica:** Antes de renderizar los nodos `<option>`, se inyectará una rutina local recursiva en RAM (`DFS/BFS`) que construya el sub-árbol de descendencia del ID del registro *actualmente en edición*. 
- Todo integrante de ese sub-árbol, además de sí mismo (Self), será podado (filtrado) de la matriz de `lookupSource`, evaporando matemáticamente la posibilidad de que el humano forme un ciclo UI.

## 2. Diseño Lógico S4.2: Mutación en Cascada (Re-Parenting & Bulk Path Propagation)
**El Veto Arquitectónico:** La regla *Performance Crítica en GAS* prohíbe alterar Base de Datos dentro de ciclos iterativos (Sin `.getRange().setValue()` dentro de un bucle For).
**Solución Técnica:**
- **Interceptar en Facade (Backend):** Cuando el adaptador de base de datos recibe un `Update` sobre una entidad `Dominio`, comparará el `id_dominio_padre` entrante vs el existente en la base.
- Si cambió, se detona la cascada:
  1. Descarga total del caché de dominios (Lectura RAM matriz 2D).
  2. Construcción rigurosa del árbol genealógico en Memoria (*Relational Graph Traversal*). Utilizando Búsqueda en Profundidad (DFS) sobre las llaves foráneas `id_dominio_padre`, extraeremos el listado absoluto y finito de llaves primarias descendientes.
  3. Queda absolutamente prohibido el uso heurístico de `.startsWith(viejo_orden_path)` para evitar atrapar strings homófonos (ej. confundir `01.02` con `01.020`).
  4. Mutación puramente en memoria del nuevo prefijo jerárquico (`orden_path` y `path_completo_es`) estrictamente a los herederos aislados por DFS.
  5. Ejecución del Upsert en bloque (`setValues()`) en una única llamada, sobre-escribiendo a la matriz completa en la hoja *Dominios* para respetar el desempeño O(1).
  6. Invocación imperativa de Invalidador de Caché Server-Side.

## 3. Diseño Lógico S4.3: Barrera de Soft-Delete contra orfandad (Safe Block)
**El Veto Arquitectónico:** El *Backend es la Autoridad Absoluta*. El UI jamás debe tomar decisiones de integridad sobre eliminaciones.
**Solución Técnica:**
- Dentro de `Adapter_Sheets.delete(id)` (o universal), inmediatamente antes de marcar la estampa `deleted_at`, se realizará una consulta cruzada contra la matriz in-memory de la base de datos de Dominios.
- Se filtrará buscando cualquier fila cuya columna `id_dominio_padre` sea igual a la llave a eliminar y que no cuente con `deleted_at`.
- Si el conteo temporal es `> 0`, el backend lanza aborto transaccional tirando un Error Controlado (`throw new Error("Violación de Integridad Jerárquica...")`) que la API Universal capturará y el UI mostrará en formato Toast color Danger en la ventana del usuario.

## 4. Contract Data Definitions (CDD)
- Ningún Payload nuevo ha sido inventado.
- Ninguna columna adicional será adherida a la base de datos (Se re-utilizan llaves foráneas actuales).
- Todo es purificación de comportamiento reactivo bajo las mismas llaves y rutas vigentes.
