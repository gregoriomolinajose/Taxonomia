# Retrospective: Epic E42 (Performance Optimization & Save Latency Reduction)

## Epic Summary
**Goal:** Reducir la latencia de guardado mediante reconciliación optimista In-Memory y modernizar la arquitectura de pruebas a un modelo E2E (Zero-Latency Rendering).
**Status:** Completed
**Scope:** `work/epics/e42-performance-optimization/scope.md`

## 📊 Metrics & Facts

| Metric | Target | Actual | Delta |
|--------|--------|--------|-------|
| Perceived Save Latency | 0.0s | 0.0s | Cumplido |
| Technical Debt (JSDOM) | 0 | 0 | -8 Mocks innecesarios |
| QA Coverage Focus | E2E + V8 | E2E + V8 | Estabilizado |
| Code Cohesion | SRP | SRP | FormSubmitter decouplado |

## 🌟 What Went Well
- **Defensive Engineering:** La inyección de guardias nulas (`window.DataStore.reconcileOptimisticPatch`) antes de invocar la caché garantizó retro-compatibilidad.
- **Fail-Fast (QA):** En lugar de seguir intentando arreglar pruebas artificiales con JSDOM, destruir la deuda técnica antigua en favor del `stylelint` nativo y specs asíncronos de `Playwright` eliminó horas futuras de dolores de cabeza estructurales.
- **Zero-Latency Orchestration:** `JS_Core` acopló inteligentemente las escrituras de RAM mediante `AppEventBus`, desacoplando completamente la renderización gráfica del tráfico HTTP de Google Apps Script.

## 🚧 What Could Be Improved
- **Autenticación en CI/CD:** La transición hacia Playwright evidenció que el Entorno Nativo está sellado por Google Auth. Aunque se solucionó interceptando cookies viejas (`.auth/user.json`), el pipeline de DevOps necesitaría automatizar la regeneración de la sesión para evitar congelamiento futuro.
- **Pureza CSS:** Aunque activamos el escudo Stylelint y funciona al 100%, descubrimos temporalmente 62 deudas de hardcoding de colores en los HTMLs. Hará falta programar un ticket aislado para transmutar todo a tokens de `CSS_DesignSystem.html`.

## 📈 Learnings & Patterns
- **Pattern Validated:** *Protocolo Data Node (SCD-2)*. El duck-typing de componentes nativos HTML bajo proxies como `getValidatedValue()` en `UI_FormSubmitter` eliminó el infierno de `document.getElementById` anidados.
- **Process Improvement:** La ejecución escalonada con validación `stylelint` demostró que podemos forzar patrones de Diseño CSS desde la consola en milisegundos, erradicando un porcentaje masivo de Inconsistencias Visuales sin tocar un pixel real.
- **Anti-Pattern Eradicated:** *Coupled UI Logic (H14)*. Removimos parches Optimistas del DOM (UI Layer). El Estado pertenece a JS_Core, el dibujo pertenece a DataView, y la sincronización web pertenece a UI_FormSubmitter.

## 🎯 Action Items (Next Epic/Sprints)
1. Construir un script DevOps en node (`npm run auth:refresh`) que mantenga vivo `.auth/user.json` conectándose silentemente a Google usando credenciales Oauth limpias o App-Pass.
2. Refactorizar los 62 hardcodes interceptados en `CSS_DataView.html` e inyectarle las Semánticas CSS dictadas en el `.stylelintrc.json`.
