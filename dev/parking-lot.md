# Backlog & Parking Lot (Post-Epic 11 / E12+)

Este documento condensa la Deuda Técnica material devuelta por los heurísticos de la última Quality Review.

## 🏗️ Deuda Topológica y Estructural

### 1. FormEngine_UI Growth (H7)
* **Origen:** Arch Review Epic E11.
* **Acción Causal:** El componente gigante `FormEngine_UI.html` supera las 1700 LOC. Contiene generadores pesados. Dividir responsabilidades de factory (templating) si excede los 2000 LOC, partiendo la inyección de la orquestación.

### 2. AST RegExp CSS Minifier (H14)
* **Origen:** Arch Review Epic E11 (`deploy.js`).
* **Acción Causal:** Abandonar la regex casera en favor de integrar oficialmente _Rollup_ o _Esbuild_ al pipeline Node.js si la densidad de tokens/alias CSS de Ionic se descontrola en la siguiente iteración.


### 4. API Fail-Fast Scoping
* **Origen:** Quality Review Epic E11.
* **Acción Causal:** Las utilerías UI (`JS_Core`, etc.) se anexan con Carga Avasalladora (`include(...)`) sin Error Boundaries globales (`window.onerror`), acarreando peligro de WSOD incontrolado si `UI_Components` corrompe su AST.

### 5. FormRenderer Input Generation (H11)
* **Origen:** Arch Review Epic 14 (S14.1).
* **Acción Causal:** A pesar de la reducción masiva de responsabilidad de `FormRenderer_UI.html`, todavía contiene un `switch (field.type)` interno para la generación básica de inputs. Éste debe ser abstraído por completo moviendo estas directivas a `UI_Factory.html`.


### 7. FormContext Object Injection (H8)
* **Origen:** Arch Review Epic 14 (S14.1).
* **Acción Causal:** Simplificar la macro-configuración inyectada al inicializar `UI_FormStepper` (`stepperConfig` de 7 variables directas) integrando toda la herencia a través del unificado objeto local `FormContext`.


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

### 13. Granularidad Múltiple en DataGrid (H4)
* **Origen:** Arch Review Epic 14 (S14.4).
* **Acción Causal:** Tras la migración a ES6 Template Literals, `UI_DataGrid` ha ganado muchísima legibilidad pero retiene gran tamaño (>280 líneas HTML). Evaluar si justificar la fragmentación de sus renderizadores en micro-módulos (`UI_DataGrid_Table.html` y `UI_DataGrid_Grid.html`) excede la directiva de Keep It Simple (KISS) o si aporta valor a futuro para mantenimientos específicos.

### 14. AST Build-Time Validation en CI/CD (Pipeline Gap)
* **Origen:** Arch Review Epic 14 (Post-Deploy Addendum S14.4).
* **Acción Causal:** Un error de sintaxis crudo (backslashes escapando Template Literals ES6 en `<script>`) en `UI_DataGrid.html` burló la validación del Node Deployer porque `deploy.js` sólo minifica `CSS_App`. Clasp inyectó el JS inválido a GAS causando un *White Screen of Death* silencioso y no recuperable en FrontEnd.
* **Resolución Necesaria:** Es urgente ampliar el script de despliegue `deploy.js` añadiéndole bibliotecas como `acorn.parse()` o `esprima` que arranquen y verifiquen estáticamente el Abstract Syntax Tree (AST) de cada bloque de `<script>` que exista dentro de nuestros Módulos HTML *ANTES* de disparar el `clasp push`. Esto blindará contra Typos fatales en Producción.

### 15. Compatibilidad V8 Acorn Parser (H8)
* **Origen:** Arch Review Epic 15 (S15.1).
* **Acción Causal:** Al implementar la validación AST en `deploy.js`, se configuró `ecmaVersion: 'latest'`. Si los desarrolladores introducen azucar sintáctico muy moderno que el Runtime V8 de Apps Script no soporte nativamente, la validación local pasará en el pipeline pero fallará en el servidor G-Suite. Evaluar si es prudente anclar el `ecmaVersion` a `2022` o similar en la próxima revisión del pipeline.

## 🚀 Next-Gen MDM Architecture (Post-Epic 14 / Roadmap)

### 14. Motor de Optimistic Locking
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** Implementar bloqueo optimista para prevenir colisiones concurrentes. Si el *Usuario B* guarda sobre un registro modificado más recientemente por el *Usuario A*, el sistema debe frenar la escritura, notificar quién lo alteró y solicitar confirmación de sobreescritura.

### 15. Typeahead Debounce para Paginación de Selects (Big Data)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** Prevenir el colapso del DOM en listas de catálogo masivas (N > 2,000, ej. Incidentes). Introducir el flag `lookupType: "async"` en el esquema para que el backend renderice un buscador con Debounce (300ms) que cargue silenciosamente bloques de 20 records.

### 16. Soft-Delete Unidireccional (Huérfanos Ocultos)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** El borrado lógico de un Padre (ej. Portafolio) NO debe mutar el estado de sus hijos físicos en la base de datos (se mantienen intactos). `Engine_Graph.js` asume la responsabilidad topológica in-line: si detecta al padre como eliminado, automáticamente omite del DOM a sus hijos por herencia de grafo.

### 17. RBAC Validations (Zero-Trust Frontend)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** Nunca confiar en el Frontend. Implementar el control en `APP_SCHEMAS` con flags pasivos de `role: "admin"` para ocultar campos o inyectar `readonly` mejorando UX, pero exigiendo Validación Pura y Dura en Servidor para rechazar mutaciones falsificadas vía *Developer Tools*.

### 18. Decoupled Pub/Sub en Vistas Recursivas (AppEventBus)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** Prohibición estricta de acoplamiento. Cualquier componente hijo guardado vía *Modal LIFO* disparará `window.AppEventBus.publish('RECORD_SAVED', payload)` sin importar de dónde venga. El formulario o componente Padre (quien está subscrito en background) decidirá independientemente repintarse y recalcular totales sin inyecciones circulares directas de sus hijos.
