# Epic E53: Taxonomia Visual Builder Canvas

## Business Objective
Transform the linear, 1D taxonomy creation form into a highly interactive, 2D nested swimlane matrix. This enables strategic leaders to visualize and map complex N-ary hierarchies (Business Units → Portfolios → Product Groups → Products → Capabilities) in a single pane of glass, aligning with modern SaaS architectural mapping standards.

## Scope
- Implement a Native CSS Grid/Flexbox Nested Swimlane Canvas.
- Extract portfolio and group mappings from the linear wizard.
- Create contextual edge injections upon node interactions.
- Provide a responsive, top-down hierarchy mapping UX.

## Milestones
- [ ] **M1: Schema Simplification (S53.1)**
  - *Purpose:* Remove linear relational constraints from the base Taxonomia schema.
  - *Success Criteria:* Taxonomía can be saved requesting only the Root Business Unit.
- [ ] **M2: UI Canvas Component (S53.2)**
  - *Purpose:* Render the nested swimlane layout.
  - *Success Criteria:* A `#taxonomia/canvas/:id` route that loads the custom UI grid matching the executive mockup.
- [ ] **M3: Interactive Node Mapping (S53.3)**
  - *Purpose:* Allow inline linking of Portfolios and Groups.
  - *Success Criteria:* Clicking `[+]` on a swimlane opens a native searchable multiselect popover, successfully saving contextual edges.

## Tracking

| Story | Status | Assigned | Target |
|-------|--------|----------|--------|
| S53.1 | To Do | Rai | Schema Simplification |
| S53.2 | To Do | Rai | Visual Swimlane Layout |
| S53.3 | To Do | Rai | Popover Edge Mutations |
