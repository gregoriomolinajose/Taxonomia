## Architecture Review: S67 (scope: story)

### Critical (fix before merge)
*(None)*

### Recommended (simplify before next cycle)
- `deploy.js`:229 (H11 - Change Reason Count)
  - **Proportionality Concern**: `deploy.js` is changing for many unrelated reasons: CSS/JS bundling (Esbuild), AST validation, QA module stripping, version bumping, clasp config generation, and now multi-account Auth Swapping. 
  - **Concrete Simplification**: Extract the build pipeline logic (CSS bundling, QA stripping, virtual HTML generation) into a dedicated `build.js` script or move more into `pipelineUtils.js`. `deploy.js` should focus purely on orchestrating the build and managing clasp CLI/Auth interactions.

### Questions (require human judgment)
- `deploy.js`:45 (H8 - Configuration Over Convention)
  - **Proportionality Concern**: We are hardcoding the credentials map (e.g., `dev` -> `~/.clasp-gmail.json`) directly in the shared deploy script. If a new developer joins and uses a different personal account for `dev`, they would be forced to use a file misleadingly named `gmail.json` or modify this version-tracked file.
  - **Concrete Simplification**: Should this credentials mapping be defined in a local `.env` or untracked configuration file instead of being hardcoded in the deployment script?

### Observations (patterns noted)
- **Adaptability**: The credentials swap approach (temporarily replacing `~/.clasprc.json` instead of injecting `--creds`) was correctly justified in `s67-progress.md` due to clasp 3.x limitations. Good pivot.
- **Resilience**: To prevent the developer from getting stuck with the wrong token if they abort the script (`Ctrl+C`), consider attaching `restoreClaspCredentials()` to `process.on('SIGINT')` and `process.on('uncaughtException')`.

### Verdict
- [ ] PASS WITH QUESTIONS
