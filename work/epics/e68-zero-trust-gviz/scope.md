---
epic_id: E68
epic_name: zero-trust-gviz
title: "Implementación de Zero-Trust y Optimización de Memoria GViz en ABAC"
status: done
---

# Epic Scope: E68

## Objective
Convertir el motor ABAC de un modelo Fail-Open de degradación a un paradigma Zero-Trust (estricto) y migrar la arquitectura de consultas BFS locales hacia un modelo delegado SQL a través de Google Visualization API.

## Boundaries

### In Scope
- Refactorización de `Engine_ABAC.js` (`validatePermission` y `resolveTopologyFor`).
- Integración de GViz en `Adapter_Sheets.js`.
- Wrapper abstracto `listBy` en `Engine_DB.js`.
- Migración automatizada (Seeder) para evitar lockouts de administrador.

### Out of Scope
- Interfaz gráfica (UI) para la gestión de las nuevas reglas restrictivas.
- Uso de bases de datos externas (se mantiene la dependencia arquitectónica en Google Sheets).

## Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|------|--------|--------|----------|-------|
| S68.1 — Refactor ABAC & GViz API | L | Done | L | Normal | Implementado directamente en la base. |
| S68.2 — Optimizaciones FTS y DRY (Día 2) | M | Done | M | Rápida | Reemplazo de FTS en Identidad y Permisos, DRY en BFS, fixes menores en Seeder y clonación JSON. |

## Done Criteria
- Todos los commits de refactorización unidos a la rama `story/s67.2/bootstrap-selectivo`.
- Se validó la conectividad a GViz (HTTP 200 y JSON parser funcional) mediante PoC.
- Se implementó exitosamente el control estricto Zero-Trust en la resolución de permisos.
