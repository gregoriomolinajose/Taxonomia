# Backlog: Taxonomia Project

> **Status**: Draft

## Epics

| ID | Epic | Status | Scope | Priority |
|----|------|--------|-------|----------|
| E1 | Setup de Plataforma SAFe 6.0 e Integración Dual-Write | ✅ Complete  | Implementar backend en GAS y base UI en Ionic. | Alta     |
| E3 | Migración a Producción SGMP                           | 🚧 In Prog   | S3.2 / S1.1 / S1.2: [DONE]                            | Alta     |
| E8 | Graph Governance & Business Rules Engine              | ✅ Complete  | TDAG server backend & Business Rules interceptors     | Media    |
| E9 | Refactor UI MDM & ThemeManager                        | ✅ Complete   | Migrar estilos hardcoded, sanear LIFO Max Depth GC    | Alta     |
| E11| Declarative UI Refactoring                            | ✅ Complete  | Componentización SPA y Pipeline QA/Minify             | Alta     |
| E12| UI Modularization & Core Scaling                      | 🚧 In Prog   | Deconstrucción FormEngine, Routing, y Tooling CSS     | Muy Alta |

## Parking Lot / Deuda Técnica (Post-Epic 11)

| Item | Origen | Descripción | Severidad | Prioridad |
|------|--------|-------------|-----------|-----------|
| **FormEngine_UI Growth** | Arch Review (H7) | Vigilar el tamaño y complejidad cognitiva de `FormEngine_UI.html`. Aunque fue purgado, aún contiene generadores pesados (`renderForm`, `buildSearchableMulti`). Considerar dividir sus responsabilidades de factory (templating) en la próxima épica si excede los 2000 LOC. | Medium | Para evaluar en Epic 12 |
| **AST RegExp CSS Minifier** | Arch Review (H14) | Considerar integración oficial de _Rollup_ o _Esbuild_ al pipeline Node.js, evaluando abandonar la minificación Regex manual (en `deploy.js`) si la densidad de tokens/alias CSS crece exponencialmente. | Low | Diferido |
| **Optimistic Timers (GC)** | Quality Rev. | Reemplazar `setTimeout(() => topModal.remove(), 300);` en `UI_ModalManager.html` por subscripción nativa al evento de animación de desmonte (`ionModalDidDismiss`) para prevenir flashes/parpadeos en dispositivos lentos. | Medium | Prioritario E12 |
| **Profilers Magic Literals** | Quality Rev. | Estandarizar exigencia de Delta = 0 para el test de fuga de memoria E2E en `TEST_Suite_UI.html` (removiendo umbral tolerante `±5`). Documentar causas nativas si persisten nodos huérfanos de Ionic (e.g., Ion-Backdrops). | Low | Diferido |
| **API Fail-Fast Scoping** | Quality Rev. | Los bloques lógicos de la SPA (archivos `_UI`) se anexan sin *Error Boundaries* en `Index.html`. Un syntax error deriva inmediatamente en un *White Screen of Death*. Mitigable para cliente, pero un riesgo severo de desarrollo. | Low | Tracking |
| **Hardcoded Taxonomia Rules** | Arch Review (H8, H11) | `attachBusinessRulesListeners` en `FormValidators.html` amarra lógica OCP a identificadores del Portafolio de productos (`cant_`, `total_integrantes`). Deberían transicionarse hacia el motor de configuración `APP_SCHEMAS`. | Medium | S12.2 / Epic 13 |
| **Orphaned Factory Repaint** | Arch Review (H13) | `UI_Factory.bindLevelChangeRepaint` introduce subscripciones asíncronas a una herramienta teóricamente pura (`FormBuilder_Inputs`). Se recomienda abstraer orquestación topológica a un `UI_EventBinder` dedicado. | Low | Diferido |
| **Validator Truthiness Trap** | Quality Rev. | `!input.value` en `validateRequiredFields` reporta los valores "0" numéricos (ej. Presupuestos = 0) como vacíos o nulos, bloqueando el form. Se debe usar check estricto: `=== '' \|\| === null`. | Critica | Prioritario S12.1 |
| **JSON Parse Swallows Error** | Quality Rev. | El `try-catch` del parser inicial en *Dynamic Lists* captura cualquier excepción y la ignora, ocultando Data Corruption en BD. Se debe agregar `console.warn`. | Low | S12.2 |
| **Test Suites Mudos (Muda)** | Quality Rev. | Los archivos de test migrados contienen `describe.skip(...)`. Representan desperdicio porque no proveen mutability safety ni evalúan nada. Deberían borrarse o revivirse en E2E real. | Low | Diferido |
