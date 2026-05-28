# S68 Retrospective: Transferencia de Ownership Deploy

## Summary
- **Story ID**: S68
- **Epic**: e6-multi-tenant-config
- **Date**: 2026-05-28
- **Size**: M
- **Estimated Time**: 60 minutes
- **Actual Time**: 90 minutes

## What Went Well / What to Improve
**What went well:**
- Implementing `.clasp-*.json` token swapping handled the multi-account deployment beautifully without compromising on security constraints set by the organization.
- Detailed step-by-step documentation (`docs/deploy-setup.md`) was written successfully, facilitating quick adoption for future developers.
- `deploy.js` successfully executed the push logic without regressions.

**What to improve:**
- The credential swapping logic currently defaults back to the fallback `~/.clasprc.json` if a specific tenant's credential file isn't found. This "fail-open" strategy should be fixed in future cycles to be a "fail-fast" strategy.
- Deletion of the active token (`fs.unlinkSync`) needs `try/catch` wrapping, as its absence can halt cleanup tasks.

## Heutagogical Checkpoint

1. **What did you learn?**
   We learned that managing multiple `clasp` credentials across restricted corporate environments (like Coppel and Gmail) requires file swapping (`.clasp-gmail.json` to `.clasprc.json`), as `@google/clasp` lacks a native `--creds` flag or robust multi-account support. This must be handled carefully with `try/catch` blocks in NodeJS scripts to prevent uncaught exceptions.

2. **What would you change about the process?**
   The pipeline scripts (`deploy.js`) should fail fast (e.g., `process.exit(1)`) if a specified credential file does not exist, rather than falling back to the active `.clasprc.json`. A "fail-open" behavior causes confusing downstream deployment errors.

3. **Are there improvements for the framework?**
   We identified that runtime configuration logic (`PropertiesService` overrides) is currently duplicated across multiple environment files (`Config.*.js`), leading to drift. The framework should extract this into a central adapter (`Adapter_Config.js`), leaving environment files as static declarative objects.

4. **What are you more capable of now?**
   We are now capable of automating cross-tenant Google Apps Script deployments across disparate corporate domains without relying on insecure external sharing. The system can safely switch identities during CI/CD execution using local credential manifests.

## Improvements Applied
- Registered new behavior patterns for CI/CD fail-fast behavior.
- Registered architecture pattern for centralizing configuration runtime evaluation.

## Patterns
- **Added**: `PAT-G-053` - Enforce fail-fast behavior in CI/CD credential swapping scripts rather than falling back to default tokens (Context: `ci/cd`, `clasp`, `credentials`)
- **Added**: `PAT-G-054` - Extract runtime configuration parsing (e.g. PropertiesService) into a central adapter, keeping environment configs static (Context: `architecture`, `configuration`, `dry`)
