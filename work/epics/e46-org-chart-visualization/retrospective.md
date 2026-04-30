# Retrospective: E46 - Organizational Chart Visualization

## 📊 Quick Metrics

- **Total Stories:** 4
- **Completed:** 4
- **Abandoned:** 0

## 🎯 Outcomes

### What went well?
- Successfully integrated `ApexTree` to dynamically render recursive organizational hierarchies.
- The UI/UX was polished correctly, changing default vertical trees to rich horizontal card designs mimicking the Premium DataGrid.
- We aggressively resolved a library rendering issue by decoding the bundle and intercepting DOM injection, eliminating unwanted watermarks without modifying the third-party binary file.
- The hierarchy algorithm was refactored from static "department" based groups to a true graph traversal based on the `Sys_Graph_Edges` system (relationship `PERSONA_LIDER_DIRECTO`), ensuring data topological integrity.

### What didn't go well?
- Deployment and testing in Google Apps Script is slow due to lack of local testing capabilities and domain restrictions, requiring manual user intervention to update the executable version for every test cycle.
- Library documentation (ApexTree) was opaque regarding its watermark generation and SVG injection mechanisms, requiring a reverse-engineering session.

### Process Improvements
- Whenever utilizing heavy third-party UI libraries, we should immediately verify their "premium/watermark" behaviors to isolate them before focusing on data rendering.

## 🧠 Architectural Decisions & Patterns

- **Schema-Driven Resolution:** Adopted a dynamic schema lookup methodology to discover the 'padre' and 'hijo' foreign key definitions in `Schema_Utils`, decoupling hardcoded references from `DataEngine_UI`.
- **Topological Graph:** Deprecated standard array `.filter()` techniques for tree building in favor of JIT querying against the pre-computed `Sys_Graph_Edges` table, aligning UI with the backend persistence architecture.
- **Visual Sovereignty:** Overrode default SVG rendering behaviors by treating the charting library strictly as an XY coordinate layout engine, regaining full aesthetic control using custom HTML/CSS nodes.

## 📝 Final Status
The epic has met all its acceptance criteria and provides a robust visual representation of organizational structures. The Epic E46 is now closed.
