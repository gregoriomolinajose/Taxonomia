# ADR 003: Atomic Draft Versioning via Graph Edge State

## Status
Accepted

## Context
El Wizard de Taxonomía permite agrupar relaciones organizacionales (Portafolios, Equipos, Liderazgos) en forma de un "Escenario" o borrador antes de su publicación oficial. 

Originalmente consideramos usar Event Sourcing (guardar todo el grafo como JSON dentro de la Taxonomía). Sin embargo, el análisis de arquitectura (H10 Pattern Duplication, H7 Abstraction Ratio) demostró que ese enfoque introducía alta fricción en UI, complejidad en sincronización de estado, límites físicos de tamaño (LONGTEXT), y riesgos de colisión por actualizaciones simultáneas.

## Decision
Utilizaremos **Atomic Draft Versioning**. Las relaciones en modo borrador se insertarán directamente en la tabla universal `Sys_Graph_Edges`. Para garantizar el aislamiento de este borrador del resto de la empresa, implementaremos dos mecanismos:

1. **Atributo `estado`:** Toda arista creada en el Wizard tendrá `estado = 'Borrador'`.
2. **Atributo `contexto_id`:** Se agrega un nuevo campo en `Sys_Graph_Edges` que guardará el ID de la Taxonomía a la que pertenece esta arista.

El singleton de memoria (`JS_GraphUtils`) excluirá por defecto cualquier arista en modo Borrador, protegiendo las consultas en producción.

## Consequences

**Positive:**
- Simplicidad Máxima (KISS): No hay necesidad de reescribir la hidratación en UI ni transformar JSON.
- Escalabilidad: Soporta grafos masivos y edición concurrente por múltiples usuarios sin bloqueos de fila.
- Aprobación O(1): Pasar de borrador a activo requiere un simple `UPDATE` en SQL en lugar de deserializar y procesar JSON.

**Negative:**
- Se requiere limpiar la base de datos si se rechaza un borrador (On-Delete Cascade).
- Aumenta el volumen total de filas en `Sys_Graph_Edges` por mantener versiones en borrador (completamente mitigado por la arquitectura O(1) in-memory de E49).
