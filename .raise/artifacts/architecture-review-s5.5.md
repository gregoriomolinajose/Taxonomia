## Architecture Review: S5.5 (scope: story)

### Critical (fix before merge)
No se encontraron antipatrones críticos de arquitectura o profundidad condicional destructiva (H6).

### Recommended (simplify before next cycle)
1. **`src/JS_Core.html:392` — H9 (Semantic Duplication)**
   - *Concern:* La aserción de caducidad `edge.es_version_actual === true || edge.es_version_actual === "TRUE" || edge.es_version_actual === "true"` está codificada en duro dentro del método del gráfico. Si otros componentes (como un Grid o Listado) requirieran el mismo nodo temporal, duplicaríamos la lógica de casteo defensivo.
   - *Simplification:* Extraer el discriminador a una función pura (`Cache_Utils.isActiveEdge(edge)`) reduciendo la carga cognitiva en el motor de D3/ECharts.

2. **`src/JS_Core.html:420` — H2 (Wrapper Without Logic)**
   - *Concern:* El script invoca `pruneEmptyChildren(rootNodes)` recursivamente sólo para ejecutar `delete n.children`. Dado que inicializamos `mapData` explícitamente forzando `.children = []`, es la propia inyección inicial la que nos obliga a limpiar después.
   - *Simplification:* En lugar de asignar `children: []` masivamente en el bloque 1 (`rawData.forEach`), asignar el key `children` de forma diferida (Lazy Initialization) únicamente en el Paso 2 (`if (!parentNode.children) parentNode.children = []; parentNode.children.push(childNode);`). Esto eliminaría por completo la necesidad del algoritmo recursivo de limpiado (Paso 4) respetando el principio KISS (Beck Rule 4).

### Questions (require human judgment)
1. **H8 (Configuration Over Convention):** Si la constante Mágica `"Militar_Directa"` cambia a nivel aplicativo (S5.1 definió esto en App_Schemas), el Frontend dejará de pintar los dominios. ¿No deberíamos inyectar este valor desde el motor de metadatos estáticos (`window.APP_SCHEMAS["Relacion_Dominios"]`) en lugar de mantenerlo harcodeado?

### Observations (patterns noted)
- **O(N) Fallback Elegante:** El sistema maneja muy bien la compatibilidad hacia atrás. Si el backend carece de relaciones SCD-2, pivotea naturalmente al sistema legado plano, manteniendo el Acoplamiento Funcional al mínimo.

### Verdict
- [x] PASS WITH QUESTIONS
