# Research Report: ApexTree Collapse/Expand All Implementation (Epic E46)

## 1. Problem Statement
The user reported that the custom "Colapsar Todo" and "Descolapsar Todo" buttons injected into the UI do not function. Previous attempts to use standard library methods (`expandAll`, `collapseAll`) failed silently because they do not exist in the vendor library. Subsequent attempts to directly mutate the internal `nodeMap` state of `ApexTree` also failed, likely due to scope isolation or unexpected internal properties (e.g., `tree.data` being undefined).

**Research Question:** How can we reliably implement bulk expand/collapse functionality for `ApexTree` without native bulk methods, ensuring performant UI updates?

## 2. Triangulated Findings

1. **Absence of Native Bulk API:**
   Source code analysis of `Vendor_ApexTree.html` confirms there are no `expandAll()` or `collapseAll()` methods. The library only exposes `expand(nodeId)` and `collapse(nodeId)`.
2. **Performance Constraints:**
   The `collapse(nodeId)` method performs the following:
   `this.nodeMap[e] = { ...n, children: [], hiddenChildren: n.children }; this.render({ mode: "collapse" });`
   If we loop over 100 nodes and call `tree.collapse(id)`, it will trigger 100 consecutive full canvas renders, which is highly inefficient and likely to crash or freeze the browser.
3. **Internal State Isolation:**
   External mutations to `tree.nodeMap` fail because `tree.render()` and `tree.setGraphNodesAndEdges()` rely on internal encapsulated variables (like `tree.data.id`) that might not be exposed or correctly bound when called externally from our UI injection script.
4. **Data Engine Fallback (Re-rendering):**
   The `DataEngine.buildHierarchyTree` generates the tree data dynamically. `ApexTree.render(treeData)` replaces the entire tree. If we pre-process `treeData` to strip `children` before passing it to `ApexTree`, the tree renders entirely collapsed. However, `ApexTree` uses the initial `treeData` to build its internal `nodeMap`. If we strip `children`, ApexTree has no record of the hidden children, rendering the native expand buttons useless.

## 3. Recommended Approaches

### Approach A: The "Render-Patch" Loop (Recommended)
Since `tree.collapse(id)` works but triggers a render every time, we can temporarily disable the `render` function on the tree instance, run the loop, and then restore and call it once.

```javascript
const toggleAll = (expand) => {
    if (!tree.nodeMap) return;
    
    // 1. Temporarily patch the render method to prevent O(N) renders
    const originalRender = tree.render;
    const originalSetGraph = tree.setGraphNodesAndEdges;
    
    tree.render = () => {};
    tree.setGraphNodesAndEdges = () => {};
    
    // 2. Loop and trigger native expand/collapse logic
    Object.keys(tree.nodeMap).forEach(id => {
        if (expand) tree.expand(id);
        else if (id !== treeData.id) tree.collapse(id); // Avoid collapsing root if desired
    });
    
    // 3. Restore and execute single render
    tree.render = originalRender;
    tree.setGraphNodesAndEdges = originalSetGraph;
    
    tree.setGraphNodesAndEdges(treeData.id);
    tree.render({ mode: expand ? "expand" : "collapse" });
};
```

### Approach B: Recursive DOM Event Simulation
ApexTree delegates click events to `<g>` elements representing nodes. By recursively finding nodes that have children and firing the native click event (or calling the internal callback `tree.callbacks.onCollapse(id)`), we can simulate user interaction. This is more brittle as it depends on DOM structure or callback exposure.

## 4. Conclusion & Next Steps
The failure of the buttons is a direct consequence of trying to mutate internal library state from the outside without properly simulating the internal class context. **Approach A (Render-Patch Loop)** is the most epistemologically sound because it leverages the library's *actual* `expand()` and `collapse()` methods, guaranteeing internal state consistency, while bypassing the O(N) re-render bottleneck via a standard JavaScript method monkey-patch.

**Actionable Step:** Implement Approach A in `src/UI_View_Tree.client.js`.
