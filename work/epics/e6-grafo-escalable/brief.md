# Problem Brief: E6 - Arquitectura Escalable de Grafos

## Hypothesis
Extraer la interceptación de llaves M:N SCD-2 hacia un Service Layer (`Engine_Graph.js`) y usar una bandera Config-Driven en `Schema_Engine.gs` simplificará drásticamente la creación de taxonomías de red en el futuro, estabilizando a `Engine_DB.js` como un motor 100% agnóstico.

## Success Metrics
- 0 menciones explícitas de tablas como "Relacion_Dominios" en la lógica transaccional CORE.
- Soporte inmediato y sin código para nuevos subgrids M:N simplemente declarando `isTemporalGraph: true` en el esquema.

## Appetite
- 1 Sprint (S6.1 y S6.2).

## Rabbit Holes
- Tratar de refactorizar la visualización UI (el Scope debe centrarse en Backend Isolation).
