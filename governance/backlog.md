
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
| E12| UI Modularization & Core Scaling                      | ✅ Complete  | Deconstrucción FormEngine, Routing, y Tooling CSS     | Muy Alta |
| E13| The Cleaning Sprint (Arch & Tech Debt)                | ✅ Complete   | Extracción de Subgrids M:N, CSS Minifier y Rules      | Alta     |
| E14| The Modularization Epoch (ES6 & Micro-Frontends)      | ✅ Complete  | Fraccionar FormRenderer, CSS Nativo y Template Literals| Max      |
| E15| Topological Tech Debt (Cleaning Sprint)               | ✅ Complete  | Deuda técnica estructural (FormEngine, GC Modales, XSS)| Alta     |

## Parking Lot / Deuda Técnica (Post-Epic 11)

| Item | Origen | Descripción | Severidad | Prioridad |
|------|--------|-------------|-----------|-----------|
| **AST RegExp CSS Minifier** | Arch Review (H14) | Considerar integración oficial de _Rollup_ o _Esbuild_ al pipeline Node.js, evaluando abandonar la minificación Regex manual (en `deploy.js`) si la densidad de tokens/alias CSS crece exponencialmente. | Low | Diferido |
| **Profilers Magic Literals** | Quality Rev. | Estandarizar exigencia de Delta = 0 para el test de fuga de memoria E2E en `TEST_Suite_UI.html` (removiendo umbral tolerante `±5`). Documentar causas nativas si persisten nodos huérfanos de Ionic (e.g., Ion-Backdrops). | Low | Diferido |
| **Hardcoded Taxonomia Rules** | Arch Review (H8, H11) | `attachBusinessRulesListeners` en `FormValidators.html` amarra lógica OCP a identificadores del Portafolio de productos (`cant_`, `total_integrantes`). Deberían transicionarse hacia el motor de configuración `APP_SCHEMAS`. | Medium | S12.2 / Epic 13 |
| **Orphaned Factory Repaint** | Arch Review (H13) | `UI_Factory.bindLevelChangeRepaint` introduce subscripciones asíncronas a una herramienta teóricamente pura (`FormBuilder_Inputs`). Se recomienda abstraer orquestación topológica a un `UI_EventBinder` dedicado. | Low | Diferido |
| **Validator Truthiness Trap** | Quality Rev. | `!input.value` en `validateRequiredFields` reporta los valores "0" numéricos (ej. Presupuestos = 0) como vacíos o nulos, bloqueando el form. Se debe usar check estricto: `=== '' \|\| === null`. | Critica | Prioritario S12.1 |
| **JSON Parse Swallows Error** | Quality Rev. | El `try-catch` del parser inicial en *Dynamic Lists* captura cualquier excepción y la ignora, ocultando Data Corruption en BD. Se debe agregar `console.warn`. | Low | S12.2 |
| **Test Suites Mudos (Muda)** | Quality Rev. | Los archivos de test migrados contienen `describe.skip(...)`. Representan desperdicio porque no proveen mutability safety ni evalúan nada. Deberían borrarse o revivirse en E2E real. | Low | Diferido |
| **UI_Router Global Aliases** | Arch Review S12.2 (H2) | Purgar los alias globales pasivos (`window.navigateTo`, etc.) cuando todos los consumidores (vistas legacy) cambien a usar la instancia `window.UI_Router` de forma estricta. | Low | Cleaning Sprint E13 |
| **Grid Status Tokens** | Arch Review S12.2 (H9) | Centralizar los literales "duros" de `_badgeClass` que habitan en `UI_DataGrid` para que residan dentro de `APP_SCHEMAS`, evitando repetir lógica CSS-JS semántica. | Low | Cleaning Sprint E13 |
| **Grid Pagination Slicing** | Arch Review S12.2 (Q1) | Evaluar si el componente `UI_DataGrid` debe perder el conocimiento lógico de paginar (`filteredData.slice`) en pro de ser totalmente "tonto" (solo recibir `visibleRows`). Necesario si se introduce Remote Pagination, aunque introduce rediseño sobre `DataView_UI`. | Medium | Evaluación E13 |
| **ES5 String Concatenation** | Quality Rev. S12.2 | La factoría `UI_DataGrid` concatena cadenas de manera masiva en formato ES5 puro. Si Google Apps Script implementa definitivamente compatibilidad oficial y estable moderna V8, migrar todo a Template Literals (`` ` ``) para mayor legibilidad. | Low | Evolutivo |
| **WSOD Inline Styles** | Arch Review S12.3 (H4) | Eliminar la macro-concatencación estática del Template HTML dentro del Catching Global en `Index.html` y refugiarlo nativamente usando la tag nativa web `<template id="wsod-mitigator">` destapable vía JS. | Low | Diferido |
| **WSOD Local XSS Risk** | Quality Rev. S12.3 | Escapar los caracteres HTML o usar `.textContent` antes de inyectar dinámicamente el `errDetail` dentro de la vista de Pánico Roja en el manejador local `window.onerror` para prevenir inyección maliciosa (OWASP). | Low | Diferido |
| **Ionic Modal Promises** | Quality Rev. S12.3 | Transicionar los *Native Event Listeners* asíncronos (`addEventListener('ionModalDidDismiss')`) a *Promesas Estrictas* (`modal.onDidDismiss().then()`) para alinearse semánticamente a los estándares de Stencil.js e Ionic Framework mitigando Cancellation Bugs en edge cases de transiciones CSS3. | Low | Diferido |
| **Subgrid Lookup Implicit Fetch** | Arch Review S13.1 (H8) | `UI_SubgridBuilder` depende ciegamente de `window._LOOKUP_DATA`. Evaluado como Anti-Patrón (Configuración sobre Convención). Desacoplar inyectando opciones directamente o vía Schema. | Low | Diferido |
| **_UI_CONFIG Localization** | Arch Review S13.2 (H8) | El objeto `_UI_CONFIG` para el `badgeMap` fue colocado en `Schema_Engine.gs` (Capa de Persistencia). A futuro debería moverse a una constante global inyectable en `CSS_DesignSystem` si la arquitectura SPA madura a WebComponents orgánicos. | Low | Diferido |
| **sumPrefix Logic Duplication** | Arch Review S13.2 (Q1) | La semántica matemática explícita de `sumPrefix` se encuentra iterativamente duplicada en 2 interfaces separadas: para DOM (`FormValidators.html`) y para Data-objects puras (`DataView_UI.html`). Puede abstraerse a un `rule.evaluate(payload)` neutro en `FormEngine_Core`. | Low | Diferido |
| **Native CSS Abstraction** | Arch Review S13.4 (Q1) | El script de Node `deploy.js` compila hojas CSS parseando HTML en memoria (`CSS_App.html`). Al madurar, separar el código fuente en `.css` puro y concatenarlo estáticamente aliviará falsos positivos en los Linting tools del IDE. | Low | Diferido |
