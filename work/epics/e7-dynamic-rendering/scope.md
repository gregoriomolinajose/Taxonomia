# Epic E7: Dynamic UI Graph Rendering

## Objetivo Estratégico
El CPO ha requerido que el frontend (`FormEngine_UI.html`) sea capaz de renderizar componentes dinámicos amigables ("select_single" y "searchable_multi") con base en la naturaleza relacional de las topologías del grafo temporal (E6) presentes en el backend.

## Historias de Usuario
| Historia | Talla | Estado | Rama | PR | Notas |
|----------|-------|--------|------|----|-------|
| S7.1 - Dynamic UI Mapping | M | Done | merged | - | Schema metadata inyección y renderizado <ion-select> múltiple. |
| S7.2 - Payload Serialization | M | Done | merged | - | Regla OCP, JSON Parsing try-catch. |
| S7.3 - UI Hydration | S | Done | merged | - | Reconstrucción visual OCP-DRY de Graph Chips. |
| S7.4 - UX Refinements | S | Done | merged | - | Fast-Follow UI tweaks (Hierarchy, Dropdown CSS wrap). |
| S7.5 - Picker Modal Pattern | L | Done | merged | - | Refactor hacia Master-Detail View con Subgrid Modals OCP. |
| S7.6 - Subgrid UI Clone | M | Done | merged | - | Match de CSS/Layout contra Subgrid Clásico, test mocks fix. |

## Definition of Done
- Los subgrids relacionales se dibujan usando `uiComponent`.
- Formularios en frontend inyectan el contexto a través de `__APP_CACHE__[targetEntity]`.
