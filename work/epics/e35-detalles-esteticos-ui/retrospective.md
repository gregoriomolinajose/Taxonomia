# Epic E35 Retrospective: Detalles Estéticos y Refinamiento UX

**Date**: 2026-04-17
**Status**: Closed
**Scope**: Bugfixes visuales (Drawers, Badge, Avatars), Pruebas QA (EventBus/Memory Leaks) y Deuda Técnica (Refactorización Topológica - H9).

## 1. Summary of Deliverables

- **S35.1 (Visual Refinements)**: Resolved Avatar rehydration bug that depended on unreliable DOM occurrences. Reprogrammed Drawer Headers using pure Flex layout. Reduced architectural complexity of `UI_Factory` by avoiding proxy components for non-visual metadata. Enhanced Dark Mode scaling by leveraging native CSS variables (`var(--dv-primary)`).
- **S35.3 (QA Automation & Integration)**: Developed "Deep Integration Tests" capable of running within GAS iframes. Validated the absence of memory leaks (`H10` Zombie Subscriptions) after 100 concurrent widget interactions.
- **S35.4 (Topological Refactoring)**: Promoted DRY principles (fixed `H9` duplication) by centralizing the hierarchy filtering rules into `UI_FormUtils.filterByTopology`. Eliminated repeated logic across multiple closures inside `RelationBuilder` (`buildRelation`, `reloadDataset`, `bindLevelChangeRepaint`).

## 2. Heutagogical Checkpoint (Epic Level)

### What did we learn?
- **Testing in Sandboxes**: The nuances of running test suites in localized environments (Google Apps Script / iframe sandboxes). Explicitly defining target contexts (`window` vs `global`) is paramount to avoid `ReferenceError` WSODs (White Screen of Death).
- **DOM Dependencies**: Initializing component bindings synchronously with data streams is consistently more robust than deferring UI construction onto custom event listeners (`BadgeUpdated`).
- **Hidden Debt**: Replicated business logic frequently masquerades within separate event handler closures. While lines of code may differ structurally across handlers, mapping out functional intentions unveils duplication (`H9`).

### What would we change about the process?
- Architecture reviews should be executed twice during stories with legacy complexity: First, targeting the immediate diffs; second, zooming out to scan the module for lateral artifacts.
- Require sanity probes in QA test runners that verify required objects (`UI_Factory`, `BuilderRegistry`) before launching actual tests.

### Framework Level Improvements Applied
- Established **"Blur Race Condition Guard"** standard for resilient select/input handling.
- Integrated safety checks inside input factories (e.g., verifying `dataset` structures before performing array operations).
- Upgraded rules tracking (`filterByTopology`) as a centralized utility, effectively decoupling business constraints from generic markup builders.

### Areas of Increased Capability
- Advanced manipulation of hybrid/GAS iframe integration without large third-party runtime frameworks.
- Safe modification and debugging of multidimensional entity filtering patterns (hierarchy parents mapping).
- Refined sensibility for implementing UI enhancements strictly using established `var(--...)` primitives to guarantee design integrity across themes.
