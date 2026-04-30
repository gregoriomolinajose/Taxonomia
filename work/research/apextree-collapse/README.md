# Research: ApexTree Collapse/Expand All Functionality

**Status:** Completed
**Epic:** E46 (Org Chart Visualization)
**Date:** 2026-04-29

## Overview
A discovery spike to determine the cause of failing "Colapsar Todo" / "Descolapsar Todo" controls injected into `UI_View_Tree.client.js` and to identify the optimal robust fallback implementation since the `ApexTree` library used in the project lacks native `expandAll` and `collapseAll` API methods.

## Artifacts
- [Evidence Catalog](sources/evidence-catalog.md)
- [Research Report](apextree-collapse-report.md)

## Next Steps
Apply **Approach A** (Render-Patch Loop) as identified in the report to `src/UI_View_Tree.client.js` and deploy to DEV for validation.
