# Scope: Epic 15

## Objective
Reduce the Topological and Structural technical debt accumulated up to Epic 14, focusing on code stability, fail-fast mechanics, and pipeline safety.

## In Scope (MUST/SHOULD)
- CI/CD AST validation in `deploy.js` using `acorn.parse`.
- Migrating `setTimeout` in Modals to `ionModalDidDismiss` event listeners.
- Injecting Error Boundaries (`window.onerror`) for dynamic SPA insertions.
- Trimming empty strings before JSON payloads.
- Deprecating legacy `window.*` aliases used by old components.
- Extricating inputs switch from `FormRenderer_UI` to `UI_Factory`.

## Out of Scope
- Complete rewrite of `FormEngine_UI`. We will only carve out what's strictly necessary.
- Changing CSS styling paradigms (we stay on native CSS).
- New Next-Gen MDM functionalities (Optimistic Locking, RBAC).

## Stories Breakdown (3-10 Stories)
1. **[x] S15.1: Pipeline Validation & Bootstrapping Stability (L) ✓**
   - *Description:* Implement `acorn.parse` in `deploy.js`, add Error Boundaries to WSOD mitigating script, and normalize String Trimmings universally.
2. **[x] S15.2: Purge V8 Global Leaks & GC (M) ✓**
   - *Description:* Deprecate `window.goToFormSection` and `window.getDominiosPadreOptions`, and swap Modal timers to native Ionic Event hooks to prevent screen flashes.
3. **S15.3: Component Architecture Decoupling (M)**
   - *Description:* Move `switch(field.type)` from FormRenderer to Factory, remove hardcoded Subgrid fallbacks (`window.renderForm`), and streamline FormContext object injection.

## Done Criteria & Risks
- **Done:** All 3 stories completed, SPA compiles successfully with the new AST parser, no WSOD incidents, all console warnings cleared.
- **Risks:** 
  1. AST parsing might reject valid Google Apps Script specific templates if not configured correctly (Mitigation: use tolerant parsing flags in acorn).
  2. Modals taking too long to dismiss with native listeners (Mitigation: Implement a fallback timeout limit to ensure closure).
