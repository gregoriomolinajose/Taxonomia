# Epic E43: Grid Card Redesign

## Hypothesis
Mejorar el diseño de las tarjetas (cards) en la vista "Grid" incrementará la densidad de información útil, facilitando la comprensión de las relaciones jerárquicas (padre/hijo) y proporcionando acceso rápido a acciones clave sin necesidad de abrir el detalle del registro.

## Success Metrics
- Implementación de un badge circular dinámico basado en las entidades.
- Visualización jerárquica clara: Indicadores visuales para Entity Parent (Single Select) y Entity Children count (Multi Select).
- Incorporación exitosa de un menú contextual (3 puntos) funcional para eliminar registros.

## Appetite
- 1 a 2 Historias enfocadas en la modificación del template UI de los Cards en la cuadrícula (DataGrid).

## Rabbit Holes
- Cargas asíncronas pesadas (N+1 queries) para contar hijos. La información de las relaciones (contadores e IDS padre) debe ser extraída preferiblemente de la información pre-cargada o consolidada sin degradar la performance por la que se luchó en la E42.
