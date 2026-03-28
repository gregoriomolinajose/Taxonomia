# Retrospective — File System Audit & Cleanup

**Date:** 2026-03-27
**Story:** Codebase hygiene audit — dead code elimination, docs consolidation
**Review by:** Antigravity + Gregorio

---

## What Was Delivered

Full file system audit and cleanup pass across the Taxonomia Project:

| Category | Files Removed | Details |
|----------|--------------|---------|
| Debug logs (root) | 11 files (~135 KB) | `test_fail*.log`, `test_output*.txt`, etc. |
| Test logs (`__tests__/`) | 2 files | `test_fail.log`, `equipo_fail.log` |
| `tmp_pull/` (orphaned dir) | 13 files | Legacy GAS pull directory with duplicate src |
| `taxonomia/` (orphaned dir) | 1 empty dir | Failed RaiSE init artifact |
| `docs/` stale docs | 3 files | `ARCHITECTURE_CONTEXT.md` (→ governance), `Auto-Audit-*.md` |
| `figma_export/` | Full React prototype | Unused design reference, separate git repo |

**Docs consolidated:**
- `docs/ARCH_LECCIONES_APRENDIDAS.md` → moved to `governance/` (SSOT)
- `docs/business_model.md` — kept in `docs/` (agent context, not architecture)

**Commits:** 3 chore commits pushed to `develop` + `main`

---

## Test Gate

```
Test Suites: 18 passed (2 skipped)
Tests:       74 passed (8 skipped), 82 total
```

Zero test regressions from cleanup.

---

## What Went Well

- Filesystem audit was systematic: root → src/ → docs/ → governance/ → work/ → orphaned dirs
- `figma_export/` correctly identified as a git submodule (mode 160000) — removed cleanly
- `docs/` vs `governance/` boundary is now clearly defined with distinct purposes
- `business_model.md` correctly kept in `docs/` after content analysis revealed it is agent-operational config, not a business documentation artifact

## What Could Improve

- Root-level debug logs should be in `.gitignore` — they accumulated over multiple sessions
- `tmp_pull/` should never have been committed; the pull workflow needs a cleanup step

## Learnings

- **Git submodule detection:** `delete mode 160000` in git output signals an unregistered submodule. Use `git rm --cached <dir>` before `Remove-Item` for cleaner removal.
- **Document classification:** A file named `business_model.md` can still be agent-operational config. Always read the content before moving based on filename alone.
- **`.gitignore` debt:** Add `*.log`, `test_*.txt`, `*_test_*.txt` patterns to prevent future log accumulation.
