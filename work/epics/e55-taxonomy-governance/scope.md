# Epic E55: Taxonomy Governance & Deployment Engine

## Objective
Transition from a distributed entity-relationship model to a centralized, visually governed topology framework. This involves restricting topology changes exclusively to the Taxonomia Canvas, enabling full-screen immersive UX, and building a Git-like Diffing/Approval Engine to safely promote drafts into the active enterprise architecture.

## Boundaries (In/Out of Scope)
### In Scope
- Modifying `Schema_Engine.js` and Entity UI to make relational fields read-only outside of a Taxonomia context.
- Implementing a "Full-Screen Expand" UI control for the Taxonomia Wizard/Canvas.
- Adding a direct "Taxonomías" quick-access card to the main Dashboard.
- Developing a graph mathematical differ (`Math_Engine` or `API_Universal`) to calculate additions and removals between a draft and the active topology.
- Building an Approval Preview UI to display the deployment summary.
- Executing the atomic deployment to set active edges and deprecate old ones (SCD-2).

### Out of Scope
- Migrating or fixing broken legacy edges that are currently orphaned in the database.
- Building a visual node-diffing canvas (red/green nodes). The diff will be text/list-based for simplicity.

## Planned Stories
- **S55.1 - Centralización y Bloqueo Relacional:** Modificar `Schema_Engine.js` para que los Drawers transaccionales sean de solo lectura para sus relaciones fuera de contexto.
- **S55.2 - Inmersión UX (Full-Screen & Accesos):** Crear acceso rápido en Dashboard y botón "Expandir" en el Header del Canvas/Wizard.
- **S55.3 - Motor de Diffing de Grafos (Lógica):** Lógica que compara el Borrador vs Producción retornando el Delta (Add/Remove/Keep).
- **S55.4 - UI de Resumen de Impacto (Deployment Preview):** Diseño del modal de aprobación visualizando los cambios topológicos.
- **S55.5 - Transacción de Despliegue (Activation):** Backend ETL que aprueba y publica atómicamente la nueva estructura.

## Done Criteria
- 100% of topological relations can only be edited via the Taxonomia Canvas.
- Users can view the Canvas in a full-screen, unconstrained view.
- Approving a Taxonomia draft shows an accurate summary of newly created vs removed relationships.
- Deployment successfully updates `es_version_actual` correctly across all affected edges, respecting Single Source of Truth.
