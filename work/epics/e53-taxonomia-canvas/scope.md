# Epic E53: Taxonomia Visual Builder Canvas

## Business Objective
Transform the linear, 1D taxonomy creation form into a highly interactive, 2D nested swimlane matrix. This enables strategic leaders to visualize and map complex N-ary hierarchies (Business Units → Portfolios → Product Groups → Products → Capabilities) in a single pane of glass, aligning with modern SaaS architectural mapping standards.

## Scope
- Implement a Native CSS Grid/Flexbox Nested Swimlane Canvas.
- Extract portfolio and group mappings from the linear wizard.
- Create contextual edge injections upon node interactions.
- Provide a responsive, top-down hierarchy mapping UX.

## Milestones
- [x] S53.1 Schema Simplification ✓
- [x] S53.2 Visual Swimlane Layout ✓
- [ ] S53.3 Interactive Contextual Mutations
- [ ] S53.4 E2E Integration and Scaling

## Implementation Plan

### Sequence & Rationale

| Seq | Story | Name | Rationale | Dependencies |
|-----|-------|------|-----------|--------------|
| 1 | S53.1 | Schema Simplification | **Dependency-driven:** Clears the linear constraints from the Form Engine so we can build a visual canvas without validation conflicts. | None |
| 2 | S53.2 | Visual Swimlane Layout | **Walking skeleton:** Build the UI skeleton (CSS Grid/Flexbox) reading data, before adding interactivity. Proves the architectural approach. | S53.1 |
| 3 | S53.3 | Popover Edge Mutations | **Core MVP:** Add the interactive `[+]` logic and write operations to complete the cycle. | S53.2 |
| 4 | S53.4 | E2E Integration | **Integration Checkpoint:** Verify cross-story contracts (Read -> Write -> Re-render) using actual DB edge endpoints. | S53.3 |

*Parallel Opportunities:* S53.2 (UI reading data) and S53.1 (Schema cleanup) cannot be run deeply in parallel since the visual canvas requires a clean context, but the CSS layout (`CSS_TaxonomyCanvas.html`) can be stubbed independently.

### Milestones

- [x] **M1: Schema Cleared (S53.1)** - Taxonomía saves cleanly with only Unidad de Negocio.
- [x] **M2: Read-Only Canvas (S53.2)** - The canvas renders correctly existing edges using native entity colors.
- [ ] **M3: Interactive Canvas (S53.3)** - The canvas allows adding new edges via Popover.
- [ ] **M4: E2E Integration (S53.4)** - Complete verification of the graph constraints and optimistic rendering.

### Tracking

| Story | Status | T-Size | Actual | Assigned |
|-------|--------|--------|--------|----------|
| M1 (S53.1) | Clean Relational DB | COMPLETE | 1.0 hr | 1.2 hr |
| M2 (S53.2) | Visual Graph Component | COMPLETE | 2.0 hr | 2.0 hr |
| M3 (S53.3) | Popover Mutators | PENDING | 2.5 hr | - |
| S53.4 | To Do  | S      | -      | Rai      |

### Sequencing Risks
1. **Layout complexity (High):** Replicating the exact swimlane grid purely with CSS might require complex nesting. Mitigation: Isolate the layout in a standalone `.html` file first.
2. **State Hydration (Medium):** Triggering an immediate re-render of the canvas after a popover mutation without reloading the page. Mitigation: Re-fetch graph edges silently and swap the memory state.
