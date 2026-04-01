# Architecture Design: Epic 16 (Blueprint V4)

## Gemba (Current State)
La aplicación Taxonomia actualmente procesa el renderizado masivo y orquestaciones mediante archivos densos ("God Classes"). Ejemplos clave:
- `API_Universal.gs`: 525 LOC. Procesa endpoints heterogéneos (save, read, tree-fetch, lookups) dentro del mismo archivo procedural.
- `FormBuilder_Inputs.html`: 622 LOC. Un switch estático if-else masivo decide cada componente DOM que se incrusta.
- `DataView_UI.html`: 759 LOC. El componente que inicializa la tabla es también quien retiene su estado, su barra de búsqueda interactiva, y su sistema limitador de páginas por tajos (`slice`).

## Target Architecture (To-Be)
El propósito de V4 es alcanzar la *Pureza Funcional Visual* acatando "Data Driven Rendering".
- Los Meta-Datos gobiernan qué ve y hace el SPA. La app no pregunta "Qué ícono lleva `Dominio`", el JSON inyectado le responde `"iconName": "globe-outline"`.
- Los componentes delegativos (Micro-Modules) solo hacen 1 tarea y la hacen excepcionalmente bien.

## Key Contracts
1. **Schema SSOT:**
   - La propiedad `window.ENTITY_META` muere. Todo se absorberá dentro de `APP_SCHEMAS` (específicamente la recién creada interfaz de metadata en Google Apps Script).
2. **Event-Driven UI Filtering:**
   - El Grid Data ya no filtrará localmente nada usando `keyup` directo en DOM. La SearchBar publicará el nuevo término buscado al App Event Bus y un controlador intermedio entregará únicamente la matriz mutada al `UI_DataGrid` en forma pasiva (`grid.repaint(rows)`).
3. **Action Dispatcher:**
   - `API_Universal` expone un `Router.dispatch({ action, payload })` a la vista (usando un patrón Comando/Estrategia Server-Side).
