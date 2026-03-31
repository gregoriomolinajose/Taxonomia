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
- **[ ] S13.1:** Subgrid Extractor. Extraer lógica atómica relacional (UI anidada) a `UI_SubgridBuilder`.
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
