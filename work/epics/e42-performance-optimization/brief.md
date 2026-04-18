# Epic E42: Optimización de Tiempos de Guardado (Performance)

## Hypothesis
Reducir los tiempos de guardado (actualmente entre 6s y 10s) al mínimo posible mejorará significativamente la experiencia de usuario y reducirá el riesgo de latencias de red y bloqueos de interfaz (UX).

## Success Metrics
- Tiempo de guardado (Network XHR) reducido por debajo de los 3s o al límite estrictamente necesario.
- Reducción en la cantidad de llamados `google.script.run` (N+1 queries) por cada acción de guardado.

## Appetite
- 1 Historia enfocada en diagnóstico de red y agrupación (batching) de queries.

## Rabbit Holes
- Optimización extrema estructural de GAS: El enfoque principal debe estar en evitar el dispatch masivo desde el frontend y preferir un solo payload masivo.
