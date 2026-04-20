# E42: Performance Optimization & Save Latency Reduction

**Objective:** Minimizar los tiempos de ejecución y espera de red durante el guardado de datos en el cliente, evitando múltiples peticiones simultáneas no optimizadas.

### In Scope
- Analizar y optimizar las peticiones XHR paralelas (DevTools) al disparar un guardado.
- Consolidar/agrupar peticiones al backend cuando sea seguro.
- Medir la diferencia (antes/después) en los tiempos de respuesta.

### Out of Scope
- Reescritura del Engine DB más allá de exponer o adaptar un entrypoint de guardado agrupado.

### Planned Stories
- **S42.1**: Optimización de tiempos de guardado.
- **S42.2**: Refactorización de UX en Dataview Cuadrícula:
  - Eliminar paginador físico y filtro de cantidad de registros para la vista en cuadrícula.
  - Implementar paginado infinito por scroll (lazy loading visual).
  - Sustituir el menú de tres puntos (kebab/ellipsis) en las tarjetas de la cuadrícula por un botón directo de eliminar (icono 'x').

### Done Criteria
- [ ] Tiempo de guardado medido en DevTools muestra una reducción sustancial (e.g. desde 10s hasta <3s o lo mínimo posible).
- [ ] No existen peticiones individuales innecesarias.
