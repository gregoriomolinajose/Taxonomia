# Problem Brief: E32 — Visual & Persistence Bug Bash

**Status:** DRAFT
**Created:** 2026-04-12
**Theme:** Fixes & Technical Debt

## Context
Tras los últimos entregables, la aplicación Taxonomia presenta fallos centrados en dos ejes principales que friccionan la experiencia de usuario:
1. Problemas de carga visual en caliente (posibles desincronizaciones de UI reactiva).
2. Errores de persistencia vinculados a reglas de negocio (validaciones o constraints que fallan al intentar insertar/modificar datos en la base).

Dado que venimos de estabilizar el `Schema Governance Studio` en E31, los "Bug Bashes" son esenciales para mantener la salud general de la plataforma antes de agregar más flujos de entidades.

## The Problem
La UI sufre de inconsistencias o freezes ("carga en caliente") y algunas entidades/reglas de negocio sufren de rechazo persistente o bugs al interactuar con el Engine_DB o el Adapter_Sheets.

## Success Criteria (How we measure it)
1. **Zero-Defect UX:** Las vistas de carga en caliente ya no se cuelgan ni pierden su estado.
2. **Data Consistency:** Todas las escrituras sujetas a reglas de negocio se persisten en base correctamente y sin validaciones opacas.
3. Test suite green tras parchar cada escenario anómalo.

## Constraints & Assumptions
- Scope limitado a corregir las implementaciones actuales, NO a refactorizar por completo los motores base subyacentes.
- Se debe preservar la retrocompatibilidad con las abstracciones hechas en E31 (`FIELD_TEMPLATES` y `TOPOLOGY_PRESETS`).
