# Scope E18: Declarative UI Rendering

## Objective
Instituir un modelo de renderizado UI absolutamente declarativo, apoyado de `<template>` HTML puro para prevenir Memory Leaks y XSS.

## In Scope
- Refactorizar `JS_Core.html`, `UI_Router`, `Auth_UI` y unificar los factories vía `<template>`.
- Fragmentar y trasladar los sub-componentes masivos de `FormBuilder_Inputs` y `DataView_UI` a vistas plantilla inyectadas nativamente en `Index.html`.
- Migración plena de todos los ciclos de vista hacia el uso estricto del patrón `window.DOM`.

## Out of Scope
- Migración de dependencias hacia WebComponents externos.
- Operaciones del motor Backend `Engine_DB.gs`.

## Planned Stories
- **S18.1**: Decoupling Core y Framework Declarativo Básico (`JS_Core`, `ThemeEngine`).
- **S18.2**: Refactorización Nodal de Router y DataView.
- **S18.3**: Aislamiento y Migración a Templates del `FormBuilder_Inputs` y Componentes Avanzados.

## Definition of Done
- Los templates `tmpl-*` están declarados apropiadamente en `Index.html`.
- Todo el SPA utiliza `window.DOM.create`.
- Verificación exitosa en herramientas de Profiler del navegador (0 nodos DOM huérfanos desangrados tras transiciones masivas).
