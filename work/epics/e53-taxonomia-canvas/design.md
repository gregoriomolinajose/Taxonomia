# Epic Design: E53 - Taxonomia Visual Builder Canvas

## 1. Architectural Strategy
We are shifting the UI paradigm for Hierarchy mapping from a linear form (1D) and traditional ECharts node graph (2.5D) into a Native CSS Nested Swimlane Grid (2D Matrix). This approach better accommodates long text, provides a top-down executive view, and maintains vertical alignment across sibling branches.

## 2. Target Components
- `UI_View_TaxonomyCanvas.client.js`: The orchestrator view. Loads the raw flat array of `Sys_Graph_Edges` with `contexto_id` = Taxonomia ID, and builds an in-memory tree.
- `CSS_TaxonomyCanvas.html`: The styling module providing CSS variables for swimlane backgrounds (Yellow, Orange, Purple, Blue) and layout logic (`display: flex; flex-direction: column`).
- `UI_Component_TXSearchable.client.js`: We will reuse our robust searchable component inside a Popover (`ion-popover`) to handle node selection and addition without leaving the canvas.

## 3. Data Model & Contracts
- **Read:** The Canvas fetches data via `API_Universal.getRecords('Sys_Graph_Edges', { contexto_id: taxonomiaId })`. The data is flat. The frontend `JS_GraphUtils` or inline logic will reconstruct the tree using `id_nodo_padre` and `id_nodo_hijo`.
- **Write:** When a user adds children to a node, we will fire an RPC call to persist the edges. The payload must enforce `workspaceMode: true` logic by setting `contexto_id` to the Taxonomy ID.
  - Payload signature: `{ targetEntity, parentId, childIds[], contextId }`.

## 4. Key Decisions (ADR context)
- **Why CSS Grid over ECharts?** ECharts tree maps struggle with node alignment when text sizes vary heavily and lack native DOM interactivity (like inserting a complex custom searchable dropdown *inside* a node). Native DOM nodes (HTML/CSS) are perfectly suited for grid-based dashboards and allow seamless injection of standard Ionic/Custom UI components.
- **Topological Integrity:** We continue to rely on `Engine_DB.analyzeTopology` on the backend to prevent circular dependencies and orphan stealing, utilizing the `contexto_id` to scope the rules.
