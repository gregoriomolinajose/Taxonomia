# Epic E32: Bug Bash — Visibilidad y Persistencia de Reglas — Scope

> **Status:** PLANNED
> **Release:** REL-TBD
> **Created:** 2026-04-12
> **Brief:** `work/epics/e32-visual-persistence-bug-bash/brief.md`

## Objective

Identificar, diagnosticar y resolver los problemas reportados referentes a la reactividad de la vista ("problemas visuales de carga en caliente") y las fallas de persistencia backend atadas a las reglas de negocio recientes de la arquitectura.

## Stories

| ID | Story | Size | Status | Description |
|----|-------|:----:|:------:|-------------|
| S32.1 | [Por definir tras el Diseño del Epic] | - | Pending | Discovery y triage detallado |

**Total:** TBD stories, TBD SP

## Scope

**In scope (MUST):**
- Fix a fallos en la reactividad visual / rehidratación del DOM.
- Fix a rechazos y excepciones originadas por el Engine de Reglas al persistir.
- Mantener cobertura de tests estable y pasar las validaciones unitarias en los adaptadores Sheet/DB.

**Out of scope:**
- Nuevas features.
- Refactorización total de módulos core fuera del perímetro exclusivo de los bugs.

## Done Criteria

**Per story:**
- [ ] Root cause analysis completado por bug (`/rai-debug` workflow)
- [ ] Sin regresiones introducidas en Vitest/Playwright

**Epic complete:**
- [ ] Todos los bugs priorizados están resueltos y mergueados en `develop`
- [ ] UI no presenta inconsistencias ni bloqueos reportados
- [ ] Datos persistidos cumplen invariantes estables
- [ ] Retrospectiva completada

## Progress Tracking

*(To be populated after `/rai-epic-design`)*
