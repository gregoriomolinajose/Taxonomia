# Epic Design: E46 - Organizational Chart Visualization

## Architecture & Integration Strategy

### 1. UI Integration (`UI_DataView`)
The `UI_DataView` currently supports `list` and `grid` views. We will extend this to include a `tree` view.
- **DataView Toolbar**: Add a new icon button (e.g., `<ion-icon name="options-outline">` or similar tree icon) next to the list and grid toggle buttons.
- **State Management**: Update the `currentView` state in `DataView` to support `'tree'`.
- **View Router**: When `currentView === 'tree'`, instead of rendering a list of `<tax-data-grid-card>` or list items, we render a new container `<div id="org-chart-container"></div>` where ApexTree will be mounted.

### 2. Data Transformation (Linear to Tree)
The existing data arrives as a flat array of records. To feed ApexTree, we need a nested JSON structure.
- **Dependency Mapping**: We will utilize the `Líder` field (or equivalent parent reference) to group records.
- **Transformer Utility**: Create a function `buildHierarchyTree(records, parentKey, idKey)` that returns a tree object.
  - Nodes will need: `id`, `data` (containing Name, Surname, Avatar, Cargo, Department), and `children`.

### 3. ApexTree Rendering & Customization
- **Initialization**: Once the view switches to 'tree', instantiate `new ApexTree(document.getElementById('org-chart-container'), options)`.
- **Node Template**: ApexTree allows defining a `nodeTemplate`. We will construct an HTML template literal:
  ```html
  <div class="tree-node ${departmentClass}">
    <img src="${avatar}" class="node-avatar" />
    <div class="node-details">
      <span class="node-name">${name} ${surname}</span>
      <span class="node-role">${role}</span>
    </div>
  </div>
  ```
- **Styling**: Add CSS rules in the main stylesheet or a component-specific stylesheet to color code `.tree-node` based on the Department value.

## External Dependencies
- **ApexTree.js**: To be included via CDN or local vendor file. (Need to confirm the best import strategy for the project, likely adding it to JS globals).

## Bounded Context
This visualization strictly reads from the local data store model. Any edits (CRUD) must still happen via the existing forms; the chart is a pure reactive visualizer of the current hydration state.
