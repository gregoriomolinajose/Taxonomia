# Análisis de Bug: Pantalla Blanca tras Drawer

## Triage
- **Tier**: M (Medium)
- **Method**: 5 Whys & Gemba (Inspection)

## 1. Define the Problem (Genchi Genbutsu)
**WHAT**: La pantalla del Wizard (Lienzo) desaparece, mostrando una aparente "pantalla blanca".
**WHEN**: Al terminar de vincular a una persona al portafolio y guardar/cerrar el drawer principal.
**WHERE**: Interacción entre `UI_FormSubmitter.client.js` y `UI_Router.client.js`.
**EXPECTED**: Tras el guardado (tanto explícito por el botón como implícito por auto-guardado en cierre), el drawer debe desaparecer y el lienzo del Wizard en background debe actualizarse reflejando los cambios, sin forzar una navegación de salida.

## 2. Root Cause Analysis (5 Whys)
1. **¿Por qué la pantalla se pone en blanco o desaparece el Wizard?**
   Porque la interfaz redirecciona automáticamente a la vista `dataview` del Portafolio (`NAV::CHANGE {viewType: 'dataview'}`), y como el estado anterior era un Wizard Fullscreen, las barras de navegación (header y sidebar) se encuentran invisibles/desactivadas. El contenedor principal se limpia (`window.DOM.clear(container)`), eliminando el lienzo del DOM.
2. **¿Por qué se gatilla esta redirección?**
   Porque en `UI_FormSubmitter.client.js`, el hook `_performSuccessCleanup` evalúa si se trata del último elemento activo en la pila (`window.DrawerStackController.getDepth() === 0`). Al ser cierto, asume que el formulario se abrió desde una vista de datos convencional y navega de regreso a `dataview`.
3. **¿Por qué asume eso si estábamos en el Wizard?**
   Porque faltaba un control de verificación contextual. La instancia de `UI_FormSubmitter` poseía un objeto `config.taxonomiaContext` que indicaba su origen desde el Lienzo (Wizard), pero este atributo no estaba siendo considerado en la regla de enrutamiento post-guardado inmediato.

**Root cause**: Omisión de regla condicional arquitectónica en la lógica de navegación post-guardado (`_performSuccessCleanup`), destruyendo el nodo del componente padre que alojaba el lienzo.

## 3. Fix & Prevent
- **Fix (Implementado)**: Se modificó la regla `if` en la línea 557 de `UI_FormSubmitter.client.js` inyectando `!this.config.taxonomiaContext`. Esto detiene la redirección cuando el drawer fue instanciado por la taxonomía.
- **Regression test**: Pruebas manuales vía script o test e2e de abrir y cerrar modales desde el Canvas asegurando que no se dispare `NAV::CHANGE`.
- **Prevention**: Documentado en el Graph o como un ADR implícito para los flujos de "Save On Close" en interfaces MDI (Multiple Document Interface).
