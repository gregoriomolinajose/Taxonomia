# Epic Plan: E46 - Organizational Chart Visualization

## Execution Sequence

### S46.1: Toolbar View Toggle & Data Transformer
**Objective**: Prepare the UI state and data structures for the tree visualization.
- **Tasks**:
  1. Add the "Tree" toggle button to the `DataView` toolbar.
  2. Implement state logic to support `currentView === 'tree'`.
  3. Build the `DataTransformer.buildHierarchyTree()` utility to convert flat array data into a nested tree format using the parent reference (`Líder`).
- **Dependencies**: None.
- **Estimated Size**: Medium.

### S46.2: ApexTree Library Setup & Base Initialization
**Objective**: Render a basic tree diagram inside the new DataView layout.
- **Tasks**:
  1. Integrate the `ApexTree.js` dependency into the project build/load pipeline.
  2. Hook into the `DataView` render lifecycle so that when `currentView === 'tree'`, the ApexTree instance is initialized on a target container.
  3. Feed the tree with the transformed hierarchical data and ensure basic nodes render correctly.
- **Dependencies**: S46.1.
- **Estimated Size**: Medium.

### S46.3: Custom Node Templating (Avatar & Colors)
**Objective**: Enhance the diagram to display rich information and brand/department colors.
- **Tasks**:
  1. Implement the `nodeTemplate` in ApexTree to inject HTML.
  2. Map the entity's Avatar URL, Name, Surname, and Role into the template.
  3. Create CSS rules (e.g., CSS variables or specific classes) to color the borders/backgrounds of nodes based on their Department.
  4. Ensure responsive behavior (panning, zoom) feels natural within the container.
- **Dependencies**: S46.2.
- **Estimated Size**: Small.

## Milestone Tracking
- [ ] S46.1 Complete
- [ ] S46.2 Complete
- [ ] S46.3 Complete
- [ ] Final Validation & E46 Retrospective
