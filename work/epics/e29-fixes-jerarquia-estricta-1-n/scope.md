# Epic Scope: E29 - Fixes Configuración Jerárquica Estricta 1:N

## Objective
Garantizar la integridad referencial y las validaciones de las relaciones estrictas 1:N (Padre-Hijo) en el sistema. El objetivo es corregir los comportamientos anómalos o deudas técnicas donde la configuración jerárquica no se respeta, ya sea en las asignaciones de base de datos, en la topología de `Schema_Engine`, o en la inyección de restricciones en la UI de creación/edición.

## Value
Previene la corrupción de datos, nudos topológicos (hijos huérfanos o con múltiples padres inválidos), y mejora la predictibilidad del Grafo M:N vs las ramas estrictas 1:N para el motor ABAC.

## In Scope
- Auditoría y resolución de fallos en relaciones Padre-Hijo exclusivas (1:N).
- Corrección de validadores al momento de guardar (DataEngine).
- Refuerzo visual o lógico de bloqueos en formularios cuando se viola el esquema 1:N.

## Out Scope
- Reescritura del motor completo M:N (fuera de alcance para este fix).
- Alteraciones masivas a las tablas de la base de datos (se debe manejar lógicamente).

## Expected Stories
- **S29.1 [PENDIENTE]:** Definir área afectada (Ej: backend payload vs constraints UI).
- **S29.2 [PENDIENTE]:** ...

## Definition of Done
- Los casos de prueba donde se podía engañar la relación 1:N son bloqueados exitosamente.
- No hay regresiones en las operaciones M:N del Grafo.
- La experiencia de usuario informa claramente de la restricción jerárquica alcanzada/violada.

## Progress Tracking
| Seq | ID    | Story | Size | Estado |
|-----|-------|-------|------|--------|
| 1   | S29.1 | Definición Técnica del Fix | S | Pendiente |
