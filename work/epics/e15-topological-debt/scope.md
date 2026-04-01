# Scope: Epic 15

## Objective
Reduce the Topological and Structural technical debt accumulated up to Epic 14, focusing on code stability, fail-fast mechanics, and pipeline safety.

## In Scope
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

## Planned Stories
- S15.1: Pipeline Validation & Fallback Protections (deploy.js AST, Error Boundaries, String Trimming).
- S15.2: Scope Purge & GC Optimization (Remove global aliases, migrate Modal timers).
- S15.3: Core Refactoring (FormRenderer Input Delegation, DataGrid/FormEngine simplifications).

## Done Criteria
- All items mapped in the In Scope section are completed and verified.
- The UI builds correctly with `clasp push` ensuring AST validity.
- The App runtime shows no global console errors or memory leaks related to the targeted components.
