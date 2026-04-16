---
epic: E38
title: Retrospective Hub de Ingesta Inteligente
date: 2026-04-16
---

# Retrospective E38 - Hub de Ingesta Inteligente

## ¿Qué salió bien? (What went well?)
- **Integración Nativa a Sheets:** Se transicionó con éxito de las rígidas exportaciones/importaciones de CSV y validaciones engorrosas a un pipe de datos transaccional vivo contra Google Sheets manipulando el objeto Range usando APIs universales.
- **Robustez contra Duplicados Giga y Crash:** Implementamos Hooks directamente en el subyacente `Engine_DB` y prefetch en `Adapter_Sheets` que salta elásticos de duplicados usando primaryKeys semánticas (email, número). Un hit fuerte fue poder soportar 800+ registros subiéndolos mediante un ciclo for-chunker.
- **Mobile First Real:** Empleamos Web Components de Ionic parametrizando dinámicamente las mallas responsivas, convirtiendo la importación que un obrero antes debía hacer forzadamente desde un monitor a un mecanismo listo para App/Touch.

## ¿Qué salió mal o se puede mejorar? (What needs improvement?)
- **Acoplamientos de UI en DataView:** Durante Múltiples iteraciones de front (S38.7 y S38.8) nos encontramos lidiando contra `_state` inyectado artificialmente. Terminamos en la retrospectiva aislando los cachés y la responsabilidad.
- **Race conditions de Async UI:** Confiar ciegamente en `setTimeout` y promesas bloqueables en Frameworks pesados como Ionic genera estragos. Aprendimos y transitamos al ciclo de render `requestAnimationFrame` que blindó la re-hidratación de Modal de Sheets de forma determinística en todos los dispositivos.

## Siguientes Pasos (Next Action Items)
- Extraer el File Selector a PWA puro y delegar el `window.open` manual a una verdadera inyección de Capacitor (Planificado para E39).
- Expandir el motor de Ingesta a admitir Ingesta de Grafos Múltiples y Relacionados en lugar de Listas Planas puras.
