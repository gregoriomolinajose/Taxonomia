# Epic E54: Habilitar Filtros en Todas las Entidades

## Hypothesis
Si implementamos un sistema de filtrado global estandarizado (similar al de Jira), los usuarios podrán encontrar y organizar la información de cualquier entidad más rápidamente, mejorando la usabilidad y la eficiencia en la gestión del portafolio.

## Success Metrics
- Los usuarios pueden aplicar y remover múltiples filtros por campo en cualquier vista de entidad.
- La interfaz de filtrado es consistente (drawer lateral o popover) a través de todo el sistema.
- El rendimiento de las consultas y renderizado no se degrada significativamente al aplicar filtros complejos.

## Appetite
1-2 semanas.

## Rabbit Holes
- Tratar de filtrar campos relacionales profundos (N-niveles) que requieran queries complejos y lentos en lugar de filtrar sobre la data ya en memoria o un nivel de profundidad.
- Sobrecargar la interfaz con demasiados campos por defecto en lugar de permitir seleccionar los campos de búsqueda.
