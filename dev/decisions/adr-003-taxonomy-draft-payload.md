# ADR 003: Draft Payload via JSON Event Sourcing for Taxonomy

## Status
Accepted

## Context
El Wizard de Taxonomía permite agrupar relaciones organizacionales (Portafolios, Equipos, Liderazgos). Originalmente, cada paso del wizard inyectaba estas aristas directamente en la tabla central de grafos temporales (`Sys_Graph_Edges`). Esto creaba problemas de integridad: si un borrador de taxonomía quedaba a la mitad, el grafo global se contaminaba con aristas no certificadas, afectando las consultas en producción y confundiendo a los componentes que dependían de `JS_GraphUtils`.

Además, si múltiples usuarios creaban borradores paralelos de la organización, el grafo global perdía trazabilidad sobre a qué "escenario" pertenecía cada arista.

## Decision
Almacenaremos temporalmente todo el grafo construido por el Wizard de Taxonomía como un documento JSON dentro de una columna (`aristas_borrador`) en la propia entidad `Taxonomía`. 

Durante el flujo del wizard, todas las lecturas y escrituras de las relaciones M:N o jerárquicas se realizarán contra este estado virtual (Event Sourcing). Únicamente cuando un administrador haga clic en "Aprobar", se disparará un ETL sincrónico que decodificará el JSON, validará la existencia física de los nodos origen/destino, e insertará las aristas atómicas oficiales en `Sys_Graph_Edges`.

## Consequences

**Positive:**
- Aislamiento total: El grafo global (`Sys_Graph_Edges`) solo contendrá la "verdad oficial" de la organización, nunca borradores huérfanos.
- Rendimiento: No necesitamos ensuciar `JS_GraphUtils` con bucles O(N) para filtrar aristas "Borrador" en toda la plataforma.
- Soporte para Escenarios: Podemos tener múltiples simulaciones organizacionales activas simultáneamente.

**Negative:**
- Los componentes de UI en el Wizard (`TXSearchable`, subgrids) ahora deberán programarse para leer contextualmente desde un origen dual (la BD para datos globales, y el Payload local para las selecciones del draft).
- Riesgo de Stale Data: Si un nodo (ej. Portafolio) es eliminado de la BD principal mientras el borrador de Taxonomía sigue abierto (sin aprobar), el JSON tendrá un ID huérfano. El motor de aprobación debe ser tolerante a fallos y validar cada inserción.
