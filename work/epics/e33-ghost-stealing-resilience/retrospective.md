# Retrospective: Epic E33 (Ghost Stealing Resilience Bug Bash)

## What we promised
Resolver radicalmente el "Ghost Stealing Sandbox" que corrompía las relaciones SCD-2 jerárquicas en nodos padre cuando se actualizaba un conjunto de hijos.

## What we delivered
- `FormRenderer_UI.client.js` fue fortificado para buscar de forma JIT en el caché de los grafos los lazos faltantes antes del render, pre-hidratando selectores mudos.
- `Engine_DB.js` se toleró criptográficamente para permitir emparejamiento Top-Down de `id_registro` universal además de la llave específica `pkField`.
- `ghost-stealing.spec.js` automatizó la prueba defensiva validando subgrids editadas desde base nula.

## Metrics
- **Stories Planned**: 3
- **Stories Delivered**: 3
- **Test Coverage Impact**: Test E2E agregado cubriendo flujos transaccionales críticos.
- **Rollbacks**: 0. En ambiente productivo todo fue liso y llano (Dev 1.2.7 -> Prod 1.2.8).

## Keep Doing
- Interrogar directamente el origen del DataStore y la telemetría del FrontEnd en lugar de asumir debilidades del Engine_DB. Un sistema distribuido se debugea de afuera hacia adentro.

## Learnings
- **Pattern discovered**: Las relaciones topológicas dependientes de validación temporal (`isTemporalGraph: true`) necesitan resolverse localmente antes de reinyectarse a la forma principal. Si no se inyectan a `.value` explícito en los *Dumb Inputs*, el Submitter asumirá vaciado (`""`) causando *Explicit Removal / Orphan Culling*.

## Next Steps
- Considerar despliegues automatizados directos obviando App Scripts limitación manual, y diseñar E34.
