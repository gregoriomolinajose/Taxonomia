---
epic: E12
title: "UI Modularization & Core Scaling"
status: "in-progress"
start_date: "2026-03-31"
---

# Epic E12: UI Modularization & Core Scaling - Scope

## Objective
Desarrollar una infraestructura SPA escalable mediante la amputación y deconstrucción de capas monolíticas acopladas (Superiores a 25 KB u 800 LOC). Focalizándose metodológicamente en el despliegue de Fábricas Componentizadas, librerías de enrutamiento agnóstico y validación modular.

## In Scope
- Desmembramiento absoluto de `FormEngine_UI.html` (Orquestadores vs. Widgets/Inputs).
- Extracción lógica de la Matriz Generadora de Grids de `DataView_UI.html` a `UI_DataGrid`.
- Separación asincrónica del enrutador central y _state machine_ de `JS_Core.html` (`UI_Router`).
- Error-Boundary global con mitigación (API Fail-Fast mitigations).
- GC nativo en Modal Managers (`ionModalDidDismiss`).

## Out of Scope
- Migración a Frameworks MVT / Virtual DOM Terceros (Ej. Vue, React).
- Alterar las capacidades declarativas base del `Schema_Engine.gs`.

## Planned Stories
- **[ ] S12.1**: FormEngine Splitting. Extraer lógicas de construcción atómica del `FormEngine` hacia sub-fábricas puras (`FormBuilder_Inputs`). (Size: L, Deps: None).
- **[ ] S12.2**: Enrutamiento Autocontenido. Separar motor lógico de navegación desde `JS_Core` a `UI_Router` e instanciar Grillas abstractas para `DataView_UI`. (Size: M, Deps: S12.1).
- **[ ] S12.3**: Resiliencia y Tooling. Atacar los Fallos Heurísticos de Calidad (Boundary Errors del SPA y Cierre Nativo de Modal Managers). (Size: S, Deps: S12.2).

## Done Criteria
- [ ] `FormEngine_UI.html` fue sustituido (o decantado) por un inyector maestro (Ej. `FormRenderer_UI`) que no rebasa los 25 KB o las 800 LOC de complejidad ciclomática bruta.
- [ ] Listados/DataTables son componentes aislados que actúan por polimorfismo hacia `DataView_UI.html`.
- [ ] El Router Global y Variables del Estado (`window.AppState`) habitan en un script de lógica pura con Cero-Manejo-DOM.
- [ ] Cierres Modales aguardan la animación web nativa para liberar memoria.
- [ ] Todo el ecosistema pasa los estrictos umbrales de Linter y la Quality Review sin Regresiones Topológicas.

## Risks & Mitigations
1. **Riesgo:** Pérdida de acoplamiento de variables Reactivas entre el Formulario Padre y los Subgrids o Sub-inputs generados externamente por la Builder Factory. (Impacto: Crítico).
   * *Mitigación:* Inyección estricta (DI) del `LocalEventBus` hacia cada widget factorizado para mantener viva la comunicación ascendente/descendente (SCD-2).
2. **Riesgo:** WSOD (White Screen of Death) por asimetrías de inyección HTTP usando Apps Script en Producción debido al tamaño fragmentado de scripts. (Impacto: Medio).
   * *Mitigación:* Exponer `window.onerror` en todo `Index.html` e insertar barreras pre-renderizado. Activar Build Stripping de test suites mediante `deploy.js`.
