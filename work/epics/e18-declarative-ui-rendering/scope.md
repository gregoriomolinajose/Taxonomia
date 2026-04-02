# Epic Scope: E18 - Declarative UI Rendering

**Objective:**
Reemplazar los patrones imperativos de renderizado V3 (Inyección destructiva `innerHTML = ''`, estilización hardcodeada `.style.display='none'`, e invocaciones directas al Orquestador) con el framework 100% Declarativo V4: `<template>` Cloning nativo, clases WebComponents (`ion-hide`), y el Bus Reactivo `window.AppEventBus`.

## In Scope
- Erradicación de `onclick="window.DataViewEngine.render()"` a favor de `AppEventBus.publish('NAV::CHANGE')` en Dashboard y DataView.
- Reemplazo absoluto de asignaciones `.style.display` a lo largo del codebase a favor de listados `.classList.toggle('ion-hide')`.
- Migración gradual de Builders de Strings HTML Crudos (`UI_SubgridBuilder.html`, `FormRenderer_UI.html`) hacia Cloned DocumentFragments encapsulando las plantillas de `Index.html` dentro de constructos `<template id="...">`.

## Out of Scope
- Migrar el Engine Backend a TypeScript.
- Re-arreglos Topológicos (Todo el Engine DOM/Math_Engine queda libre; nos enfocaremos únicamente en UI).
- Crear un CSS Bundler de NodeJS local (La minificación de CSSRegExp de `deploy.js` es suficiente por esta Épica).

## Planned Stories
1. **[ ] S18.1: AppEventBus Total Adoption (S)**
2. **[ ] S18.2: CSS Declarative Visibility (M)**
3. **[ ] S18.3: Template Isolation (Views) (L)**
4. **[ ] S18.4: FormRenderer Factory Extraction (L)**

## Done Criteria
1. Búsquedas via `grep 'innerHTML ='` del código visual deben rendir cercanos a cero hallazgos directos procedimentales.
2. Búsquedas locales de `style.display` no deben retornar incidencias.
3. El frontend compila (Node deploy), sin disrupción visual ni pérdida del ciclo de vida de Web Components Ionic.
