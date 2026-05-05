## Architecture Review: E49 Taxonomía Wizard (scope: epic)

### Critical (fix before merge)
*Ninguno.* La arquitectura actual cumple con los requisitos funcionales de manera estable, sin introducir ciclos o bloqueos críticos. La delegación de estado (`FormRenderer` -> `UI_FormStepper`) fue un éxito.

### Recommended (simplify antes de la próxima épica)
- **src/UI_Router.client.js:150-260 (H11 - Change Reason Count):** El Router ha absorbido la responsabilidad de construir y estilizar el layout completo del Wizard a través del método `_renderFullScreen`. Esto viola la responsabilidad única. El Router debe cambiar solo por motivos de enrutamiento; el diseño del Wizard (CSS inyectado, creación de grillas, headers) debería extraerse a una vista dedicada (ej. `UI_View_Wizard.html`) o a un método dentro de `FormRenderer_UI`.
- **src/UI_Component_TXSearchable.client.js (H7 - Abstraction-to-LOC Ratio):** El componente web ha crecido a casi 1,000 líneas de código. Gestiona el ciclo de vida del WebComponent, la mutación del DOM, peticiones HTTP, paginación, y múltiples plantillas (Placeholder, Filled, Overlay). Se recomienda extraer la capa de peticiones y paginación a un Service, y/o dividir las plantillas en submétodos más pequeños.

### Questions (require human judgment)
- **src/Schema_Engine.js:** El modelo `Wizard_Taxonomia` define 6 pasos con campos que mapean directamente a relaciones físicas de `Taxonomia`. ¿Se mantendrá como una entidad virtual (sin tabla física) permanente? Si es así, ¿la lógica de guardado en `API_Universal` (interceptores) puede volverse un cuello de botella si se agregan más pasos en el futuro?
- **Separación del Stepper:** Actualmente el progreso del stepper depende estrictamente de inspeccionar el DOM (`getValidatedValue()` de los WebComponents). ¿Deberíamos mover esta validación a un modelo de datos reactivo en lugar de consultar el DOM en cada pulsación?

### Observations (patterns noted)
- **(H2) Delegación Inversa (IoC):** La estrategia de inyectar un contenedor custom (`customContainer`) en `FormRenderer_UI` desde el Router funcionó perfectamente para desacoplar el motor de formularios del `DrawerStackController`. Es un patrón limpio que puede reutilizarse en futuros dashboards.
- **Glassmorphism Footer:** La integración del footer flotante y la barra de progreso mejora drásticamente la percepción de la aplicación sin sobrecargar el DOM.

### Verdict
- [x] PASS WITH QUESTIONS
