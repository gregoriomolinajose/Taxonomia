# Epic Design: E6 - Arquitectura Escalable de Grafos

## 1. Contexto (Gemba)
En su estado actual, la Taxonomía ha sido abstraída a un modelo de grafos DAG N:M (S5.6). Sin embargo, la interceptación de aristas SCD-2 (con control de tiempo `valido_hasta`) se inyectó directamente dentro del orquestador transaccional genérico `orchestrateNestedSave` en `Engine_DB.js` mediante la condicional dura `targetEntity === "Relacion_Dominios"`. Esto incrementa el riesgo de **Shotgun Surgery** (H16) en caso de que nuevas entidades adopten taxonomías DAG (Ej., Capacidades, Portafolios).

## 2. Componentes Afectados
- `Schema_Engine.gs`: Se expandirá para soportar flags declarativos.
- `Engine_DB.js`: El delegado CRUD principal será podado de responsabilidades de red.
- `Engine_Graph.js` **[NEW]**: Contendrá toda la manipulación topológica, SCD-2 patching, y cascade flattening.

## 3. Contratos Clave
- En `Schema_Engine`:
  ```javascript
  "relaciones_padre": { type: "relation", uiBehavior: "subgrid", targetEntity: "Relacion_Dominios", isTemporalGraph: true }
  ```
- En `Engine_DB` -> `orchestrateNestedSave`:
  Se interceptará a la entidad no por nombre, sino por interfaz dinámica:
  ```javascript
  if (APP_SCHEMAS[nodeType].isTemporalGraph) {
      Engine_Graph.patchSCD2Edges(batchRecords);
  }
  ```

## 4. Riesgos
1.  **Regresión en Guardado O(1)**: Extraer memoria RAM podría introducir async awaits no deseados (I/O). Se mitigará empleando `__APP_CACHE__` inyectable dentro del Service Class.
