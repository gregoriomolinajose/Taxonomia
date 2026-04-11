# Epic E30: Tech Debt & Bugs — Retrospective

## 📋 Epic Overview
- **Status:** Cerrada Oficialmente
- **Duración:** Abril 2026
- **Área:** PWA Frontend & Universal Routing Backend
- **Total de Historias Ejecutadas:** 12 / 12 (100% Completitud)

## 🎯 Objetivos Logrados (Impacto de Negocio)
La Épica E30 se inauguró bajo la extrema necesidad de subsanar los "puntos ciegos" técnicos acumulados durante los sprints de entrega de las funciones de Epicas 20-29. Al terminar exitosamente esta campaña, se logró un hito cualitativo inmenso para el núcleo de software:

1. **Test Coverage Estamental:** Migramos todas las pruebas heredadas JSDOM de la época monolítica hacia integraciones asincrónicas nativas `Vitest (Chromium)`, inyectando FormEngine y UI testing robusto. Las aserciones ahora utilizan tiempos simulados (FakeTimers), comprobando visualmente los bloques en vez de hacer "Monkey Patching".
2. **Deforestación DOM Scraping (Acoplamientos Rotos):** Se eliminó por completo la asimetría de extracción y mutación de estado global (`_LocalState`). Los Subgrids, DynamicLists y elementos complejos han adoptado el patrón nodal (Duck-Typing API `.getValidatedValue()`), dejando al Gestor Principal libre de cadenas y permitiendo la escalabilidad infinita de nuevos inputs visuales sin alterar Lógica de Enrutamiento.
3. **Optimizaciones de Latencia Mágica:** Se instaló con éxito un escudo (Timebox de 20s y blindajes _Finally_) para proteger la experiencia de usuario contra las inmortales congestiones de red y el Bug _Zombie Overlays_ de Google AppsScript, restableciendo el control amigable en escenarios de desastre.
4. **Gobierno Unificado de PK (E29):** Taxonomia finalizó su mutación hacia bases de Datos dirigidas estrictamente por Schema. La ambigüedad del `idField` ya no existe en el Front ni en el Back.

## 📊 Métricas de Esfuerzo
- Historias Previstas: 10
- Adiciones Críticas (Pivote): +2 Historias (S30.11 Nodal, S30.12 Latency)
- Incidencias Residuales o Rollbacks: Ninguno (Validaciones de AST y Compilación limpias a `dev`).

## 🔮 Learnings & Next Steps
- El acierto de instaurar _Promise.race_ en flujos nativos sin depender de bibliotecas Reactivas pesadas marcó una doctrina de Minimalismo.
- Vitest comprobó ser extremadamente filoso detectando el momento que purgamos el Singleton `_LocalState`. Integrar TDD (Test Driven Development) como puerta de entrada ha probado evitar catástrofes silentes.
- **Tácticas Futuras:** Mantener el uso de interfaces de Extracción Nodal para la creación de *Nuevas Épicas de Features* (p.e., si entra un Dashboard nuevo o UI_Grid, deben comportarse como cápsulas declarativas encapsuladas).
