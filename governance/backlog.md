
# Backlog: Taxonomia Project

> **Status**: Draft

## Epics

| ID | Epic | Status | Scope | Priority |
|----|------|--------|-------|----------|
| E1 | Setup de Plataforma SAFe 6.0 e Integración Dual-Write | ✅ Complete  | Implementar backend en GAS y base UI en Ionic. | Alta     |
| E3 | Migración a Producción SGMP                           | ✅ Complete   | S3.2 / S1.1 / S1.2: [DONE]                            | Alta     |
| E8 | Graph Governance & Business Rules Engine              | ✅ Complete  | TDAG server backend & Business Rules interceptors     | Media    |
| E9 | Refactor UI MDM & ThemeManager                        | ✅ Complete   | Migrar estilos hardcoded, sanear LIFO Max Depth GC    | Alta     |
| E11| Declarative UI Refactoring                            | ✅ Complete  | Componentización SPA y Pipeline QA/Minify             | Alta     |
| E12| UI Modularization & Core Scaling                      | ✅ Complete  | Deconstrucción FormEngine, Routing, y Tooling CSS     | Muy Alta |
| E13| The Cleaning Sprint (Arch & Tech Debt)                | ✅ Complete   | Extracción de Subgrids M:N, CSS Minifier y Rules      | Alta     |
| E14| The Modularization Epoch (ES6 & Micro-Frontends)      | ✅ Complete  | Fraccionar FormRenderer, CSS Nativo y Template Literals| Max      |
| E15| Topological Tech Debt (Cleaning Sprint)               | ✅ Complete  | Deuda técnica estructural (FormEngine, GC Modales, XSS)| Alta     |
| E16| Blueprint V4 Audit & Refactoring                      | ✅ Complete  | Refactorización Arquitectural: DataGrid Minimalism, Visibility Flags, Topology| Alta     |
| E17| Core Initialization Purification                      | ✅ Complete  | Desacoplar JS_Core.html, ThemeManager, Auth UI y Math Logic | Max      |
| E18| Gobernanza Topológica y Seguridad Contextual (ABAC) | 🏃 In Progress| Micro-gobernanza, Segregation of Duties y Accesos basados en contexto SAFe | Max      |

## Parking Lot / Deuda Técnica (Post-Epic 11)

### 🏗️ Historial Resuelto

| Item | Origen | Resolución |
|------|--------|------------|
| **Hardcoded Taxonomia Rules** | Arch Review (H8, H11) | ✅ [E13] Migrado a APP_SCHEMAS.businessRules dinámicamente. |
| **Orphaned Factory Repaint** | Arch Review (H13) | ✅ [E18] Absorbido por la inyección de `LocalEventBus`. |
| **UI_Router Global Aliases** | Arch Review S12.2 (H2) | ✅ [E13] Enrutado refactorizado y saneado de la interfaz global. |
| **Grid Status Tokens** | Arch Review S12.2 (H9) | ✅ [E13] Status class generalizado sin semánticas repetitivas. |
| **Grid Pagination Slicing** | Arch Review S12.2 (Q1) | ✅ [E13] Decisión: DataGrid preserva estado para mitigar caching overhead. |
| **WSOD Local XSS Risk** | Quality Rev. S12.3 | ✅ [E18] Sanitización global nativa con Template Isolation V4. |
| **Subgrid Lookup Implicit Fetch** | Arch Review S13.1 (H8) | ✅ [E13] Desacoplamientos realizados en S13 sobre el Componente base. |
| **sumPrefix Logic Duplication** | Arch Review S13.2 (Q1) | ✅ [E13] Unificado de manera DRY a reglas OCP del framework de validación. |

### 🚧 Deuda Activa (Backlog Técnico)

| Item | Origen | Descripción | Severidad | Prioridad |
|------|--------|-------------|-----------|-----------|
| **AST RegExp CSS Minifier** | Arch Review (H14) | Considerar integración oficial de _Rollup_ o _Esbuild_ al pipeline Node.js, evaluando abandonar la minificación Regex manual (en `deploy.js`) si la densidad de tokens/alias CSS crece exponencialmente. | Low | Diferido |
| **Profilers Magic Literals** | Quality Rev. | Estandarizar exigencia de Delta = 0 para el test de fuga de memoria E2E en `TEST_Suite_UI.html` (removiendo umbral tolerante `±5`). Documentar causas nativas si persisten nodos huérfanos de Ionic (e.g., Ion-Backdrops). | Low | Diferido |
| **Validator Truthiness Trap** | Quality Rev. | `!input.value` en `validateRequiredFields` reporta los valores "0" numéricos (ej. Presupuestos = 0) como vacíos o nulos, bloqueando el form. Se debe usar check estricto: `=== '' \|\| === null`. | Critica | Eléctrico |
| **JSON Parse Swallows Error** | Quality Rev. | El `try-catch` del parser inicial en *Dynamic Lists* captura cualquier excepción y la ignora, ocultando Data Corruption en BD. Se debe agregar `console.warn`. | Low | Diferido |
| **Test Suites Mudos (Muda)** | Quality Rev. | Los archivos de test migrados contienen `describe.skip(...)`. Representan desperdicio porque no proveen mutability safety ni evalúan nada. Deberían borrarse o revivirse en E2E real. | Low | Diferido |
| **ES5 String Concatenation** | Quality Rev. S12.2 | La factoría `UI_DataGrid` concatena cadenas de manera masiva en formato ES5 puro. Si Google Apps Script implementa API V8, migrar a Template Literals. | Low | Evolutivo |
| **WSOD Inline Styles** | Arch Review S12.3 (H4) | Eliminar macro-concatenación estática del Template HTML dentro del Catch Central y refugiarlo nativamente usando la etiqueta `<template id="wsod-mitigator">` destapable vía JS. | Low | Diferido |
| **Ionic Modal Promises** | Quality Rev. S12.3 | Transicionar los *Native Event Listeners* asíncronos a *Promesas Estrictas* (`modal.onDidDismiss().then()`) para alinearse a Stencil mitigando Cancellation Bugs. | Low | Diferido |
| **_UI_CONFIG Localization** | Arch Review S13.2 (H8) | Objeto `_UI_CONFIG` fue colocado en `Schema_Engine.gs`. A futuro debería moverse a una constante global inyectable. | Low | Diferido |
| **Native CSS Abstraction** | Arch Review S13.4 | Separar el código fuente en `.css` puro y concatenarlo aliviará falsos positivos en Linting. | Low | Diferido |
| **AppEventBus Telemetry** | Arch Review S18.1 (H6) | Se pierden los stacktraces directos de UI en caso de error. Se recomienda inyectar `console.info` para tener trazabilidad. | Medium | S18.X |
