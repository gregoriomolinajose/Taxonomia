# Architecture Review: E18 Design (scope: epic)

### Critical (fix before merge)
*Ninguna violación crítica encontrada en la propuesta.* Reemplazar imperativo (`innerHTML`) por declarativo (`<template>`) es la directiva primaria del estándar V4.

### Recommended (simplify before next cycle)
- **H6 (Indirection Depth):** Al usar el `AppEventBus` en toda la aplicación para eventos triviales de ruteo como `NAV::CHANGE`, multiplicaremos los Listeners en el Router. Asegurarnos que `UI_Router.js` (o `.html`) no gotee memoria si se re-renderiza.

### Questions (require human judgment)
- **H8 (Configuration Over Convention):** La migración de `style.display = 'none'` hacia `.classList.toggle('ion-hide')` es la forma "Ionic". Sin embargo, si un nodo fue programáticamente ocultado vía EventBus, ¿cómo recuperará su visibilidad en el ciclo de vida subsecuente sin un "State Manager"? *Sugerencia:* No guardar estado, re-inicializar la cascada cada que la plantilla (`<template>`) se instancie.

### Observations (patterns noted)
- **H10 (Pattern Duplication):** Estamos a punto de sanear masivamente la deuda técnica de Renderizado V2 donde `Dashboard_UI` y `DataView_UI` duplicaban su ruteador. La S18.1 unificará esto bajo el Patrón Pub/Sub, lo cual pasa con honores esta heurística.

### Verdict
- [x] PASS WITH QUESTIONS
