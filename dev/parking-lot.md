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

### 5. FormRenderer Input Generation (H11)
* **Origen:** Arch Review Epic 14 (S14.1).
* **Acción Causal:** A pesar de la reducción masiva de responsabilidad de `FormRenderer_UI.html`, todavía contiene un `switch (field.type)` interno para la generación básica de inputs. Éste debe ser abstraído por completo moviendo estas directivas a `UI_Factory.html`.

### 6. Legacy Global Aliases Deprecation (H2)
* **Origen:** Arch Review Epic 14 (S14.1).
* **Acción Causal:** `UI_FormStepper` y `UI_FormUtils` exponen aliases para `FormRenderer_UI` invocables vía obj Global (ej. `window.goToFormSection`). Documentar su periodo de latencia y removerlos en fases maduras para no acumular Orphaned Abstractions.

### 7. FormContext Object Injection (H8)
* **Origen:** Arch Review Epic 14 (S14.1).
* **Acción Causal:** Simplificar la macro-configuración inyectada al inicializar `UI_FormStepper` (`stepperConfig` de 7 variables directas) integrando toda la herencia a través del unificado objeto local `FormContext`.

### 8. Null/Empty String Normalization (Falsy/Truthiness Trap)
* **Origen:** Quality Review Epic 14 (S14.1).
* **Acción Causal:** `UI_FormSubmitter.html` procesa inputs regulares validando `val !== undefined && val !== null`. Esto permite enviar Strings vacíos (`""`), rompiendo validaciones backend en bases estrictamente normalizadas (OCP) o reglas Not-Null engañosas en App Script. Aplicar trim forzado (`String(val).trim() !== ''`) universalmente antes de empaquetar en el JSON.

### 9. Leak Detection and Global Scope Pollution
* **Origen:** Quality Review Epic 14 (S14.1).
* **Acción Causal:** El Helper purificado `UI_FormUtils.html` expone redundancias explícitas a V8 global (`window.getDominiosPadreOptions = window.UI_FormUtils.getDominiosPadreOptions`) elevando el riesgo de "Unconscious Object Mutation" si módulos paralelos o scripts de terceros interfieren. Evaluar un patrón Sandbox Strict o eliminar the alias bindings tan pronto como todos los componentes consuman `UI_FormUtils` directamente.

---
_Nota: Todo el parking lot fundacional (Factory Components, Minifiers y QA Sandboxing) ha sido finalizado con éxito durante Epic E11._

### 10. Evolución de ThemeManager (H1)
* **Origen:** Arch Review Epic 14 (S14.2).
* **Acción Causal:** El script `UI_ThemeManager.html` fue extraído exitosamente aislando `window.hydrateThemeConfig()`. Al tener una única implementación inyectada en crudo, se propone evaluar su migración a una Clase ES6 formal orquestada dinámicamente por `AppController` en iteraciones futuras de arquitectura.

### 11. Limpieza Segura de Assets Temporales (H4)
* **Origen:** Arch Review Epic 14 (S14.2).
* **Acción Causal:** La eliminación forzada del directorio temporal `.build/assets` en `deploy.js` previene colisiones con Clasp. Evaluar si delegar esta exclusión estrictamente al filtro pasivo de `.claspignore` (ej. ignorar `**/*.css` nativo) es preferible frente a operaciones activas de File System (Mutación) en el pipeline script.

### 12. Fallback Defensivo en UI_SubgridBuilder (H2)
* **Origen:** Arch Review Epic 14 (S14.3).
* **Acción Causal:** En `UI_SubgridBuilder.html` se ha implementado el Pub/Sub con el LocalEventBus, pero se dejó expuesto un fallback (`else if (typeof window.renderForm)`) protector hacia la macro-función global por retro-compatibilidad. Al estabilizar todos los Componentes e implementarse ES6 estricto, erradicar este amortiguador para forzar obligatoriamente el aprovisionamiento del Hub de Eventos o fallar limpiamente.
