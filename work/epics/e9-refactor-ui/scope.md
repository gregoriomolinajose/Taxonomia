# Epic E9: Refactor UI MDM - Scope

## Objective
Migrar y refactorizar componentes críticos de la Interfaz de Usuario para converger con la arquitectura de diseño MDM en capas (ThemeManager nativo, eliminación de variables hardcoded), mientras se cierran pendientes de memoria provenientes de la Epic E8 (LIFO Flush y Garbage Collection).

## In Scope
- Desacoplar estilos heredados hacia `index.css` via el Design System y `ThemeManager`.
- Implementación de guardas de mitigación contra Memory Leaks del stack de UI (LIFO).
- Finalizar migraciones de deuda técnica especificadas en el dev/parking-lot.md de E8.

## Out of Scope
- Funcionalidades TDAG del Backend (DB Engine/Graph) completadas en Epic E8.
- Migraciones masivas de la lógica en Cloud (Apps Script Server).

## Planned Stories
- *(Serán definidas formalmente durante el workflow `/rai-epic-design`)*

## Done Criteria
- [ ] Los flujos de UI no presentan estilos 'hardcoded'.
- [ ] El framework reacciona reactivamente a los cambios de Modo Oscuro/Claro nativos sin parpadeos.
- [ ] El parking lot de E8 ha sido vaciado.
