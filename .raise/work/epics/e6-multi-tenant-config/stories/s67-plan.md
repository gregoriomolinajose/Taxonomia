# S67 Implementation Plan: Multi-Account Clasp Auth

## Overview
- **Story:** S67
- **Size:** S
- **Date:** 2026-05-28
- **Context:** The goal is to allow deployments to different environments belonging to different Google accounts (Gmail, Coppel, Bancoppel) from a single machine seamlessly. This plan decomposes the story into atomic tasks.

## Tasks

### Task 1: Implement Credentials Mapping & Flag Injection in deploy.js
- **Description:** 
  1. Import `os` module.
  2. Define `CREDS_FILE` map for `dev` (gmail), `prod` (coppel), and `tenantB` (coppel).
  3. Implement logic to check if a mapped credentials file exists for the current environment.
  4. If it exists, append the `--creds "<path>"` flag to both `clasp push` and `clasp deploy` command strings.
  5. If it doesn't exist but is mapped, log a warning with login instructions and fallback to the default global token.
  6. Preserve default behavior if the environment is unmapped.
- **Files:** `deploy.js`
- **AC Reference:** `Scenario: Deploy a dev usando creds de Gmail`, `Scenario: Deploy a prod usando creds de Coppel`, `Scenario: Archivo de creds no encontrado — fallback graceful`, `Scenario: Entorno sin creds configuradas — comportamiento anterior`.
- **TDD Cycle:** 
  - **RED:** Verify current `deploy.js` lacks `--creds` injection.
  - **GREEN:** Add the `CREDS_FILE` map, fallback warnings, and flag injection logic.
  - **REFACTOR:** Simplify the string interpolation for the flag to ensure commands are legible.
- **Verification:** `node -c deploy.js` (Syntax check)
- **Size:** S
- **Dependencies:** None

### Task 2: Manual Integration Test
- **Description:** Validate the multi-account auth fallback and flag injection end-to-end with the actual deployment script.
- **Files:** N/A (Manual Execution)
- **AC Reference:** Integration of all Scenarios.
- **TDD Cycle:** N/A
- **Verification:** 
  1. Verify fallback: Run `npm run deploy:dev:auto` when `~/.clasp-gmail.json` does NOT exist. Confirm the warning is logged and the script doesn't crash.
  2. Verify flag injection: Create a dummy `~/.clasp-gmail.json` and run `npm run deploy:dev:auto`. Confirm `--creds` is injected into the executed command.
- **Size:** XS
- **Dependencies:** Task 1

## Execution Order
1. **Task 1:** Implement Credentials Mapping & Flag Injection in deploy.js
   *Rationale: This is the core functionality and has no dependencies.*
2. **Task 2:** Manual Integration Test
   *Rationale: Requires the logic to be implemented first to verify end-to-end behavior.*

## Risks and Mitigations
- **Risk:** `execSync` might fail if the path to the credentials file contains spaces and is not quoted properly.
  - **Mitigation:** Ensure the `credsPath` is properly wrapped in quotes within the injected flag (e.g., `--creds "${credsPath}"`).

## Duration Tracking
| Task | Estimated | Actual | Status |
|------|-----------|--------|--------|
| 1 | 30m | | Pending |
| 2 | 15m | | Pending |
