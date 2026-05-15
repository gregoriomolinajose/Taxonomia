# Epic E55 Brief: Taxonomy Governance & Deployment Engine

## Problem Statement
Currently, entities can be linked and topologies can be built from individual entity forms. This distributed creation leads to orphans, topology conflicts, and concurrency issues. Additionally, approving a Taxonomy draft does not offer a transparent way to see what relationships will be added or removed in production. The canvas UX is currently constrained within a lateral Drawer, limiting the user's ability to visualize large hierarchies.

## Hypothesis
If we centralize all topological relationship building strictly into the Taxonomia Canvas, restrict entity forms to attribute-only editing, and implement a Graph Diffing engine for approvals, then we will eliminate SCD-2 edge conflicts, ensure a Single Source of Truth for the enterprise architecture, and provide leaders with clear visibility into the impact of their structural changes. Providing a full-screen mode will significantly improve the user experience for complex mapping.

## Success Metrics
- **Centralization**: 100% of topological relationships (Portafolio -> Value Stream, etc.) are managed within the Taxonomia workspace.
- **Conflict Prevention**: 0 concurrency conflicts on edge creation due to isolated draft contexts.
- **Transparency**: A Deployment Preview (Diff) correctly identifies 100% of added, removed, and kept edges before activation.
- **UX**: The canvas can be toggled to a full-screen mode for immersive editing.

## Appetite (Timebox)
1-2 weeks.

## Rabbit Holes (Out of Scope / Risks)
- **Complex UI Framework for Diffs**: Avoid building a complex visual node diff. A simple table or summary list of added/removed relations is sufficient for MVP.
- **Legacy Edge Migration**: We will assume the active edges in the system are correct and will not build a separate migration tool for broken legacy edges. The diffing engine relies on correct current states.
