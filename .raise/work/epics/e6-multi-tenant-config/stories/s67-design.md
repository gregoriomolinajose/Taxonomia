# S67 Design: Multi-Account Clasp Auth

## 1. What & Why
**Problem:** Currently, deploying to different environments (dev, prod, tenantB) requires manual clasp logins because the environments belong to different Google accounts (Gmail, Coppel, Bancoppel), and clasp defaults to a single global token (`~/.clasprc.json`).
**Value:** This change enables developers to deploy to any environment from a single machine seamlessly, reducing manual overhead and preventing accidental deployments to the wrong account.

## 2. Approach
Update `deploy.js` to map each target environment to its corresponding clasp credentials file. 
- `dev` -> `~/.clasp-gmail.json`
- `prod` -> `~/.clasp-coppel.json`
- `tenantB` -> `~/.clasp-coppel.json`

Before executing `clasp push` or `clasp deploy`, the script will check if the specific credentials file exists. If it does, the `--creds <path>` flag will be appended to the command. If it doesn't, a warning will be logged with instructions to run `npx clasp login --creds <path>`, and it will gracefully fallback to the default behavior.

**Components Affected:**
- `deploy.js` (Modify): Add credentials map and pass the `--creds` flag to both `clasp push` and `clasp deploy` commands.

## 3. Examples

**Example 1: Dev Deployment (Success)**
```bash
# Given ~/.clasp-gmail.json exists
$ npm run deploy:dev:auto

# Behavior in deploy.js:
# Executing: npx clasp push -f --creds "/Users/user/.clasp-gmail.json"
```

**Example 2: Prod Deployment (Success)**
```bash
# Given ~/.clasp-coppel.json exists
$ npm run deploy:prod:auto

# Behavior in deploy.js:
# Executing: npx clasp push -f --creds "/Users/user/.clasp-coppel.json"
# Executing: npx clasp deploy -i <deploymentId> -d "auto" --creds "/Users/user/.clasp-coppel.json"
```

**Example 3: Missing Credentials File (Graceful Fallback)**
```bash
# Given ~/.clasp-coppel.json DOES NOT exist
$ npm run deploy:prod:auto

# Console Output:
# [Deploy] WARNING: Credentials file not found: /Users/user/.clasp-coppel.json
# [Deploy] Run: npx clasp login --creds /Users/user/.clasp-coppel.json --no-localhost
# [Deploy] Falling back to default ~/.clasprc.json token.

# Behavior in deploy.js:
# Executing: npx clasp push -f
```

## 4. Acceptance Criteria
- **MUST**: `deploy.js` maps `dev` to `~/.clasp-gmail.json` and uses the `--creds` flag during `clasp push`/`deploy` if the file exists.
- **MUST**: `deploy.js` maps `prod` to `~/.clasp-coppel.json` and uses the `--creds` flag if the file exists.
- **MUST**: If the specific credentials file is not found, log a warning and run clasp commands without the `--creds` flag (graceful fallback).
- **MUST**: If an environment has no entry in the credentials map, run clasp commands without the `--creds` flag, preserving current behavior.
