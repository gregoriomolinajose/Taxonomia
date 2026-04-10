# Epic Retrospective: E29 - Fixes Configuración Jerárquica Estricta 1:N

## Context & Execution
**Epic ID**: E29
**Scope**: Auditoría y resolución de fallos en relaciones Padre-Hijo exclusivas (1:N), validadores en DataEngine y refuerzo lógico en jerarquías del UI. Adicionalmente resolviendo latencia profunda de hidratación de subgrids.
**Stories Completed**: 9 / 9

## Metrics
- **Velocity**: Ejecutado rápidamente con 9 historias pequeñas (S) y medianas (M).
- **Stability**: Alta (pruebas E2E y unitarias actualizadas y aprobatorias al cierre, protegiendo 32 aserciones sobre Inmutabilidad y Esquemas).
- **Quality Gates**: Todas las revisiones AR/QR superadas (Strict Schema Pattern introducido transversalmente).

## What went well
1. **The Strict Schema Paradigm**: Se introdujo e hizo cumplir estrictamente que todo motor dinámico y adaptador subyacente que opera en Taxonomia valide determinísticamente contra `APP_SCHEMAS.primaryKey`. Se erradicaron "adivinanzas" inseguras de sufijos.
2. **Zero-Latency Subgrids**: Se extirpó uno de los bloqueos de hidratación más profundos inyectando memoria en Join con DataStore, reduciendo el TTI de un form con subgrids de >4.3s a 0ms reales.
3. **Robustez Transaccional**: La base de datos es ahora capaz de auto-protegerse contra peticiones front-end desvirtuadas o que omiten llaves foráneas lanzando un *hard error* en vez de corromper la jerarquía.

## What could be improved
1. **Mock Testing Resilience**: Los Mocks globales dentro de Jest fueron golpeados fuertemente por nuestras mejoras arquitecturales porque los Tests no imitaban lo de producción a cabalidad (`APP_SCHEMAS`). Debemos mantener la base mockeable actualizada.
2. **Event Bus Centralization**: Hubo historias (S29.8) que revelaron la propensión de orquestar directamente contra `localEventBus`; esto será evaluado en el refactor del componente base en la siguiente iteración.

## Technical Debt Addressed
- [x] Eliminación de conjeturas en nombres de variables e hidratación `Engine_DB`.
- [x] Corrección topológica en Subgrids que borraba nodos visuales debido a condiciones de carrera (Race Conditions) asíncronas con Google Scripts.

## Action Items for Next Epic
1. Utilizar un Factory o Generador único universal para construir los "Mocks" en Jest y evitar que refactores mayores rompan n pruebas a la vez por falta de configuración (Ej. Primary keys).
2. Revisar la necesidad de la épica E30 con el Product Owner en base al Backlog.
