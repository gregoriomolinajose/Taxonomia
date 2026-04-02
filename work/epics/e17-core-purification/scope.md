# Epic 17: Core Initialization Purification

## Description
Desmantelar el monolítico `JS_Core.html` (Bootstrapper maestro) para adherir estrictamente a los estándares del Blueprint V4 (Separación de Responsabilidades y FrontEnd Stateless). Fragmentaremos su lógica entrelazada hacia submódulos puros (Matemáticas, Tematización, y Seguridad).

## Boundaries

### In Scope
- Extraer `Cache_Utils.buildEChartsTreemapData()` hacia un motor isomórfico (`Math_Engine.js` o similar).
- Separar la inyección CSS global y la reactividad oscura/clara (`ThemeManager`) a su propio componente.
- Desacoplar la barrera protectora de `AuthManager` asegurando que no muten ni rompan estructuras HTML rígidas, usando plantillaje seguro o estado nativo.
- Reducir `JS_Core.html` localmente a un despachador "tonto" impulsado por `DOMContentLoaded` e `init()`.

### Out of Scope
- Reescritura del `DesignKit_UI.html` (Monolito CSS restante) → Para Epic 18.
- Modificación del DataGrid.

## Stories

1. **[x] S17.1: Treemap Logic Extraction (S) ✓**
   - *Description:* Mudar el generador gráfico O(N) fuera del framework SPA principal.
2. **[x] S17.2: Theme_Engine Segregation (S) ✓**
   - *Description:* Desacoplar todo el manejo del Tema y Storage.
3. **[x] S17.3: Auth Layer Decoupling (M) ✓**
   - *Description:* Remover las construcciones agresivas (ej. `app-container.innerHTML = "<div>Error</div>"`) y usar componentes. Inyectar `Auth_UI` en el pipeline.
4. **[x] S17.4: App Bootstrapper Assembly (S) ✓**
   - *Description:* Ruteo y limpieza general en `JS_Core.html`.

## Definition of Done
- El compilador Node.js (`deploy.js`) transpile todos los submódulos.
- El tiempo de inicialización de la pantalla al cargar Taxonomia fluya sin errores referenciales.
- `JS_Core.html` mida menos de 100 líneas LOC y NO contenga lógica matemática ni generadores de vistas HTML.
