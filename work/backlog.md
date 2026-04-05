# Backlog

## Epic E5: Grafo Temporal Multi-Estructural
**Estado:** ✅ Complete

## Epic E6: Arquitectura Escalable de Grafos (Engine_Graph)
**Estado:** 🏃 In Progress

**Origen:** Recomendaciones derivadas de la revisión de Arquitectura (Epic E5).

**Objetivo:** Consolidar e independizar el ecosistema del Grafo Temporal DAG de las operaciones transaccionales genéricas y hardcodeadas para facilitar expansiones N:M (Ej. Capacidad/Portafolio).

### Tareas Recomendadas (Historias tentativas)
1. **Dinámica SCD-2 Config-Driven (S6.1):** 
   - *Problema:* `orchestrateNestedSave` usa hardcoding `if (targetEntity === "Relacion_Dominios")` para insertar metadata temporal (`valido_hasta`, `es_version_actual`).
   - *Solución:* Extender el `Schema_Engine.gs` para admitir `isTemporalGraph: true` como parámetro de esquema. `Engine_DB.js` debe leer este flag genéricamente, erradicando el acoplamiento directo a tablas específicas.

2. **Extracción a Service Class (S6.2):**
   - *Problema:* Shotgun Surgery en H16. Modificar el grafo toca al mismo tiempo lógica CORE (Engine_DB), Handlers (JS_Core) y Vistas.
   - *Solución:* Encapsular toda mutación de aristas y cascade flattening en un módulo Singleton purificado llamado `Engine_Graph.js`. `Engine_DB.js` solo será un delegador cuando intercepte este flag.

## Epic E23: Fortalecimiento y Aseguramiento de Capa Lógica (Controladores Core)
**Estado:** 🏃 In Progress

### Deuda Técnica Registrada (Pendiente de Abordar en Próximas Historias)
1. **Desacoplamiento de Constantes Mágicas (Hardcoding):**
   - *Problema:* `Math_Engine.js` y `Engine_DB.js` contienen un *hardcoding* fuerte de la constante `var PRIMARY_RELATION_TYPE = "Militar_Directa";`. Esto rompe el principio Open/Closed. Si `Schema_Engine` crea nuevas topologías cruzadas genéricas, el sistema las ignora o las aplasta indiscriminadamente.
   - *Acción Requerida:* Eliminar la constante hardcodeada y hacer que `Schema_Engine.gs` sea el que defina esto de forma completamente agnóstica. Añadir explícitamente a las `topologyRules` de cada Entidad: `edgeIdentifier: "primaria"` (o similar), para que tanto la base de datos y la UI confíen en esta regla sin atarse a textos semánticos legacy.

2. **Duplicación de Reglas Topológicas Activas (SCD-2 Repetido):**
   - *Problema:* La asunción de qué hace que una arista esté "Viva" o "Muerta" se encuentra duplicada. `Engine_Graph.js` utiliza el flag `es_version_actual = false` para inactivar, mientras que `Math_Engine.js` repite esta misma verificación manual en formato Frontend `e.es_version_actual !== false`.
   - *Acción Requerida:* Abstraer el motor de filtrado del estado temporal (SCD-2 filter). Lo ideal es que el Backend (API) limpie la `cacheObject` en un *Edge Pool* curado ANTES de entregar el Payload al cliente, evitando que el Frontend (`Math_Engine`) deba preocuparse por filtrar historiales muertos de SCD-2.
