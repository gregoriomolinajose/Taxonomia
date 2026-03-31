# Epic Design: E12 - UI Modularization & Core Scaling

## 📐 Conceptual Architecture

### 1. The FormEngine Trifecta (S12.1)
The massive `FormEngine_UI.html` node injector currently violates SRP by orchestrating state, rendering native DOM nodes, listening to external network buses, and resolving relational schema subgrids simultaneously. 
**Target Component Architecture:**
- `FormRenderer_UI.html`: Controls the asynchronous save state, loads schema configs, maps `DataView` input parameters to fields, and loops over the unified `renderForm()` API.
- `FormBuilder_Inputs.html`: Pure Factory. No closures with outer form states. Exposes `buildSelect()`, `buildInput()`, `buildToggle()`, returning pure `<ion-item>` sub-trees.
- `FormValidators.html`: Pluggable validation layer evaluated during the `save()` sequence.

### 2. State & Node Decoupling (S12.2)
- **UI_Router.html:** Extraction of `window.navigateTo` and `window.applySidebarState` from `JS_Core.html`. The Global Event Bus replaces direct method invocations (`AppEventBus.publish('NAV::CHANGE', 'dashboard')`).
- **UI_DataGrid.html:** The rendering of HTML tables and grid pagination currently housed in `DataView_UI.html` will be moved to a polymorphic algorithm that accepts an array of metadata and columns, decoupled from Google Apps Script network adapters.

### 3. Resilience and QA Pipeline (S12.3)
- Global `window.onerror` fallback for Unhandled Promise Rejections bounding the *White Screen of Death* (WSOD) symptom resulting from dynamic `include()` syntax.
- Replacement of optimistic setTimeout in the `UI_ModalManager.html` LIFO stack to native `ionModalDidDismiss` observers.

## 🤝 Key Contracts

1. **LocalEventBus Handover:** The extraction of Input builders into `FormBuilder_Inputs.html` means `LocalEventBus` must be passed via Dependency Injection (DI) to each Input builder so they can independently subscribe to and publish topologic depth changes (SCD-2).
2. **Schema Engine SSOT:** `APP_SCHEMAS` remains untouched. The FormRenderer simply passes the exact sub-block `fieldSchema` down to the FormBuilder.

## 🛑 Mitigations
- *DOM Memory Leaks:* The new FormBuilder module MUST NOT attach orphaned `EventListener`s to `document` or `window`. All reactive interactivity must exclusively route through the transient `LocalEventBus`.
- *Performance:* Sub-segmenting `.html` scripts in Apps Script increases compilation lines, making DevSecOps QA stripping (`deploy.js`) paramount to maintaining the bundle size below 200KB.
