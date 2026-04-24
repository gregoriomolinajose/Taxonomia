# Epic E41: Unified Searchable Web Component (Single & Multi PWA Ready)

## Objective
Evolucionar y fusionar los componentes de selección de Taxonomía (`UI_Component_SearchableSingle` y `UI_Component_SearchableMulti`) en un **Único Web Component Unificado** (`<tx-searchable>`). Este componente maestro utilizará el paradigma de *Vanilla Custom Elements*, soportando tanto la elección única como múltiple a través de un simple atributo HTML (`multiple="true"`), siendo totalmente compatible con el empaquetado nativo (PWA/Capacitor para iOS/Android).

## Value
El rediseño obedece directamente al principio DRY (Don't Repeat Yourself). Evita mantener dos motores de búsqueda, modales infinitos y generadores de DOM paralelos. Al abstraerlo todo bajo el atributo de cardinalidad, Taxonomía consolida su Component Library UX, mitiga Memory Leaks (ausencia de listeners repetitivos), acelera la estandarización PWA y elimina definitivamente el código espagueti inyectado desde `FormRenderer_UI`.

## In Scope (MUST/SHOULD)
- Refactorización y fusión del código legado de `SearchableSingle` y `SearchableMulti`.
- Encapsulamiento del motor unificado como Web Component nativo `<tx-searchable>`.
- Control declarativo de UI: renderiza sub-vistas Radio/Click Directo (Single) VS Checkboxes + Action Pills (Multi) evaluando su estado de cardinalidad.
- Limpieza agresiva de Memoria (Garbage Collection Lifecycle).
- Soporte base para ecosistemas PWA e integraciones táctiles (Capacitor).

## Out of Scope
- Migración de otros componentes (DataGrid, Uploads) a Web Components puros.
- SCROLL VIRTUAL / INFINITO: Descartado por Overengineering (YAGNI). Un simple Flex Overflow-Y será utilizado.
- Configuración del Manifest Global PWA.

## Stories
- **S41.1**: Design API Contract for Unified Web Component (`<tx-searchable>`). [DONE]
- **S41.2**: Implement Base Hybrid Architecture & Unified State Engine. [DONE]
- **S41.3**: Conditional DOM Mapping (Absorbida en S41.2). [DONE]
- **S41.4**: DOM Lifecycle Hooks (Absorbida en S41.1). [DONE]
- **S41.5**: Integration Testing & FormRenderer Regression checks. [DONE]
- **S41.6**: TDD & E2E Testing (Actualización de TEST_Suite_UI y Pruebas Playwright para resiliencia PWA). [x] S41.6 ✓
- **S41.7**: Retroalimentación Visual (Desktop Legacy UI Clone absoluto bypassando ion-popover). [x] S41.7 ✓
- **S41.8**: Estabilización Arquitectónica y Cumplimiento de Design System PWA. [x] S41.8 ✓
- **S41.9**: Finalización del Flujo Multi-Selección (Validación de Chips, Límites, y envío FormRenderer). [x] S41.9 ✓
- **S41.10**: Fix UX In-Line para Multi-select. [x] S41.10 ✓
- **S41.11**: Eliminación del bloqueo Race Condition FormRenderer. [x] S41.11 ✓
- **S41.12**: Cierre de Brechas Modal/Dropdown UI Resilience. [x] S41.12 ✓
- **S41.13**: Abstracción de UI Factories (DRY refactoring). [x] S41.13 ✓
- **S41.14**: Migración de Subgrids Legacy a TXSearchable. [x] S41.14 ✓
- **S41.15**: Abstracción Declarativa de Renderizado PWA (Zero-Hardcode CSS for Inline/Popover States, Refactor Arquitectónico H8). [TO DO]

## Done
- El componente `SearchableMulti` puede invocarse limpiamente mediante custom tags de HTML.
- Componente probado exitosamente sin generar pérdidas de memoria o listeners zombis.
- Funcionalidad de selección visual y búsqueda al nivel de UX del `SearchableSingle`.
- Validado bajo compilador / linter local.

## Risks
| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Shadow DOM impide capturar Custom Events de Ionic | Alta | El Componente retransmitirá delegando a `window.AppEventBus` o inyectará los eventos como propiedades `CustomEvent` con `composed: true`. |
| Conflictos Modales de Ionic (Z-Index múltiple) | Media | Manejar el componente como Modal independiente o usar un Full-Screen Popover en lugar de modales anidados infinitos. |
