---
epic: E12
title: "UI Modularization & Core Scaling"
status: "completed"
start_date: "2026-03-31"
---

# Epic E12: UI Modularization & Core Scaling - Scope

## Objective
Desarrollar una infraestructura SPA escalable mediante la amputación y deconstrucción de capas monolíticas acopladas (Superiores a 25 KB u 800 LOC). Focalizándose metodológicamente en el despliegue de Fábricas Componentizadas, librerías de enrutamiento agnóstico y validación modular.

## In Scope
- [x] Desmembramiento absoluto de `FormEngine_UI.html`  - No hay cruces de dominios entre Routing y Form rendering.
- [x] DataView es ahora incapaz de mutar _hardcoded state_ porque recibe la UI pasivamente desde **UI_DataGrid**.
- [x] `S12.3`: Testing suites limpian (0 skips) y Componentes asíncronos mueren estrictamente por evento. ErrorBoundary frena crashes fatales V8 visualizados amigablemente.
- [x] Separación asincrónica del enrutador central y _state machine_ de `JS_Core.html` (`UI_Router`).
- [x] Error-Boundary global con mitigación (API Fail-Fast mitigations).
- [x] GC nativo en Modal Managers (`ionModalDidDismiss`).
- [ ] Migración a Frameworks MVT / Virtual DOM Terceros (Ej. Vue, React).
- [ ] Alterar las capacidades declarativas base del `Schema_Engine.gs`.

## Planned Stories
- **[x] S12.1**: FormEngine Splitting. Extraer lógicas de construcción atómica del `FormEngine` hacia sub-fábricas puras (`FormBuilder_Inputs`). (Size: L, Deps: None) ✓
- **[x] S12.2**: Enrutamiento Autocontenido. Separar motor lógico de navegación desde `JS_Core` a `UI_Router` e instanciar Grillas abstractas para `DataView_UI`. (Size: M, Deps: S12.1). ✓
- **[x] S12.3**: Resiliencia y Tooling. Atacar los Fallos Heurísticos de Calidad (Boundary Errors del SPA y Cierre Nativo de Modal Managers). (Size: S, Deps: S12.2). ✓

## Done Criteria
- [x] `FormEngine_UI.html` fue sustituido (o decantado) por un inyector maestro (Ej. `FormRenderer_UI`) que no rebasa los 25 KB o las 800 LOC de complejidad ciclomática bruta.
- [x] Listados/DataTables son componentes aislados que actúan por polimorfismo hacia `DataView_UI.html`.
- [x] El Router Global y Variables del Estado (`window.AppState`) habitan en un script de lógica pura con Cero-Manejo-DOM.
- [x] Cierres Modales aguardan la animación web nativa para liberar memoria.
- [x] Todo el ecosistema pasa los estrictos umbrales de Linter y la Quality Review sin Regresiones Topológicas.

## Risks & Mitigations
1. **Riesgo:** Pérdida de acoplamiento de variables Reactivas entre el Formulario Padre y los Subgrids o Sub-inputs generados externamente por la Builder Factory. (Impacto: Crítico).
   * *Mitigación:* Inyección estricta (DI) del `LocalEventBus` hacia cada widget factorizado para mantener viva la comunicación ascendente/descendente (SCD-2).
2. **Riesgo:** WSOD (White Screen of Death) por asimetrías de inyección HTTP usando Apps Script en Producción debido al tamaño fragmentado de scripts. (Impacto: Medio).
   * *Mitigación:* Exponer `window.onerror` en todo `Index.html` e insertar barreras pre-renderizado. Activar Build Stripping de test suites mediante `deploy.js`.

---
## Implementation Plan (Roadmap)

### Milestones
* **M1: Factoría Atómica (Walking Skeleton)** - Separación estable entre Orquestador (Renderer) e Inputs (Builder).
* **M2: Agnosticismo de Vistas (Core MVP)** - `UI_Router` y `UI_DataGrid` externalizados y puros.
* **M3: Resiliencia Final (Feature Complete)** - Blindajes WSOD y GC Modal operando en `Index.html`.

### Story Sequence Tracking

| ID | Story Name | Status | Size | Deps | Rationale |
|----|------------|--------|------|------|-----------|
| S12.1 | FormEngine Splitting | Done     | L | None | **Risk-First** (Mitigar colapso cognitivo del Inyector principal). |
| S12.2 | DataGrid & Routing Abstraction | Done | M | S12.1 | Despejar componentes presentacionales pesados. |
| S12.3 | GC Safety & Tooling Boundaries | Done | S | S12.2 | Cierre Quirúrgico de la Épica. |
