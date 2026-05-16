# Epic Retrospective: E54 - Filtros Entidades

## Metrics
- **Stories Planned**: 4
- **Stories Completed**: 4
- **Estimated Total Effort**: ~5.5h (T-Sizes: S, M, L, M)
- **Actual Total Effort**: ~5.5h

## What went well
- **Decoupled Architecture**: The use of a decoupled UI component (`UI_UniversalFilter`) that does not intrude into the internals of every view proved highly successful. Integrating it centrally through `DataView_UI` avoided the "shotgun surgery" anti-pattern.
- **In-Memory Filtering (O(N))**: Applying logical AND/OR intersection purely in JS against the pre-fetched dataset eliminated the need to add massive query payloads to the Google Apps Script backend, keeping response times instant for the user.
- **JIT Hydration**: Injecting the `_LOOKUP_DATA` dictionary at render-time instead of altering the raw state preserved the DataView Engine's capability to filter by raw UUID, separating the UI concern from the logic concern cleanly.

## What to improve
- **Bundle Inclusion Automation**: The final defect (Drawer failing to load) was traced to Google Apps Script's `Index.html` compilation process requiring explicit `<?!= include() ?>` directives. In the future, we should either automate the HTML include process during CI/CD or make it a mandatory checklist item when generating new frontend `.client.js` files.
- **Schema Defaults**: We identified edge cases where missing elements in `APP_SCHEMAS` (like empty `.fields` arrays) could crash the filter loop. Strict typing or a schema normalization step is highly recommended for upcoming epics.

## Key Learnings & Architecture Patterns
- **OCP (Open-Closed Principle)**: The new filter system extends `DataView_UI` via dependency injection (passing callbacks and `filterInstance` instances) instead of modifying its core data manipulation loops.
- **Gas Frontend Bundle Isolation**: We must remember that classes compiled via `deploy.js` are not implicitly available to `window`. Explicit assignment `window.ClassName = ClassName;` is mandatory.

## Action Items
- [ ] Add `Index.html` include validation to the deployment pipeline (`deploy.js` could warn if a `.client.js` file is built but not referenced).
- [ ] Evaluate implementing a unified State Management object (e.g., Redux or similar lightweight context) to orchestrate data flows instead of passing deeply nested arguments.
