# Epic Retrospective: E59 Federated Workspace OAuth & Domain Cleanup

## Overview
- **Objective:** Sanear la arquitectura de validación de dominios y habilitar flujos de OAuth 2.0 seguros (Google Identity) para consultas inter-workspace transparentes entre tenants.
- **Status:** Complete
- **Release:** REL-2026.Q2
- **Closed:** 2026-05-27
- **Branch:** develop

## Deliverables
- **S59.0 — Limpieza y Fix Dominios:** Centralización de dominios permitidos (`@coppel.com`, `@bancoppel.com`) desde `APP_CONFIG__allowed_domains`. Eliminación de todo hardcode de dominios en `src/`. Tenant B accede correctamente sin fallos de login SSO.
- **S59.1 — Schema: OAUTH_DELEGATION:** Modelo de datos para tokens OAuth delegados. Schema `OAUTH_DELEGATION` disponible como entidad topológica en el grafo.
- **S59.2 — UI: Consent OAuth (Backend-Driven):** Botón de consentimiento OAuth en el frontend. Llamada al backend para obtener la Auth URL de Google Identity. Flujo de pop-up implementado.
- **S59.4 — Core: Multi-Domain Fetch:** Resolución de tokens guardados en PropertiesService para queries inter-workspace. Workspace Sync funcional sin exposición de tokens duros.

## Historias Adicionales Completadas Durante el Epic
Stories ejecutadas bajo el mismo contexto de dominio:
- **S61:** Adapter_Config — Persistencia completa en PropertiesService (`APP_CONFIG__*`)
- **S62:** Ajustes Globales migrado a Config_System UI (panel de administración)
- **S63:** Pipeline Tenant B + white-label cleanup (deploy script multi-tenant)
- **S64:** Audit & eliminación de todos los dominios hardcodeados en `src/`
- **S65:** First-Run Wizard — detección Backend-First + UI premium
- **S66:** Sys_Cache_Signals — Invalidación Proactiva Cross-Tenant (Pub-Sub)
- **S67:** Multi-Account Clasp Auth — deploy.js con credenciales por entorno

## Métricas
- **Total Stories:** 11 (S59.0-S59.4 + S61-S67)
- **Archivos modificados:** 87 → 86 archivos en bundle (eliminación `Jobs_Migracion_Roles.js`)
- **Líneas de código legacy eliminadas:** ~70 líneas de `APP_BRANDING_CONFIG` + 1 archivo one-time migration
- **Entornos gestionados:** 4 (Dev, Staging, Prod/Tenant A, Tenant B)
- **Credenciales de deploy:** Migradas a arquitectura multi-cuenta (`.clasp-coppel.json`, `.clasp-bancoppel.json`)
- **Deuda técnica pagada:** Variables de entorno legacy (`APP_BRANDING_CONFIG`, `Jobs_Migracion_Roles.js`) eliminadas del codebase

## Riesgos Resueltos
- **Login Tenant B bloqueado:** Resuelto vía `APP_CONFIG__allowed_domains` dinámico desde PropertiesService
- **Tokens duros expuestos en código fuente:** Eliminados — todo fluye por Google Identity OAuth
- **Favicon no parametrizable:** Resuelto — gestionado desde panel admin para todos los tenants
- **Permisos admin sin seeder:** Resuelto — `UTIL_GrantSuperAdmin` con creación de persona si no existe
- **Cache stale post-seeder:** Resuelto — `clearProjectCache()` integrado en el seeder

## Aprendizajes de Proceso
- **`setFaviconUrl()` en GAS opera en el wrapper externo, no en el iframe:** El intento de inyectar `<link rel="icon">` en `Index.html` fue inefectivo porque la página corre en sandbox iframe. La solución correcta siempre fue `setFaviconUrl()` con try/catch.
- **PropertiesService como fuente de verdad por tenant:** El esquema `APP_CONFIG__*` demostró ser robusto — cada GAS project tiene sus propias Script Properties, permitiendo configuración independiente por tenant sin compartir código.
- **Deploy multi-cuenta requiere swap de credenciales, no `--creds`:** La arquitectura final intercambia `.clasprc.json` temporalmente por entorno, evitando la limitación de `clasp 3.x` con `--creds`.
- **Los seeders deben crear la entidad si no existe:** El seeder `UTIL_GrantSuperAdmin` falló en primera iteración porque asumía existencia previa del usuario en `DB_Persona`. La lógica upsert es mandatoria.
- **El nombre exacto de las hojas importa:** `Persona` vs `DB_Persona` — los adaptadores deben validar contra el nombre real de la hoja en Google Sheets.

## Acciones para Siguientes Epics
1. **Estandarizar seeder pattern:** Todo seeder de datos críticos debe implementar upsert (create-or-update) como comportamiento default.
2. **Documentar la arquitectura de `window.ENV_CONFIG`:** Es el puente entre PropertiesService (server) y el cliente JS — documentar en la arquitectura para evitar eliminaciones accidentales en cleanups futuros.
3. **Favicon-by-tenant como feature visible:** Agregar documentación en Schema Studio sobre los formatos aceptados (`.ico`, `.png`) y la limitación del sandbox GAS.
4. **Test de regresión multi-tenant:** Crear checklist de validación post-deploy para los 4 entornos, cubriendo favicon, login SSO, permisos admin, y branding.
