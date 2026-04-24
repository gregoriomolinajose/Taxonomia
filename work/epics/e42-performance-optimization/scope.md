# E42: Performance Optimization & Save Latency Reduction

**Objective:** Minimizar los tiempos de ejecución y espera de red durante el guardado de datos en el cliente, evitando múltiples peticiones simultáneas no optimizadas.

### In Scope
- Analizar y optimizar las peticiones XHR paralelas (DevTools) al disparar un guardado.
- Consolidar/agrupar peticiones al backend cuando sea seguro.
- Medir la diferencia (antes/después) en los tiempos de respuesta.

### Out of Scope
- Reescritura del Engine DB más allá de exponer o adaptar un entrypoint de guardado agrupado.

### Planned Stories
- [x] **S42.1**: Optimización de tiempos de guardado.
- [x] **S42.2**: Refactorización de UX en Dataview Cuadrícula:
  - Eliminar paginador físico y filtro de cantidad de registros para la vista en cuadrícula.
  - Implementar paginado infinito por scroll (lazy loading visual).
  - Sustituir el menú de tres puntos (kebab/ellipsis) en las tarjetas de la cuadrícula por un botón directo de eliminar (icono 'x').
- [x] **S42.3**: Refinamiento Premium de UX en Dataview Cuadrícula:
  - Ancho dinámico y alineación al grid.
  - Back-to-top FAB dinámico.
  - Layout compacto del Lexical ID.
  - Títulos formateados de Nodos (truncados) y Footer iconográfico compacto.

### Done Criteria
- [x] Tiempo de guardado medido en DevTools muestra una reducción sustancial (e.g. desde 10s hasta <3s o lo mínimo posible).
- [x] No existen peticiones individuales innecesarias.
