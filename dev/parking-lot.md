# Backlog & Parking Lot (Post-Epic 11 / E12+)

Este documento condensa la Deuda Técnica material devuelta por los heurísticos de la última Quality Review.

## 🏗️ Deuda Topológica y Estructural

### 1. FormEngine_UI Growth (H7)
* **Origen:** Arch Review Epic E11.
* **Acción Causal:** El componente gigante `FormEngine_UI.html` supera las 1700 LOC. Contiene generadores pesados. Dividir responsabilidades de factory (templating) si excede los 2000 LOC, partiendo la inyección de la orquestación.

### 2. AST RegExp CSS Minifier (H14)
* **Origen:** Arch Review Epic E11 (`deploy.js`).
* **Acción Causal:** Abandonar la regex casera en favor de integrar oficialmente _Rollup_ o _Esbuild_ al pipeline Node.js si la densidad de tokens/alias CSS de Ionic se descontrola en la siguiente iteración.

### 3. Optimistic Timers (Modal Managers)
* **Origen:** Quality Review Epic E11.
* **Acción Causal:** Reemplazar `setTimeout(() => topModal.remove(), 300);` en el Garbage Collector de Modales por la escucha al evento nativo `ionModalDidDismiss` para prevenir interrupciones forzadas de la animación CSS.

### 4. API Fail-Fast Scoping
* **Origen:** Quality Review Epic E11.
* **Acción Causal:** Las utilerías UI (`JS_Core`, etc.) se anexan con Carga Avasalladora (`include(...)`) sin Error Boundaries globales (`window.onerror`), acarreando peligro de WSOD incontrolado si `UI_Components` corrompe su AST.

---
_Nota: Todo el parking lot fundacional (Factory Components, Minifiers y QA Sandboxing) ha sido finalizado con éxito durante Epic E11._
