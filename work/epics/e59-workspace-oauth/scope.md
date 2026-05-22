# Epic E59: Federated Workspace OAuth & Domain Cleanup — Scope

> **Status:** IN PROGRESS
> **Release:** REL-2026.Q2
> **Created:** 2026-05-22

## Objective
Sanear la arquitectura de validación de dominios y proveer a cada dominio configurado un flujo de OAuth 2.0 seguro (vía Google Identity) para permitir consultas inter-workspace transparentes.

**Value:** Estabilidad en el login y cero exposición de tokens duros; los usuarios interactúan solo con la pantalla de consentimiento de Google.

## Scope
**In scope (MUST):**
- Fix inmediato para @bancoppel.com
- Centralizar domains en Config_Workspace
- Integración `google.accounts.oauth2.initCodeClient`

## Done Criteria
**Epic complete:**
- [ ] Todas las historias completadas.
- [ ] `@bancoppel.com` loguea sin fallos.
- [ ] Tokens generados por pop-up y guardados en DB.
- [ ] Epic retrospective done.
- [ ] Merged to `develop`.

## Progress Tracking

### Milestones
- [ ] **M1: Auth Cleanup & Fix (Walking Skeleton)** - Bugfix for bancoppel login and centralized domains logic.
- [ ] **M2: OAuth Integration (Core MVP)** - Data model and frontend OAuth connect button.
- [ ] **M3: Backend Resolution** - Token exchange and Directory Hydration.

### Plan
| Story | Sequence Rationale | Status | Size | Actual | Velocity |
|-------|--------------------|--------|:----:|:------:|:--------:|
| S59.0 — Limpieza y Fix Dominios | Dependency-driven / Quick win: Unblocks Bancoppel login | Pending | S | - | - |
| S59.1 — Schema: OAUTH_DELEGATION | Foundational: Database schema required for tokens | Pending | S | - | - |
| S59.2 — UI: Consent OAuth | Walking Skeleton: Need UI to get Google code first | Pending | M | - | - |
| S59.3 — RPC: Token Exchange | Dependency: Requires code from S59.2 | Pending | M | - | - |
| S59.4 — Core: Multi-Domain Fetch | Core Value: Uses the token stored in S59.3 | Pending | M | - | - |
