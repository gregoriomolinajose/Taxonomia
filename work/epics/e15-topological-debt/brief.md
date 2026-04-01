# Epic 15: Topological Tech Debt (Cleaning Sprint)

## Hypothesis
Tackling accumulated structural technical debt (FormEngine size, Global scope pollution, GC Modales flashes, and Deployment Pipeline vulnerabilities) will stabilize the UI foundation and increase fault tolerance before introducing Next-Gen MDM architectures (Epic 16).

## Success Metrics
- Zero "White Screen of Death" incidents during dynamic component injection.
- Zero syntax errors bypassing the `deploy.js` pipeline into production.
- Global scope (`window`) clean of legacy aliases (`goToFormSection`, `renderForm`, etc.).
- `UI_DataGrid` or `FormEngine_UI` safely refactored or decoupled to reduce LOC density without breaking existing functionality.

## Appetite
- 1 Sprint (Cleaning Sprint format), high priority but strictly bounded to pure refactoring, not feature additions.

## Rabbit Holes
- Over-engineering the CSS Minifier (Rollup/Esbuild) instead of a simple AST parser for JS validation. Avoid changing the whole build toolchain if `acorn` is enough.
- Attempting to rewrite the entire App Router during the global alias cleanup.
