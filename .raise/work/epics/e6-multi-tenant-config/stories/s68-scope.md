# Scope: S68 - Transferencia de Ownership Deploy

## In Scope
- Setup cross-account permissions between Gmail and Coppel accounts.
- Manage `.clasp-gmail.json` and `.clasp-coppel.json` correctly.
- Update `deploy.js` to configure the correct Script ID for `tenantB` (Bancoppel).
- Create or update `docs/deploy-setup.md` with the new multi-account deployment guide.
- Verify deployments to all environments (dev, prod, tenantB).

## Out of Scope
- Code logic changes for application behavior.
- Automatic creation of Google Apps Script projects (must be manual).
- Changing CI/CD pipeline structures beyond `deploy.js`.

## Done When
- [ ] `docs/deploy-setup.md` exists and documents the setup process.
- [ ] `SCRIPT_IDS['tenantB']` has the real script ID in `deploy.js`.
- [ ] Deployment from Coppel account to dev environment succeeds.
- [ ] Deployment from Coppel account to prod environment succeeds.
- [ ] Deployment to tenantB succeeds.
