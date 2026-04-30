# Evidence Catalog: ApexTree Collapse/Expand Functionality

| Source | Type | Level | Key Finding | Relevance |
|--------|------|-------|-------------|-----------|
| `src/Vendor_ApexTree.html` source code (minified) | Primary | Very High | `expand(e)` and `collapse(e)` exist for single nodes. `expandAll` and `collapseAll` do NOT exist. | Explains why native bulk methods fail. |
| ApexTree internal state mechanism | Primary | Very High | Toggling happens by swapping `children` array with `hiddenChildren` inside `this.nodeMap[nodeId]`, followed by `this.render()`. | Shows the internal data structure needed to simulate toggles. |
| Execution of injected `toggleAllNodes` | Primary | High | Direct external mutation of `tree.nodeMap` and calling `tree.render()` failed. Likely because `tree.data` is not structured as expected, or internal methods like `setGraphNodesAndEdges` rely on internal `this` binding that fails externally. | Explains the failure of the previous iteration. |
| DOM Structure of ApexTree | Secondary | Medium | ApexTree renders nodes as `<g data-self="node-id">`. The expand/collapse button is a `<circle>` + `<svg>` path inside this group. | Enables a potential DOM-simulation fallback approach. |
