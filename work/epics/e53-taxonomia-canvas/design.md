# Epic Design: E53 - Taxonomia Visual Builder Canvas

## 1. Estrategia Arquitectónica
Estamos cambiando el paradigma de interfaz de usuario para el mapeo de Jerarquías, pasando de un formulario lineal (1D) y un gráfico de nodos tradicional con ECharts (2.5D), a una **Matriz Nativa de Swimlanes Anidados con CSS Grid** (2D Matrix). Este enfoque se adapta mucho mejor a textos largos, proporciona una vista ejecutiva de "arriba hacia abajo" (top-down) y mantiene la alineación vertical entre ramas hermanas.

## 2. Componentes Objetivo
- `UI_View_TaxonomyCanvas.client.js`: La vista orquestadora. Carga el arreglo plano de `Sys_Graph_Edges` donde `contexto_id` = ID de la Taxonomía, y construye un árbol en memoria para su renderizado.
- `CSS_TaxonomyCanvas.html`: El módulo de estilos que proporcionará las variables CSS para los fondos de los swimlanes (Amarillo, Naranja, Morado, Azul) y la lógica de disposición (`display: flex; flex-direction: column`).
- `UI_Component_TXSearchable.client.js`: Reutilizaremos nuestro robusto componente de búsqueda múltiple dentro de una ventana emergente (`ion-popover`) para manejar la selección y adición de nodos sin necesidad de abandonar el lienzo visual.

## 3. Modelo de Datos y Contratos
- **Lectura:** El Canvas obtiene los datos a través de `API_Universal.getRecords('Sys_Graph_Edges', { contexto_id: taxonomiaId })`. Los datos vienen planos. El frontend, mediante `JS_GraphUtils` o lógica en línea, reconstruirá el árbol basándose en las llaves `id_nodo_padre` e `id_nodo_hijo`.
- **Escritura:** Cuando un usuario agrega hijos a un nodo, dispararemos una llamada RPC para persistir las aristas. El payload debe aplicar la lógica de `workspaceMode: true` inyectando el `contexto_id` apuntando al ID de la Taxonomía actual.
  - Firma del Payload: `{ targetEntity, parentId, childIds[], contextId }`.

## 4. Decisiones Clave (Contexto ADR)
- **¿Por qué CSS Grid sobre ECharts?** Los mapas de árbol de ECharts tienen problemas con la alineación de nodos cuando los tamaños de texto varían enormemente, y carecen de interactividad DOM nativa (por ejemplo, es muy difícil insertar un buscador desplegable complejo *dentro* de un nodo de Canvas puro). Los nodos nativos del DOM (HTML/CSS) son perfectos para tableros basados en cuadrículas y permiten la inyección transparente de componentes estándar de Ionic o personalizados.
- **Integridad Topológica:** Seguiremos dependiendo de `Engine_DB.analyzeTopology` en el backend para prevenir dependencias circulares y robo de huérfanos, utilizando el `contexto_id` para acotar y aislar las reglas topológicas al espacio de trabajo actual.
