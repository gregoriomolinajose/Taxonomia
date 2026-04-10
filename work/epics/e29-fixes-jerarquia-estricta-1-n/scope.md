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
- **S29.1 Prevención Vectorial:** Validación y parches de Graph Depth, Cycles y Collisions.
- **S29.2 Políticas ABAC Padre-Hijo:** Jerarquía estricta 1:N y controles transaccionales de Orfandad (Stealing).
- **S29.3 Destrucción e Historial:** Test-Driven sobre la estrategia transaccional ORPHAN y retención generacional SCD-2.
- **S29.4 Consistencia Front-End:** Bloqueo y adaptación restrictiva en el FormEngine para proteger relaciones en la UI.
- **S29.5 Estabilización Front-End:** Reactividad local sin latencia para el DataGrid.
- **S29.6 Error Colisión Topológica:** Corrección de la colisión de Hermanos al modificar registros en la jerarquía (PORT-DY415 ya existe como subordinado).

## Definition of Done
- Los casos de prueba unitarios comprueban consistentemente que la relación 1:N no puede ser engañada de ninguna forma a nivel servidor.
- No hay regresiones en las operaciones M:N estructurales de esquemas mixtos.
- La experiencia de usuario y UI restringe activamente relaciones imposibles.

## Progress Tracking
| Seq | ID    | Story | Size | Estado |
|-----|-------|-------|------|--------|
| 1   | S29.1 | Prevención Vectorial (Nivel Grafo) | M | Hecho |
| 2   | S29.2 | Políticas de Paternidad Estricta y Adopción | M | Hecho |
| 3   | S29.3 | Destrucción e Historial (Base de Datos) | M | Hecho |
| 4   | S29.4 | Consistencia Front-End (E2E) | S | Hecho |
| 5   | S29.5 | Estabilización Front-End | S | Hecho |
| 6   | S29.6 | Fix Colisión de Hermanos | S | Hecho |
| 7   | S29.7 | Relaciones no registradas en creación en cadena | S | Hecho |
| 8   | S29.8 | Auto-hidratación de Padres en inputs de Hijos | M | Pendiente |
