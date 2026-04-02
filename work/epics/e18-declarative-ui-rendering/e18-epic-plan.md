# Epic Execution Plan: E18 - Declarative UI Rendering

**Sequence & Dependencies:**

| Phase | Story ID | Name | Description | Blocker |
|-------|----------|------|-------------|---------|
| 1 | S18.1 | AppEventBus Total Adoption | ✅ Reemplazar llamadas cableadas a DataViewEngine y UI_Router por `window.AppEventBus.publish('NAV::CHANGE')` globalmente. | None |
| 1 | S18.2 | CSS Declarative Visibility | ✅ Cambiar todas las líneas `.style.display` imperativas hacia manipulaciones `.classList.toggle('ion-hide')` o clases reactivas puras en V4. | None |
| 2 | S18.3 | Static Template Isolation | ✅ Migrar estados pasivos (Dashboard, Skeletons, Errors, Toolbars) a elementos nativos DOM `<template>`. Aislar FOUC seguro. | S18.1, S18.2 |
| 3 | S18.4 | Dynamic DataGrid Dom Refactoring | ✅ Reconstruir el motor de la grilla principal (Tablas de Datos) para devolver DocumentFragments seguros contra XSS, evaluando `createElement` vs `htmlToFragment`. | S18.3 |
| 4 | S18.5 | FormRenderer Factory Extraction | ✅ Refactorizar todo `FormRenderer_UI` y `UI_SubgridBuilder` a construir nodos puramente usando `document.createElement()` sobre DocumentFragments sin `innerHTML`. | S18.4 |
| 5 | S18.6 | Root Eradication (Global Nullification) | Purgar remanentes de `.innerHTML` globales reescribiendo los constructores de `UI_Router`, `DataView_UI` y micro-componentes de `FormBuilder_Inputs`. | S18.5 |

---

**Progreso Actual:** Pausado en Gates Naturales.
**Status Epic Lifecycle:** (Start ✅) → (Design ✅) → (AR ✅) → (Plan ✅) → **(S18.2 CLOSED ✅)**.
