# Backlog: Taxonomia Project

> **Status**: Draft

## Epics

| ID | Epic | Status | Scope | Priority |
|----|------|--------|-------|----------|
| E1 | Setup de Plataforma SAFe 6.0 e Integración Dual-Write | ✅ Complete  | Implementar backend en GAS y base UI en Ionic. | Alta     |
| E3 | Migración a Producción SGMP                           | 🚧 In Prog   | S3.2 / S1.1 / S1.2: [DONE]                            | Alta     |
| E8 | Graph Governance & Business Rules Engine              | ✅ Complete  | TDAG server backend & Business Rules interceptors     | Media    |
| E9 | Refactor UI MDM & ThemeManager                        | 🚧 In Prog   | Migrar estilos hardcoded, sanear LIFO Max Depth GC    | Alta     |
| E11| Declarative UI Refactoring                            | ✅ Complete  | Componentización SPA y Pipeline QA/Minify             | Alta     |

## Parking Lot / Deuda Técnica (Post-Epic 11)

| Item | Origen | Descripción | Severidad | Prioridad |
|------|--------|-------------|-----------|-----------|
| **FormEngine_UI Growth** | Arch Review (H7) | Vigilar el tamaño y complejidad cognitiva de `FormEngine_UI.html`. Aunque fue purgado, aún contiene generadores pesados (`renderForm`, `buildSearchableMulti`). Considerar dividir sus responsabilidades de factory (templating) en la próxima épica si excede los 2000 LOC. | Medium | Para evaluar en Epic 12 |
| **AST RegExp CSS Minifier** | Arch Review (H14) | Considerar integración oficial de _Rollup_ o _Esbuild_ al pipeline Node.js, evaluando abandonar la minificación Regex manual (en `deploy.js`) si la densidad de tokens/alias CSS crece exponencialmente. | Low | Diferido |
| **Optimistic Timers (GC)** | Quality Rev. | Reemplazar `setTimeout(() => topModal.remove(), 300);` en `UI_ModalManager.html` por subscripción nativa al evento de animación de desmonte (`ionModalDidDismiss`) para prevenir flashes/parpadeos en dispositivos lentos. | Medium | Prioritario E12 |
| **Profilers Magic Literals** | Quality Rev. | Estandarizar exigencia de Delta = 0 para el test de fuga de memoria E2E en `TEST_Suite_UI.html` (removiendo umbral tolerante `±5`). Documentar causas nativas si persisten nodos huérfanos de Ionic (e.g., Ion-Backdrops). | Low | Diferido |
| **API Fail-Fast Scoping** | Quality Rev. | Los bloques lógicos de la SPA (archivos `_UI`) se anexan sin *Error Boundaries* en `Index.html`. Un syntax error deriva inmediatamente en un *White Screen of Death*. Mitigable para cliente, pero un riesgo severo de desarrollo. | Low | Tracking |
