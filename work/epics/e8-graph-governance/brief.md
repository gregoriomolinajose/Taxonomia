# Epic Brief: E8 - Graph Governance & Business Rules Engine

## Objective
Implementar un Motor de Reglas (Rules Engine) jerárquico que dicte asimétricamente el comportamiento del UI y el Backend mediante metadatos (`topologyRules`), evitando ciclos e inconsistencias en el Grafo (SCD-2).

## Hypothesis
Si estructuramos un motor de validación bidireccional leyendo un único esquema de configuración topológica (JERARQUICA_ESTRICTA, etc.), entonces erradicaremos los ciclos, desbordes funcionales (Max Depth) y colisiones de relaciones cruzadas en la base de datos temporal, medido por "0 corruptions/orphans" en Testing y logs.

## In Scope
- Schema_Engine.gs: Modelo de configuración base (`topologyRules`). Propagación segura.
- Engine_Graph.js: Middlewares matemáticos preventivos (DAG prevent cycles, depths, siblings).
- Engine_DB.js: Inyección de estrategias de desvinculación (Orphan/Grandparent) y Re-parenting.
- FormEngine_UI / UI_Components: Filtros de UI pasivos liderados por metadatos de configuración.

## Out of Scope
- Interfaz gráfica del editor del esquema mismo (se seguirá alterando por código en `Schema_Engine.gs`).
