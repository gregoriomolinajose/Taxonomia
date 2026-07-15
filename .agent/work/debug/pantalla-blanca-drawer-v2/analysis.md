# Análisis de Bug: Pantalla Blanca tras Drawer (Reincidencia)

## Triage
- **Tier**: S (Small) / M (Medium) - Cause is evident from recent commits.
- **Method**: 5 Whys (Code Review)

## 1. Define the Problem
**WHAT**: La pantalla del Canvas de Taxonomía se pone en blanco o se rompe al guardar y cerrar un drawer (ej. vincular una persona).
**WHEN**: Al guardar el formulario de una entidad (ej. Persona) desde el Canvas, el cual utiliza `UI_FormSubmitter`.
**WHERE**: `src/UI_FormSubmitter.client.js` en la función de limpieza y enrutamiento post-guardado (`executeSave` -> `_performSuccessCleanup`).
**EXPECTED**: El drawer debería cerrarse silenciosamente, emitir el evento `FORM::SUBMIT_SUCCESS` y el Canvas debería actualizar sus datos sin errores en consola ni redirecciones abruptas.

## 2. Root Cause Analysis (5 Whys)
1. **¿Por qué ocurre el pantallazo blanco o se interrumpe el flujo?**
   Porque hay un error fatal de JavaScript (TypeError) en el cliente que detiene la ejecución del hilo principal después de cerrar el drawer.
2. **¿Qué genera el TypeError?**
   En el commit anterior (`SES-050`), se introdujo la validación `!this.config.taxonomiaContext` en la línea 558 de `UI_FormSubmitter.client.js` para evitar una redirección.
3. **¿Por qué esa validación lanza un error?**
   Porque la clase `UI_FormSubmitter` no expone una propiedad `config`. En su lugar, el contexto de Taxonomía se inyecta a través del dataset del modal, por lo que intentar leer `this.config.taxonomiaContext` resulta en `Cannot read properties of undefined (reading 'taxonomiaContext')`.
4. **¿Qué consecuencia tiene este error?**
   Al lanzar la excepción, el código de la función se aborta abruptamente. Aunque el drawer alcanza a cerrarse (línea 553), nunca se emite el evento global `FORM::SUBMIT_SUCCESS` (línea 569).
5. **¿Y qué ocurre al no emitirse el evento?**
   El componente del Canvas / FormStepper (o cualquier otro oyente) nunca se entera de que el guardado fue exitoso, no se refrescan los datos del grafo, y el UI queda en un estado inconsistente, produciendo el pantallazo blanco (posiblemente por estar esperando un render o por fallos en cascada al cerrarse el Drawer sin el correspondiente ciclo de vida finalizado).

**Root cause**: Referencia a una variable indefinida (`this.config`) en la validación de contexto de taxonomía en `UI_FormSubmitter.client.js`, lo cual provoca un `TypeError` fatal que aborta la cadena de eventos del UI.

## 3. Fix & Prevent
- **Fix**: Reemplazar la condición errónea por la evaluación correcta del contexto, verificando el atributo dataset en el contenedor del modal: `const isTaxonomiaContext = (this.modal && this.modal.dataset && this.modal.dataset.taxonomiaContext);`, y luego usar esa variable en la comprobación.
- **Fix 2**: También debemos aplicar la corrección a la línea 447 que tiene `!this.modal`, ya que el modal puede existir pero si estamos en el canvas, no queremos redirigir. La condición debería basarse en el `isTaxonomiaContext`.
- **Prevention**: Validar siempre el origen de las propiedades en clases Legacy antes de invocarlas, y revisar si existen patrones de detección de contexto de taxonomía ya establecidos en la misma clase.
