# Epic E9: Refactor UI MDM - Scope

## Objective
Migrar y refactorizar componentes críticos de la Interfaz de Usuario para converger con la arquitectura de diseño MDM en capas (ThemeManager nativo, eliminación de variables hardcoded), mientras se cierran pendientes de memoria provenientes de la Epic E8 (LIFO Flush y Garbage Collection).

## In Scope
- Desacoplar estilos heredados hacia UI de alto rendimiento.
- Implementar **ThemeManager $O(1)$** impulsado por Design Tokens en JSON.
- Forzar la Gobernanza estricta de Z-Index (`10`, `50`, `100`, `9999`) según la Regla UI §14.2.
- Erradicación del hardcoding visual (`style=` / `color=`) en vistas transaccionales.
- Implementar guardas de mitigación contra Memory Leaks del stack de UI (Max Depth Guard).
- Vaciar el parking lot heredado de E8.

## Out of Scope
- Funcionalidades TDAG del Backend completadas en Epic E8.
- Migraciones masivas de la lógica en Apps Script Server (El backend no se modifica en esta Epic).

## Planned Stories
- **S9.1**: Arquitectura Base y ThemeManager (Pipeline JSON Tokens, White Label).
- **S9.2**: Gobernanza y Protección del Modal Stack (Z-Index Limits, Garbage Collection tests).
- **S9.3**: Modularización DRY del FormEngine (Events_Controller, purga de HTML inyectado iterativamente).
- **S9.4**: Estabilización Zero-Trust del Motor Topológico (Filtro defensivo O(1) en `Topology_Strategies`).

## Done Criteria
- [ ] Construcción del JSON Parser para ThemeManager (flatten Kebab-case).
- [ ] Todos los flujos transaccionales (DataView, FormEngine) han sido sanitizados sin `style="..."`.
- [ ] La topología Z-Index está documentada y forzada en `CSS_App.html`.
- [ ] El parking lot de E8 ha sido formalmente transferido o completado.
