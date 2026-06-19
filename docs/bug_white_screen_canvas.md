# Reporte de Bug: Pantalla en Blanco al Vincular Rol en Canvas (Taxonomía)

## Descripción del Problema
**Síntoma:** Al estar dentro de la vista inmersiva del Canvas de Taxonomía (ej. `SelfService`), cuando el usuario intentaba asignar o vincular una Persona a un rol vacío (haciendo clic en el botón "Sin asignar" del Canvas), se abría el panel lateral (Drawer). Sin embargo, al guardar o cerrar dicho panel, la pantalla de la aplicación completa se ponía en blanco.

**Comportamiento Anómalo:** 
- Al desvincular un rol existente, el sistema funcionaba correctamente.
- Al vincular un rol nuevo, la interfaz colapsaba mostrando una pantalla vacía sin errores visibles de JavaScript en la consola, aunque el Network Log mostraba que la aplicación y sus recursos (como las imágenes de los avatares) seguían cargando o habían sido recargados.

## Causa Raíz (Root Cause Analysis)
El problema era causado por una lógica condicional incorrecta o desactualizada (posiblemente un remanente de una arquitectura de Web Components) dentro del manejador de eventos `onclick` de los "roles vacíos" (`.tax-role-empty`) generados en el archivo `UI_View_SwimlaneGrid.client.js`.

### El Flujo del Bug:
1. Al hacer clic en un rol vacío (placeholder "Sin asignar"), se activaba un manejador de eventos que ejecutaba `window.renderForm()`.
2. El tercer parámetro de `window.renderForm` era un `callback` diseñado para actualizar la interfaz al finalizar la interacción con el formulario.
3. Dentro de este `callback`, el código intentaba obtener la raíz del componente Canvas mediante: 
   ```javascript
   const root = document.querySelector('tax-swimlane-grid');
   ```
4. Dado que el sistema utiliza contenedores nativos de `div` (como `div.tax-swimlane-main-container`) y no elementos HTML personalizados tipo Web Components (`<tax-swimlane-grid>`), la variable `root` siempre se evaluaba como `null`.
5. Al no existir `root`, la cascada `if/else` llegaba al último caso, el cual ejecutaba:
   ```javascript
   else window.location.reload();
   ```
6. **El impacto crítico:** En el contexto de un iframe de **Google Apps Script**, ejecutar `window.location.reload()` provoca que la página se recargue perdiendo el `payload` original enviado por el servidor, lo que se traduce en un renderizado nulo (pantalla blanca).

### ¿Por qué desvincular sí funcionaba?
Cuando el usuario interactuaba con un nodo que ya tenía una persona vinculada (un Avatar), el clic no era capturado por `.tax-role-empty`, sino por la función de edición del nodo principal `_handleNodeEdit`.
En `_handleNodeEdit`, el `callback` de actualización del formulario estaba correctamente implementado utilizando una función flecha segura:
```javascript
window.renderForm(targetEntityToOpen, recordData, (res) => {
    this.refresh();
}, ...);
```
Esta función `this.refresh()` permitía repintar el Canvas silenciosamente sin forzar una recarga del DOM.

## Solución Implementada
Se modificó la lógica del callback de los roles vacíos (`.tax-role-empty`) en `UI_View_SwimlaneGrid.client.js` eliminando por completo las referencias a `querySelector('tax-swimlane-grid')` y a `window.location.reload()`.

El código corregido asegura que, al finalizar de vincular una persona, se utilice el método nativo del Grid para refrescarse, tal como lo hace el proceso de edición normal:

```javascript
// CÓDIGO CORREGIDO EN UI_View_SwimlaneGrid.client.js (línea ~1280)
if (recordData && typeof window.renderForm === 'function') {
    window.renderForm(entityName, recordData, (res) => {
        this.refresh(); // [BugFix] Reemplazo de location.reload() que rompía Apps Script
    }, { taxonomiaContext: this.taxonomiaId }).then(() => {
        if (window.FormEngine_Hydrator) {
            const container = window.currentFormDrawer || document.getElementById('app-container');
            window.FormEngine_Hydrator(container, recordData, entityName);
        }
    });
}
```

## Prevención Futura
Para evitar recurrencias de este tipo de bugs, se recomiendan las siguientes prácticas:
1. **Auditoría de Re-Renders:** Buscar en todo el código base (mediante `grep`) instancias adicionales de `window.location.reload()` o `location.reload()`. El uso de este comando debe estar estrictamente prohibido dentro de componentes incrustados en iframes de Apps Script a menos que sea en escenarios muy específicos de reinicio total.
2. **Uso Exclusivo de Referencias a Clases y IDs Correctos:** Al interactuar con el DOM, asegurarse de que los selectores (ej. `querySelector`) se dirijan a elementos reales de nuestra arquitectura (como `#wizard-fullscreen-zone` o clases definidas en `CSS_TaxonomyCanvas.html`).
