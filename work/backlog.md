# Backlog

## Epic E5: Grafo Temporal Multi-Estructural
**Estado:** ✅ Complete

## Epic E6: Arquitectura Escalable de Grafos (Engine_Graph)

**Origen:** Recomendaciones derivadas de la revisión de Arquitectura (Epic E5).

**Objetivo:** Consolidar e independizar el ecosistema del Grafo Temporal DAG de las operaciones transaccionales genéricas y hardcodeadas para facilitar expansiones N:M (Ej. Capacidad/Portafolio).

### Tareas Recomendadas (Historias tentativas)
1. **Dinámica SCD-2 Config-Driven (S6.1):** 
   - *Problema:* `orchestrateNestedSave` usa hardcoding `if (targetEntity === "Relacion_Dominios")` para insertar metadata temporal (`valido_hasta`, `es_version_actual`).
   - *Solución:* Extender el `Schema_Engine.gs` para admitir `isTemporalGraph: true` como parámetro de esquema. `Engine_DB.js` debe leer este flag genéricamente, erradicando el acoplamiento directo a tablas específicas.

2. **Extracción a Service Class (S6.2):**
   - *Problema:* Shotgun Surgery en H16. Modificar el grafo toca al mismo tiempo lógica CORE (Engine_DB), Handlers (JS_Core) y Vistas.
   - *Solución:* Encapsular toda mutación de aristas y cascade flattening en un módulo Singleton purificado llamado `Engine_Graph.js`. `Engine_DB.js` solo será un delegador cuando intercepte este flag.
