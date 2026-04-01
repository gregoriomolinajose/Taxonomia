---
epic: E14
title: "The Modularization Epoch"
status: "in-progress"
start_date: "2026-03-31"
---

# Epic E14: The Modularization Epoch - Scope

## Objective
Desacoplar definitivamente el Monolito Estático de la SPA (Single Page Application) en una arquitectura pura de **Micro-Componentes y Archivos Nativos**. Convertiremos las Funciones Gigantes en Clases JS con Inyección de Dependencias, aislando Assets (CSS nativo) y formalizando Promesas Asíncronas (ES6) para preparar la aplicación hacia el nivel Enterprise (Micro-Frontends).

## In Scope
- Fraccionamiento del Patrón *God Object* de `FormRenderer_UI` en Clases Modulares (`UI_FormState`, `UI_FormSubmitter`).
- Extracción de estilos en línea y el megabloque `CSS_App.html` hacia verdaderos archivos nativos `.css`.
- Inversión de Dependencias (Event PubSub o config injection) para destruir Liderazgos Circulares (Ej. `UI_SubgridBuilder` atado globalmente a `window.renderForm`).
- Emancipación del Ecosistema de Assets gestionado inteligentemente por `deploy.js`.
- Evolución de Strings ES5 (`'<div id="'+x+'">'`) a Template Literals V8 (`<div id="${x}">`).

## Out of Scope
- Migración a Frameworks Compilados (React/Vue/Angular). Seguimos en Vanilla JS.
- Refactorización del Backend (Google Apps Script / Engine_DB).
- Cambios drásticos a la UI Visual. Esta es una refactorización de Pureza de Código (Code Purity).

## Planned Stories
- **[x] S14.1:** FormEngine Splitting. Partir `FormRenderer_UI` con Patrón Factoría Modular. ✓
- **[ ] S14.2:** Native CSS Bundler. Trasladar `CSS_App.html` a `assets/css` y enlazar en `deploy.js`.
- **[ ] S14.3:** PubSub Topológico. Invertir las dependencias del `SubgridBuilder` y `FormBuilder`.
- **[ ] S14.4:** ES6 Syntactic Purity. Template Literals for DataGrid & Promesas para Ionic Modals.

## Done Criteria
- [ ] `FormRenderer_UI.html` destruido o refactorizado en Clases de menos de 400 líneas.
- [ ] VS Code ya no emite Errores Rojos por mezclar sintaxis HTML con código CSS/JS.
- [ ] Cero dependencias circulares detectables de módulos UI apuntando a `window.*`.
- [ ] `deploy.js` une y compila archivos puros `.css`.

## Implementation Plan (Roadmap)

### Story Sequence Tracking

| ID | Story Name | Status | Size | Deps | Rationale |
|----|------------|--------|------|------|-----------|
| S14.1 | FormEngine Splitting | Done | L | None | El escollo principal. Destruir el monolito es el primer paso vital para garantizar el manejo ES6. |
| S14.2 | Native CSS Bundler | Pending | M | None | Se puede ejecutar en paralelo. Ayudará drásticamente a la "Developer Experience" (DX) aislada. |
| S14.3 | PubSub Topológico | Pending | M | S14.1 | Requiere que el FormEngine base ya sea modular para inyectarle Eventos. |
| S14.4 | ES6 Syntactic Purity | Pending | S | S14.1 | Purgar los sobrantes de ES5 en `UI_DataGrid` y Promesas asíncronas para el manejo Final y Pulcro. |
