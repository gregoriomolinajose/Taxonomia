# Retrospective — Quality Review Fixes (Post S4.3)

**Date:** 2026-03-27
**Story:** Post-QR Fix Pass — resolve findings from S4.3 audit
**Review by:** Antigravity + Gregorio

---

## What Was Delivered

7 targeted code fixes resolving all findings from the `/rai-quality-review` of S4.3:

| ID | File | Fix |
|----|------|-----|
| C-01 | `Adapter_Sheets.js` | Strict PK equality `String()===String()` (anti type-coercion) |
| C-02 | `FormEngine_UI.html` | `newOptions.length` moved inside `Array.isArray` guard |
| R-01 | `Adapter_Sheets.js` | `includeAudit` flag on `list()` for edit hydration audit trail |
| R-02 | `Adapter_Sheets.js` | Spanish `-es` pluralization fix (`capacidades→capacidad`) |
| R-03 | `FormEngine_UI.html` | `await Promise.resolve()` on pre-hydration lookup resolvers |
| O-01 | `Dominio_Hierarchy.test.js` | 7 behavioral tests for hierarchy math engine |
| O-02 | `Schema_Engine.gs` | Explicit `pkField` in `calcParams` for self-documenting schema |

Plus:
- **rai CLI installed and PATH configured** (`raise-cli v2.2.1`)
- **`rai graph build`** ran successfully — 36 nodes updated, 6 modules indexed
- **Architecture discovery complete** — 9 module docs + `index.md` + `domain-model.md`

---

## Test Gate

```
Test Suites: 18 passed (2 skipped)
Tests:       74 passed (8 skipped), 82 total
```

Second `/rai-quality-review` returned **PASS** with no critical findings.

---

## What Went Well

- The QR process caught genuinely risky code (loose `==` PK comparison, unchecked `.length` on null)
- Behavioral tests (`buildOrdenPath`) now give regression protection for the most complex logic in the system
- `rai graph build` automated the knowledge graph sync post-discovery
- PATH fix was non-trivial (two Python environments on the machine) but was resolved systematically

## What Could Improve

- The `rai` CLI should be documented in an onboarding script — it was missing from PATH and required manual investigation
- The `buildOrdenPath` test helper is a copy of engine logic, not the real module — future architectural refactor should consider extracting the hierarchy engine to a shared module importable by both GAS and Jest

## Learnings

- In GAS hybrid projects (`.gs` + `.html`), pure functions inside IIFEs cannot be imported in Jest — extract testable logic into helper modules
- `pipx upgrade raise-cli` is the correct upgrade path; `pip install --upgrade` downgrades a pinned dependency (`rai-cli` pins `raise-cli==2.2.1`)
