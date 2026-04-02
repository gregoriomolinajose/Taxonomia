# Problem Brief: Epic 18 - Declarative UI Rendering

**Context:** El SPA actual utiliza patrones heredados de "concatenación destructiva" (`innerHTML = '<div>' + dynamic + '</div>'`) para generar las vistas masivas (DataGrid, FormRenderer, Dashboard). Esto genera fragmentación de memoria en V8 (desperdicio de garbage collector), pérdida temporal de estilos (FOUC) y acoplamiento estructural.

**Objective:** Implementar Rendering Declarativo utilizando DocumentFragments, `<template>`, clones nativos y el Patrón Pub/Sub (EventBus), logrando que la manipulación del DOM sea atómica, no-destructiva y segura.

**Appetite:** ~4 historias (S18.1 a S18.4) enfocadas exclusivamente en la UI y el Ruteo. No alterar base de datos.

**Success Metrics:**
1. Cero (0) ocurrencias procedimentales de `.innerHTML =` directos en DataGrid y Subgrids.
2. Cero ocurrencias referenciales del enrutador estático (Ej. `.navigateTo()`) forzando en su lugar el uso de `window.AppEventBus`.
3. Cero estilos inyectados duros (`.style.display = 'none'`) en beneficio de clases de CSS/Ionic nativas (`ion-hide`).

**Rabbit Holes (A evitar):**
- Reescribir todo Ionic Framework en WebComponents nativos.
- Intentar usar pre-compiladores JSX o VirtualDOM de React.
- Extraer motores que no correspondan a Frontend puro.
