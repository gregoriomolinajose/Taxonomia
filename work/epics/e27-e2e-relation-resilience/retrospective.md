# Epic Retrospective: E27 E2E Relation Resilience (Real Auth E2E)

## Outcomes vs Objectives
**Objective:** Sanitizar la Capa Asíncrona del Frontend y validar el estado persistente del modelo de grafos utilizando end-to-end purista en el entorno dev saltando validación IAM/G-Suite.

**Results:**
- Implementación impecable del Semáforo / Algoritmo Optimista `isOptimisticLock` para proteger mutaciones pesadas sobre grafos sin estropear las colas asíncronas de GAS (`google.script.run`).
- Despliegue de suite externa local (Playwright Chromium) inyectando estado de `auth.json`.
- Corrección de bugs vitales en Shadow DOM (bypassing the Angular/Ionic click-capture layer de `ion-button` usando `evaluate click()`) y validación de las 8 reglas axiomáticas de Círculos O(1) de Jest en entorno full stack.

## Systemic Learnings
1. **Google Apps Script Limitations:** El DOM inyectado como IFRAME por GAS sufre paros (throttling) bajo stress automation rápido, haciendo frágil la suite E2E.
2. **Robustez Transaccional:** La decisión de usar Cache Local + Sync diferida paga sus dividendos operacionales en la UX.
3. El frontend y los Web Components no deben basarse en validación purista de clases `.ion-hide` via automation, prefiere evaluación nativa.

## Follow-up Items
- Cambiar la táctica de E2E a nivel API (Direct POST/GET con token Bearer extraído) en futuras iteraciones para saltar completamente la latencia del repintado en DOM de G-Suite para pruebas exclusivas al Back-end a través de capa UI.
