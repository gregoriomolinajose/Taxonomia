# Epic E7: Dynamic UI Graph Rendering

## Objetivo Estratégico
El CPO ha requerido que el frontend (`FormEngine_UI.html`) sea capaz de renderizar componentes dinámicos amigables ("select_single" y "searchable_multi") con base en la naturaleza relacional de las topologías del grafo temporal (E6) presentes en el backend.

## Historias de Usuario
| Historia | Talla | Estado | Rama | PR | Notas |
|----------|-------|--------|------|----|-------|
| S7.1 - Dynamic UI Mapping | M | Pending | story/s7.1/dynamic-form-rendering | - | Schema metadata inyección y renderizado <ion-select> múltiple. |

## Definition of Done
- Los subgrids relacionales se dibujan usando `uiComponent`.
- Formularios en frontend inyectan el contexto a través de `__APP_CACHE__[targetEntity]`.
