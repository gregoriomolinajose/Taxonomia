---
epic: E13
title: "The Cleaning Sprint (Arch & Tech Debt)"
status: "in-progress"
start_date: "2026-03-31"
---

# Epic E13: The Cleaning Sprint - Scope

## Objective
Desacoplar la lógica polinómica de relaciones del inyector maestro `FormRenderer_UI` hacia un `UI_SubgridBuilder` independiente, purgar variables "duros" residuales (Mudas Semánticos) hacia meta-declaraciones en `APP_SCHEMAS`, y adoptar un Minificador AST oficial para reemplazar las Regex críticas de despliegue.

## In Scope
- [ ] Creación de factoría pura `UI_SubgridBuilder.html` (Amputación línea 700+ de `FormRenderer_UI.html`).
- [ ] Purga de dependencias OCP/Hardcoded (Variables `cant_*`, `total_integrantes`).
- [ ] Incorporación EsBuild/Rollup para minificación CSS segura en `deploy.js`.
- [ ] Eliminación de Punteros pasivos obsoletos (`window.navigateTo`) ligados al Router.

## Out of Scope
- Migración a React/Vue.js
- Rediseño de componentes atómicos.
- Re-factorización de Engine Backend (Exposición RPC).

## Planned Stories
- **[x] S13.1:** Subgrid Extractor. Extraer lógica atómica relacional (UI anidada) a `UI_SubgridBuilder`.
- **[ ] S13.2:** Schema Declarative Push. Transicionar validadores in-line (`Test Truthiness`, Badge Status) a los Esquemas Globales.
- **[ ] S13.3:** Legacy Alias Purging. Purgado del `Router` y sus listeners fantasmas viejos.
- **[ ] S13.4:** CSS AST Minifier. Empaquetamiento CSS usando herramientas maduras Node en entorno CI local.

## Done Criteria
- [ ] `FormRenderer_UI` baja a < 800 líneas.
- [ ] Build genera versiones DEV/PROD impecables de los CSS enmascarados desde Sass/Tailwind/Plain.
- [ ] Cero rastros de Lógica Negocio quemada (ej: `cant_`) dentro del JS de frontend.

## Risks & Mitigations
1. **Riesgo:** Perder el binding Reactivo al desacoplar el SubGrid del Input parent original (Impacto: Alto).
   * *Mitigación:* Continuar usando el Patrón `LocalEventBus` inyectado por Dependencia desde el FormRenderer hacia el SubgridBuilder.
2. **Riesgo:** Rupturas Regex por Migración AST Minify.
   * *Mitigación:* Sandbox de CI con Tests E2E de Renderizado del DOM Central.

## Implementation Plan (Roadmap)

### Milestones
* **M1: UI Subgrid Factorizado** (S13.1) - Aislamiento atómico de las relaciones polimórficas (Walking Skeleton).
* **M2: Reglas Nativas & QA Cleanup** (S13.2, S13.3) - Eliminación de Lógica en Frontend y punteros muertos.
* **M3: AST Pipeline Activo** (S13.4) - Empaquetamiento CSS automatizado de Node (Feature Complete).

### Parallel Opportunities
- La S13.4 (AST Minifier) puede trabajarse de forma concurrente con S13.1, ya que afecta al pipeline de construcción (`deploy.js`, `package.json`), sin tocar el DOM Core del Frontend.

### Story Sequence Tracking

| ID | Story Name | Status | Size | Deps | Rationale |
|----|------------|--------|------|------|-----------|
| S13.1 | Subgrid Extractor | Complete | L | None | **Dependency-driven:** El monstruo de FormEngine debe desintegrarse primero para asegurar la viabilidad topológica. |
| S13.2 | Schema Declarative Push | Pending | M | S13.1 | **Quick-wins:** Eliminar quemado de strings (`cant_`) reduce Bugs potenciales antes de seguir sumando features escalables. |
| S13.3 | Legacy Alias Purging | Pending | S | S13.1 | Cerrar el E12 routing definitivamente purgando el antiguo Router inactivo. |
| S13.4 | CSS AST Minifier | Pending | M | None | Se puede ejecutar en paralelo; sanea el pipeline Node para alivianar los pases a PROD de CSS gigantescos. |
