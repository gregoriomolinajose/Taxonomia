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

## Implementation Plan

### Story Sequence & Rationale
1. **S55.1 - Centralización y Bloqueo Relacional** (Foundation): Establece la restricción en la UI antes de construir el motor de aprobación.
2. **S55.3 - Motor de Diffing de Grafos (Lógica)** (Risk-First): Es la parte más compleja algorítmicamente. Resolverlo temprano mitiga el mayor riesgo.
3. **S55.4 - UI de Resumen de Impacto (Deployment Preview)** (Dependency-Driven): Requiere que la lógica de diffing de la S55.3 esté terminada para poder renderizarse.
4. **S55.5 - Transacción de Despliegue (Activation)** (E2E Integration): Conecta el diff visualizado con la persistencia real (SCD-2) en la base de datos.
5. **S55.2 - Inmersión UX (Full-Screen & Accesos)** (Quick Win / Independent): Mejoras visuales que pueden desarrollarse en paralelo en cualquier momento, pero se relegan al final para priorizar el motor funcional.

### Milestones
- **M1: Governance Foundation (S55.1)**: Los usuarios no pueden modificar relaciones topológicas desde los drawers individuales.
- **M2: Diffing Engine MVP (S55.3, S55.4)**: El sistema es capaz de comparar un borrador contra producción y renderizar visualmente las adiciones y eliminaciones.
- **M3: E2E Atomic Deployment (S55.5)**: Un despliegue completo actualiza correctamente `es_version_actual` en la base de datos de manera idempotente.
- **M4: Epic Complete (S55.2)**: La experiencia inmersiva a pantalla completa está lista para el usuario final.

### Parallel Work Streams
- **S55.2** puede ser ejecutada en paralelo a cualquier otra historia por un desarrollador enfocado en UI/CSS, ya que no tiene dependencias críticas de backend ni de estado global.

### Sequencing Risks
1. **Diffing Algorithm Complexity**: Si el cálculo del hash o la recuperación de aristas (S55.3) tiene fallos, retrasará directamente S55.4 y S55.5.
2. **State Management**: La sincronización de estado de la Taxonomía antes y después del despliegue (S55.5) podría causar ghosting si la caché del UI no se invalida correctamente.
3. **Bloqueo Inadvertido**: S55.1 podría bloquear campos relacionales que no pertenecen estrictamente a la topología de Taxonomía si las reglas de `Schema_Engine` no son suficientemente granulares.

### Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|------|--------|--------|----------|-------|
| S55.1 | S | Pending | - | - | Foundation for governance |
| S55.3 | M | Pending | - | - | Core logic risk |
| S55.4 | M | Pending | - | - | Depends on S55.3 |
| S55.5 | M | Pending | - | - | E2E Integration |
| S55.2 | S | Pending | - | - | UX enhancement |
