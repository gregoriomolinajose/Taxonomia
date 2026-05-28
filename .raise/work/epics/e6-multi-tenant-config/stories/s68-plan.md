# Plan: S68 · Transferencia de Ownership Deploy

## Overview
- **Story ID:** S68
- **Epic:** e6-multi-tenant-config
- **Size:** M (5-8 SP)
- **Date:** 2026-05-28

## Tasks

### 1. Documentation: Deploy Setup Guide
- **Description:** Create `docs/deploy-setup.md` providing step-by-step instructions on generating and saving tokens (`.clasp-gmail.json` and `.clasp-coppel.json`), and how to set up the multi-account deployment pipeline.
- **Files to create/modify:** `docs/deploy-setup.md`
- **TDD cycle:** N/A (Documentation)
- **AC reference:** `Scenario: README del setup está actualizado` (from `s68-story.md`)
- **Verification command:** Visual verification of Markdown structure and clarity.
- **Size:** S
- **Dependencies:** None

### 2. Configuration: Update Bancoppel Script ID
- **Description:** Update `deploy.js` to set `SCRIPT_IDS['tenantB']` with the real Script ID corresponding to the Bancoppel GAS project, replacing any placeholder.
- **Files to create/modify:** `deploy.js`
- **TDD cycle:** N/A (Configuration change)
- **AC reference:** `Scenario: Script ID de Bancoppel registrado` (from `s68-story.md`)
- **Verification command:** Run linter or simple syntax check (e.g., `node -c deploy.js`) to ensure no syntax errors introduced.
- **Size:** XS
- **Dependencies:** None

### 3. Manual Integration Test
- **Description:** Validate end-to-end that the deployment pipeline functions correctly with the Coppel account. The user must manually obtain tokens, ensure GAS projects are shared correctly, and execute the deployment scripts to dev, prod, and tenantB.
- **Files to create/modify:** None
- **TDD cycle:** N/A (Manual Testing)
- **AC reference:** `Scenario: Cuenta Coppel puede hacer push a dev (Gmail)` and `Scenario: Cuenta Coppel puede hacer push a prod (Coppel)` (from `s68-story.md`)
- **Verification command:** `npm run deploy:dev:auto` and `npm run deploy:prod:auto`
- **Size:** M
- **Dependencies:** Task 1, Task 2

## Execution Order
1. **Task 1 (Documentation):** Can be done immediately to establish the baseline knowledge and setup steps.
2. **Task 2 (Configuration):** Can be done in parallel or sequentially. It's a quick config change.
3. **Task 3 (Integration Test):** Must be the final task as it verifies the entire end-to-end flow using the setup guide and the updated config.

**Rationale:** The documentation and configuration tasks are independent of each other (parallelizable). The final integration test is the critical risk area, verifying corporate permissions and actual push operations, which requires both the config and the manual setup steps (guided by the documentation) to be complete.

## Risks and Mitigations
- **Risk:** Corporate restrictions might block token generation or API access despite correct configuration.
  - **Mitigation:** Execute manual setup steps early to verify if clasp login via Coppel account succeeds without errors.
- **Risk:** The real Script ID for Bancoppel might not be ready.
  - **Mitigation:** Wait for the manual creation of the project by the user before committing the final ID to `deploy.js`.

## Duration Tracking

| Task | Estimated Size | Actual Time Spent | Status |
|------|----------------|-------------------|--------|
| 1. Documentation | S | | Todo |
| 2. Configuration | XS | | Todo |
| 3. Integration Test | M | | Todo |
