# Epic 25 Scope: Factory Deduplication & Namespace Hardening

## Objective
Resolver la deuda técnica introducida indirectamente durante la E24 (Frontend God Objects Decomposition). Consolidar el patrón de Factoría de Componentes (UI_Factory) garantizando que no existan módulos superpuestos o duplicados en el DOM Virtual y centralizando el patrón de inicialización.

## In Scope
- Eliminar duplicación explícita detectada de `global.UI_Factory.buildSearchableMulti`.
- Establecer un estándar robusto para inyecciones de *Micro-Frontends* en `Index.html` resolviendo los problemas de acoplamiento de dirección (Coupling Direction - H14).
- Mapeo y deduplicación de toda interfaz constructora de `<ion-*>` (e.g., Modales In-Line vs Standalone Modals).

## Out of Scope
- Migración de dependencias (Ej. No cambiar Ionic Frontend por otra librería).
- Edición de Base de Datos.

## Planned Stories (S25.x)
1. **[ ] S25.1:** Resolver duplicidades en Components Complexes y purgar el arbol sobrante de `global.UI_Factory`.
2. **[ ] S25.2:** Consolidación de `Global_UI_Factory` como un módulo independiente (.client.js puro si es posible, o standalone HTML transpilable).

## Done Criteria
`Index.html` ya no alberga componentes que definan bajo la misma firma en `global.UI_Factory`. DRY al 100% en la capa visual.
