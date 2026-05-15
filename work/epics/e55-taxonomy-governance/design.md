# Epic E55 Design: Taxonomy Governance & Deployment Engine

## 1. Context & Gemba
The Taxonomia Canvas (built in E53) provided a robust visual interface. However, allowing topological changes from individual entity drawers circumvents the canvas's authority, risking SCD-2 corruption and orphaned nodes. Additionally, promoting a Draft Taxonomia to Active status currently lacks transparency—there is no formal "Diff" or "Pull Request" summary showing what edges are added or removed.

## 2. Key Architectural Decisions (ADRs Required/Deferred)

### Decision 1: Relational Schema Locking
- **Approach:** We will not create separate "Taxonomia-only" schemas. Instead, `Schema_Engine.js` will dynamically evaluate the execution context (e.g., `window.taxonomiaContext` or a UI flag). If the context is NOT a Draft Taxonomia Wizard, relational fields (`portafolios_vinculados`, `equipos_asignados`, etc.) will render as `readonly: true`.
- **Why:** Reusing the same components but enforcing read-only behavior minimizes UI divergence and ensures users can still see their relationships, but forces them to use the Canvas to edit them.

### Decision 2: The Graph Diffing Algorithm (Deployment Preview)
- **Approach:** When the user initiates approval for a Draft Taxonomia (`estado: Borrador -> Activo`), we will execute a mathematical diff comparing the target production edges (those where `es_version_actual: true` and `tipo_relacion` match the Taxonomia branches) against the Draft's edges.
- **Diff Logic (Pseudo-code):**
  - Fetch `Prod_Edges` (Active) relevant to the topology.
  - Fetch `Draft_Edges` (context = ID_Taxonomia).
  - Map edges to unique structural hashes: `HASH(padre_id, hijo_id, tipo_relacion)`.
  - **Adds:** Hashes in `Draft_Edges` but not in `Prod_Edges`.
  - **Removes:** Hashes in `Prod_Edges` but not in `Draft_Edges`.
  - **Keeps:** Hashes in both.

### Decision 3: Atomic Activation (SCD-2)
- **Approach:** The activation transaction will execute two steps atomically:
  1. Soft-delete the "Removes": `UPDATE Sys_Graph_Edges SET es_version_actual = false WHERE hash IN (Removes)`.
  2. Activate the Draft edges: `UPDATE Sys_Graph_Edges SET es_version_actual = true, estado = 'Activo' WHERE hash IN (Adds) OR context = ID_Taxonomia`.
  3. Mark the Taxonomia entity itself as `Activo`.

## 3. Component Impacts

- **`Schema_Engine.js`**: Hook injections for read-only conditions on relational fields.
- **`UI_View_SwimlaneGrid.client.js`**: Add the Full-Screen toggle logic (`position: fixed`, z-index manipulation).
- **`Math_Engine.html`**: Implement `calculateGraphDiff(activeEdges, draftEdges)`.
- **`UI_ETL_Modal.client.js` / New Modal**: Create a `UI_Approval_Diff` modal to visualize Adds (Green) and Removes (Red).
- **`Business_Interceptors.js`**: Add a server-side interceptor for `Taxonomia` approval to execute the atomic SCD-2 transition.

## 4. Contracts & Data Structures

**Diff Output Data Structure:**
```json
{
  "adds": [ { "id_nodo_padre": "A", "id_nodo_hijo": "B", "tipo_relacion": "TYPE" } ],
  "removes": [ { "id_nodo_padre": "A", "id_nodo_hijo": "C", "tipo_relacion": "TYPE" } ],
  "keeps": [ { "id_nodo_padre": "X", "id_nodo_hijo": "Y", "tipo_relacion": "TYPE" } ]
}
```

## 5. Security & Trust Model
- Edge deprecation is destructive (logical delete). The diffing engine must strictly filter by relevant relationship types so it doesn't accidentally deprecate unrelated edges (e.g., `CARGO_PERSONA`). We will bind the diff explicitly to the topology presets mapped in `TOPOLOGY_PRESETS`.
