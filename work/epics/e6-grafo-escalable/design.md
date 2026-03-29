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
  "relaciones_padre": { 
      type: "relation", 
      uiBehavior: "subgrid", 
      targetEntity: "Relacion_Dominios", 
      isTemporalGraph: true,
      topology: "DICCIONARIO_ESTRUCTURA"
  }
  ```
- En `Engine_DB` -> `orchestrateNestedSave`:
  Se delegará el guardado según reglas topológicas de cardinalidad:
  ```javascript
  if (APP_SCHEMAS[nodeType].isTemporalGraph) {
      Engine_Graph.patchSCD2Edges(batchRecords, APP_SCHEMAS[nodeType].topology);
  }
  ```

## 4. Diccionario de Estructuras Organizacionales (Topologías)
El motor `Engine_Graph` basará la validación de cardinalidad (1:N, N:M) y comportamiento transitivo en un diccionario predefinido:
1. **Estructura Funcional / Departamental (1:N):** Rígida, silos clásicos.
2. **Estructura Divisional (1:N):** Por líneas geográficas o productos.
3. **Estructura Plana / Horizontal (M:N controlada):** Sin mandos intermedios.
4. **Estructura Basada en Equipos (M:N cruzada):** Multidisciplinaria sin silos.
5. **Estructura Lineal / Jerárquica (1:N estricta):** Única línea de mando.
6. **Estructura Línea-Staff (1:N + 1:1 especial):** Jerarquía mezclada con asesores laterales.
7. **Estructura por Proyectos (M:N efímera):** Equipos temporales que se disuelven.
8. **Estructura Híbrida / Matricial (M:N):** Cruces multidimensionales.

*Una Entidad puede coexistir en MÚLTIPLES estructuras topológicas simultáneas.*

## 5. Riesgos
1.  **Regresión en Guardado O(1)**: Extraer memoria RAM podría introducir async awaits no deseados.
2.  **Ambigüedad de Cardinalidad**: Multiples roles de una entidad pueden violar contraints únicos si el Diccionario no se evalúa correctamente.
