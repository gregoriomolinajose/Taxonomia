## Architecture Review: Epic 21 (scope: epic)

Esta revisión arquitectónica sistémica abarca los componentes implementados entre `epic/e22-complete` y `epic/e21-complete` para la Épica E21: Next-Gen MDM & Concurrency Data Layer.

### Critical (fix before merge)
*No se encontraron incidentes críticos de diseño ni sobre-ingeniería obstructiva a nivel de sistema.*

### Recommended (simplify before next cycle)
* **`src/DataView_UI.html:64` y `src/Omnibar_UI.html:271`**: 
  - **Heurística:** H10 (Pattern Duplication) / H8 (Configuration Over Convention)
  - **Observación:** El patrón de inyección delegada `(window.debounce || function(f){return f;})` se repite transversalmente para protegerse del orden de carga de los scripts en GAS. 
  - **Sugerencia:** Para futuras Épicas donde se centralice más la UI, el despachador de Eventos Global (`AppEventBus`) debería ser capaz de auto-debounsear los canales, quitándole esta responsabilidad a los manejadores del componente `_onSearch`. No es urgente dada la estabilización de ES6.

### Questions (require human judgment)
* **`src/UI_FormSubmitter.html:128`**: 
  - **Heurística:** H13 (Orphaned Abstractions) - Limpieza Radical
  - **Pregunta:** Eliminaste brillantemente el mecanismo de pruebas mudas `_onSuccessMock` local cortocircuitándolo. ¿Existe alguna necesidad futura de probar la UI desconectada del backend, o confirmamos que la Plataforma "taxonomia" ha superado la dependencia a emuladores locales? (El código asume felizmente que no).

### Observations (patterns noted)
* **`src/JS_Core.html`**:
  - Implementación de `window.debounce` cumple puramente la regla de Proporcionalidad (Beck Rule 4 - KISS). La utilidad es agnóstica a la UI y puede escalarse a cualquier capa SPA.
* **`src/Auth_UI.html`**:
  - El desacoplamiento estructural re-enfocó el Avatar para usar `window.AuthManager.currentUser` en memoria (eliminando la recolección textual del DOM). Esto resuelve la deuda táctil expuesta por la heurisíca H2 en limpiezas previas.

### Verdict
- [X] PASS
