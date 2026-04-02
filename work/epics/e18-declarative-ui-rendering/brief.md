# Epic E18: Declarative UI Rendering

## Hypothesis
Si convertimos la construcción procedimental de componentes pesados (e.g., `document.createElement` múltiple) hacia un modelo puramente declarativo basado en etiquetas `<template>`, conseguiremos eliminar los efectos de FOUC (parpadeo visual), sellaremos al 100% cualquier riesgo de XSS y eliminaremos de raíz las fugas de memoria (Memory Leaks) en la manipulación intensiva que sufre nuestro SPA. 

## Success Metrics
- 0 FOUC en transiciones y aperturas de vistas (formularios y grillas).
- Delta = 0 para instancias huérfanas en perfiles de uso contínuo de Chrome DevTools (Test de memoria end-to-end).
- 0 `innerHTML` en flujos dinámicos; migración absoluta hacia `window.DOM.create` e `importNode`.

## Appetite
1 semana (Sprint Enfocado).

## Rabbit Holes
- **Topología de Formularios:** Abstraer inputs multifase como Master-Detail o Dynamic Lists a `<template>` requiere re-anclar correctamente los event listeners (PubSub).
- **Inyección de Index.html:** Los templates deben residir obligatoriamente en `Index.html` bajo etiquetas ocultas nativas en lugar de ser construidos on-the-fly en JavaScript puro.
