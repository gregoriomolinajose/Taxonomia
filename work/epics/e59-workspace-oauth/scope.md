# Epic E59: Federated Workspace OAuth & Domain Cleanup — Scope

> **Status:** IN PROGRESS
> **Release:** REL-2026.Q2
> **Created:** 2026-05-22

## Objective
Sanear la arquitectura de validación de dominios y proveer a cada dominio configurado un flujo de OAuth 2.0 seguro (vía Google Identity) para permitir consultas inter-workspace transparentes.

**Value:** Estabilidad en el login y cero exposición de tokens duros; los usuarios interactúan solo con la pantalla de consentimiento de Google.

## Stories (Pendiente de SP)
| ID | Story | Size | Status | Description |
|----|-------|:----:|:------:|-------------|
| S59.0 | Limpieza y Fix Dominios | S | Pending | Purgar duplicados y arreglar .trim() en auth. |
| S59.1 | Schema: OAUTH_DELEGATION | S | Pending | Preparar modelo Config_Workspace para el switch y token. |
| S59.2 | UI: Consent OAuth | M | Pending | Botón e inicialización de Google Identity Services. |
| S59.3 | RPC: Token Exchange | M | Pending | Intercambio del code por Refresh Token en el backend. |
| S59.4 | Core: Multi-Domain Fetch | M | Pending | IdentityResolver hidrata usando el token delegado si existe. |

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
