# Design: S68 · Transferencia de Ownership Deploy

## 1. What & Why
**Problem**: Corporate restrictions prevent sharing Coppel GAS projects and Sheets with external `@gmail.com` accounts, breaking the previous deployment model.
**Value**: By making the Coppel account the primary deployment driver, we can push to all environments (dev, prod, Bancoppel) without violating corporate security policies, ensuring a reliable deployment pipeline.

## 2. Approach
- **Documentation**: Create `docs/deploy-setup.md` with explicit instructions on generating, saving, and switching between `.clasp-gmail.json` and `.clasp-coppel.json` tokens.
- **Configuration**: Update `deploy.js` to register the real Script ID for `tenantB` (Bancoppel), replacing any placeholders.
- **Verification**: Ensure the deployment scripts correctly handle the tokens and successfully push code to all three environments using the Coppel account.

*Value preservation gate passed*: The deploy script retains the domain knowledge of environment mapping and token swapping, keeping the manual DX simple (`npm run deploy:dev:auto`).

## 3. Examples

### Configuration Update (`deploy.js`)
```javascript
const SCRIPT_IDS = {
  dev: '1ZjGYDS...', // Existing Gmail dev project
  prod: '14oIjG_...', // Existing Coppel prod project
  tenantB: '1RealScriptIdFromBancoppelProject' // <- Updated here
};
```

### Setup Guide Structure (`docs/deploy-setup.md`)
```markdown
# Deploy Setup

## Prerequisites
1. Share dev GAS project with Coppel account (Editor).
2. Create tokens:
   `clasp login` -> save to `~/.clasp-coppel.json`
```

## 4. Acceptance Criteria
- **MUST**: `deploy.js` contains the real Script ID for `tenantB`.
- **MUST**: `docs/deploy-setup.md` exists and covers multi-account token setup.
- **MUST**: `npm run deploy:dev:auto` succeeds from the Coppel account.
- **MUST**: `npm run deploy:prod:auto` succeeds from the Coppel account.
- **MUST**: Push to `tenantB` succeeds from the Coppel account.
