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
| E18| Gobernanza Topológica y Seguridad Contextual (ABAC) | ✅ Complete  | Micro-gobernanza, Segregation of Duties y Accesos basados en contexto SAFe | Max      |
| E19| Core Framework Resilience & Strictness                | ✅ Complete    | Validator Truthiness, Ionic Promises, AppEventBus Telemetry, Error Bounds | Alta     |
| E20| Pipeline Evolution & Native Tooling                   | ✅ Complete   | AST Config, Esbuild/Rollup, Pure CSS Extraction, ThemeManager Modularization | Media    |
| E21| Next-Gen MDM & Concurrency Data Layer                 | 🚧 To Do     | Optimistic Locking, Soft-Delete, ES5 Concats, Tests Mudos, Profiling | Muy Alta |
| E22| Enterprise B2B UX Transformation                      | ✅ Complete   | Top App Bar, Omnibar, Contextual ABAC Dashboard, Design System Purity| Max      |
| E23| Enterprise Identity & Zero-Trust SSO                  | 🚧 To Do     | Admin SDK Directory API integration para Avatares Reales y Perfiles  | Media    |

## Parking Lot / Deuda Técnica (Post-Epic 11)

### 🏗️ Historial Resuelto

| Item | Origen | Resolución |
|------|--------|------------|
| **Hardcoded Taxonomia Rules** | Arch Review (H8, H11) | ✅ [E13] Migrado a APP_SCHEMAS.businessRules dinámicamente. |
| **Orphaned Factory Repaint** | Arch Review (H13) | ✅ [E15] Absorbido por la inyección de `LocalEventBus`. |
| **UI_Router Global Aliases** | Arch Review S12.2 (H2) | ✅ [E13] Enrutado refactorizado y saneado de la interfaz global. |
| **Grid Status Tokens** | Arch Review S12.2 (H9) | ✅ [E13] Status class generalizado sin semánticas repetitivas. |
| **Grid Pagination Slicing** | Arch Review S12.2 (Q1) | ✅ [E13] Decisión: DataGrid preserva estado para mitigar caching overhead. |
| **WSOD Local XSS Risk** | Quality Rev. S12.3 | ✅ [E15] Sanitización global nativa con Template Isolation V4. |
| **Subgrid Lookup Implicit Fetch** | Arch Review S13.1 (H8) | ✅ [E13] Desacoplamientos realizados en S13 sobre el Componente base. |
| **sumPrefix Logic Duplication** | Arch Review S13.2 (Q1) | ✅ [E13] Unificado de manera DRY a reglas OCP del framework de validación. |
| **Validators Truthiness Bugs** | Quality Rev. S18.2 | ✅ [E19] Refactorización estricta de coerciones asimétricas y parsers `isNaN()`. |
| **Ionic Floating Promises Risks** | Arch Review S18.3 | ✅ [E19] Componentes `PresentSafe` global en Zero-Trust UI Framework. |
| **JSON Parse Swallows & WSOD** | App Event Bus Init | ✅ [E19] Telemetría Global Boundaries con inyección Safe. |
| **Legacy ThemeManager.js Script** | Arch Review S20.3 | ✅ [E20] Mutación hacia ES6 Module Pattern orquestado, desterrando código procedural. |

### 🚧 Deuda Activa (Backlog Técnico)

> **[INFO]** Toda la Deuda Técnica Activa devuelta por Quality y Architecture Reviews ha sido formalmente agrupada y escalada a las siguientes Épicas en el Roadmap (To-Do):
> - **[E21] Next-Gen MDM data Layer:** `Optimistic Locking`, Búsqueda Asíncrona (Debounce/Typeahead), `Soft-Delete` Graph Cleanup, `Concatenaciones ES5`, `Tests Mudos`, y `Profiling Mágico`.
> - **[E23] Enterprise Identity & SSO:** `Admin SDK Directory`, Google Profile Photo Hydration, Identity Fallbacks funcionales integrados y manejo de Scopes de Workspace nativos.
