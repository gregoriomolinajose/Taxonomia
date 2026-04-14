# Story: Refactor Graph Edge Resolution & EventBus Typing

## Metadata
- **Epic**: eX-hydration
- **Status**: Ready
- **Priority**: High (Architecture Tech Debt)
- **Reporter**: RaiSE AR (Architecture Review)
- **Area**: Frontend (DataStore, UI_SubgridBuilder, FormRenderer_UI)

## Hypothesis / Context
During the completion of the `S34.6` story for cache stabilization, an architecture review (AR) identified two severe code smells that jeopardize the maintainability and temporal performance of the application:
1. **H9/H10 Pattern Duplication**: Six different components manually iterate over `Sys_Graph_Edges` using `O(V)` native `filter()` and `find()` primitives. They duplicate the exact parent-child graph resolving heuristics, preventing UI abstraction reuse.
2. **H11 EventBus Global Scope**: `AppEventBus` publishes the `FormEngine::RecordHydrated` signal context-free globally. This forces all DOM-living components to perform defensive filtering on arbitrary HTTP response events.

## Jobs to be Done
- [ ] **Extend `DataStore._topologyIndex`**: Modify `JS_Core.client.js` to build bi-directional indexing matrices mappings: `[tipo_relacion][parentToChild]` and `[tipo_relacion][childToParent]`.
- [ ] **Centralize Resolution**: Provide a unified accessor (e.g., `window.DataStore.resolveEdgeValue(direction, tipo_relacion, pk)`) to yield mapped IDs instantly in `O(1)`.
- [ ] **Eradicate Legacy Iterations**: Purge usage of `.find()` and `.filter()` over `Sys_Graph_Edges` within:
  - `DataView_UI.client.js:225`
  - `FormRenderer_UI.client.js:560`
  - `UI_DataGrid.client.js:514`
  - `UI_SubgridBuilder.client.js:96`
- [ ] **Typed PubSub Channels**: Update `AppEventBus.publish` payloads across the backend asynchronous callbacks to use namespaced topics (`FormEngine::RecordHydrated::[Entity]::[PK]`) simplifying observer logic in subgrids.

## Definition of Done (DoD)
- `JS_Core.client.js` encapsulates 100% of the Graph mapping logic. NO other client-side file imports or queries `Sys_Graph_Edges` directly.
- Performance profiling verifies `O(1)` Lookups against the Temporal Graph.
- Rapid tab switching between identical Entity views triggers exactly one Hydrated payload callback targeted exclusively for the active drawer.
- Zero regressions in existing capacity map drilldowns.
