# Epic Design: E53 - Taxonomia Visual Builder Canvas

## 1. Estrategia Arquitectónica
Estamos cambiando el paradigma de interfaz de usuario para el mapeo de Jerarquías, pasando de un formulario lineal (1D) y un gráfico de nodos tradicional con ECharts (2.5D), a una **Matriz Nativa de Swimlanes Anidados con CSS Grid** (2D Matrix). Este enfoque se adapta mucho mejor a textos largos, proporciona una vista ejecutiva de "arriba hacia abajo" (top-down) y mantiene la alineación vertical entre ramas hermanas.

## 2. Componentes Objetivo
- `UI_View_SwimlaneGrid.client.js`: La vista orquestadora universal. Carga el arreglo plano de `Sys_Graph_Edges` donde `contexto_id` = ID del contenedor (ej. Taxonomía), y construye un árbol en memoria para su renderizado. Diseñado para ser agnóstico y reutilizable para otras entidades (ej. Capacidades).
- `CSS_TaxonomyCanvas.html`: El módulo de estilos que proporcionará las variables CSS para los fondos de los swimlanes extrayendo el color nativo de cada entidad desde `APP_SCHEMAS[entidad].metadata.color` (ej. `primary` para Unidad, `danger` para Portafolio, `dark` para Grupos) y la lógica de disposición (`display: flex; flex-direction: column`).
- `UI_DrawerManager.client.js`: En lugar de construir modales de búsqueda genéricos flotantes (`TXSearchable`), el Canvas invocará directamente los cajones nativos de las entidades (Homologous Contextual Drawers) pasando la Taxonomía como `contexto_id`. Esto asegura la reutilización total del `FormEngine` y mantiene el modelo mental del usuario intacto.

## 3. Modelo de Datos y Contratos
- **Lectura:** El Canvas obtiene los datos a través de `API_Universal.getRecords('Sys_Graph_Edges', { contexto_id: taxonomiaId })`. Los datos vienen planos. El frontend, mediante `JS_GraphUtils` o lógica en línea, reconstruirá el árbol basándose en las llaves `id_nodo_padre` e `id_nodo_hijo`.
- **Escritura:** Evitaremos crear un nuevo RPC en el backend. En su lugar, el frontend (`UI_View_SwimlaneGrid`) construirá el arreglo estándar de objetos para la tabla `Sys_Graph_Edges` (con su `id_nodo_padre`, `id_nodo_hijo`, `contexto_id`, etc.) y utilizará el punto de enlace universal existente (`API_Universal.save_records` o la lógica nativa del `UI_FormSubmitter`). Esto garantiza que todas las reglas de auditoría y versiones (Optimistic Locking) se mantengan centralizadas.

## 4. Decisiones Clave (Contexto ADR)
- **¿Por qué CSS Grid sobre ECharts?** Los mapas de árbol de ECharts tienen problemas con la alineación de nodos cuando los tamaños de texto varían enormemente, y carecen de interactividad DOM nativa (por ejemplo, es muy difícil insertar un buscador desplegable complejo *dentro* de un nodo de Canvas puro). Los nodos nativos del DOM (HTML/CSS) son perfectos para tableros basados en cuadrículas y permiten la inyección transparente de componentes estándar de Ionic o personalizados.
- **Integridad Topológica:** Seguiremos dependiendo de `Engine_DB.analyzeTopology` en el backend para prevenir dependencias circulares y robo de huérfanos, utilizando el `contexto_id` para acotar y aislar las reglas topológicas al espacio de trabajo actual.
