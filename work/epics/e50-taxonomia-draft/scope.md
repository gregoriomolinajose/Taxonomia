# Epic Scope: E50 Taxonomía Draft & Role Architecture

## Objective
Evolucionar la entidad Taxonomía para que actúe como un "Borrador de Escenario" (Graph Snapshot). Implementar el almacenamiento de aristas en modo borrador mediante registros atómicos en el grafo central con `estado = 'Borrador'`, garantizando trazabilidad y escalabilidad sin romper la UI.

## Boundaries

**In Scope:**
- **Esquema:** Añadir el campo `especialidad` a `Sys_Roles` (TI, Negocio, Producto, Agilidad).
- **Esquema:** Añadir el campo `contexto_id` a `Sys_Graph_Edges` para vincular cualquier arista (ej. Unidad -> Portafolio) a su Taxonomía origen.
- **Motor Graph_Utils:** Modificar `JS_GraphUtils` para que filtre y oculte globalmente las aristas en "Borrador", pero permitir que el Wizard sí las consuma pasándole un flag.
- **Motor UI:** El Wizard guarda nativamente en la base de datos (con `estado=Borrador` y `contexto_id=ID_TAXONOMIA`), manteniendo la experiencia in-line y concurrente.
- **Backend/ETL (Approval):** Implementar la lógica del botón "Aprobar" (con protección ABAC) que actualice `UPDATE Sys_Graph_Edges SET estado = 'Activo' WHERE contexto_id = X`.
- **Geometría de Roles:** Durante la edición, el Wizard crea las aristas con la relación contextual: `Origen: Persona -> Destino: Taxonomia -> Tipo_Relacion: ID_DEL_ROL` y opcionalmente la arista global del catálogo `Persona -> Rol`.

**Out of Scope:**
- Visualización gráfica interactiva (nodos y flechas) (Movido a Parking Lot).
- Historial de cambios o Diff de "Borrador vs Versión Actual".

## Planned Stories
- **S50.1:** Esquema: Añadir `especialidad` a la entidad Rol y `contexto_id` a `Sys_Graph_Edges` en `Schema_Engine.js`.
- **S50.2:** Motor de Grafo: Modificar `JS_GraphUtils` para ignorar `estado='Borrador'` por defecto y ajustar el Wizard para que envíe `estado='Borrador'` y `contexto_id` en las creaciones.
- **S50.3:** Hidratación UI: Permitir que `TXSearchable` en el Wizard lea los borradores de su propio contexto.
- **S50.4:** Backend ETL de Aprobación: Crear servicio (ABAC admin) que cambia masivamente el estado de las aristas del contexto de Borrador a Activo.

## Done Criteria
- [ ] Roles pueden crearse con su `especialidad`.
- [ ] Las selecciones en el Wizard se guardan instantáneamente en BD sin afectar el sistema en vivo (gracias al `estado='Borrador'`).
- [ ] Varios usuarios pueden editar la misma taxonomía sin corromper el JSON (soporte de concurrencia).
- [ ] El Administrador puede "Aprobar" la Taxonomía, activando todo el árbol en la empresa.

## Progress Tracking
| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|:------:|:------:|:--------:|-------|
| S50.1 | XS | Done | 1h | - | Agregado select de especialidad y contexto_id |
| S50.2 | S | Done | 2.5h | - | GraphUtils filter + Wizard payload intercept (bug semántico resuelto) |
| S50.3 | S | Done | 1h | - | UI hydration context flag (H9/H6 QR fixes) |
| S50.4 | S | Done | 1h | - | Botón de Aprobación Masiva + O(1) Bulk Updates |

## Risks
| Risk | L/I | Mitigation |
|------|:---:|------------|
| Aristas Huérfanas si la Taxonomía se rechaza | M/L | Crear un Hook on-delete en Taxonomía que elimine en cascada `DELETE FROM Sys_Graph_Edges WHERE contexto_id = X`. |

## Implementation Plan

### 1. Story Sequence & Rationale
1. **S50.1: Schema Updates (Foundation)**
   * *Rationale (Dependency-driven):* Es el cimiento de la BD. Sin `contexto_id`, nada funciona.
   * *Dependencies:* Ninguna.
2. **S50.2: GraphUtils Filter & Wizard Payload (Walking Skeleton)**
   * *Rationale (Risk-first):* Debemos asegurar que el motor de grafos filtre los borradores ANTES de inyectar datos reales para no contaminar producción.
   * *Dependencies:* S50.1.
3. **S50.3: UI Hydration Context (Core MVP)**
   * *Rationale:* Termina la experiencia de edición permitiendo que `TXSearchable` lea los borradores en progreso.
   * *Dependencies:* S50.2.
4. **S50.4: Approval ETL (E2E Integration)**
   * *Rationale:* Cierra el flujo (PAT-E-539). Convierte los borradores en la "verdad oficial" de la empresa.
   * *Dependencies:* S50.1. (Puede desarrollarse en paralelo con S50.3).

### 2. Milestones
* **M1: Foundation & Walking Skeleton (S50.1, S50.2)**
  * *Target:* El sistema soporta aristas "Borrador" con contexto. El Wizard puede escribirlas sin romper/mostrar en otras partes del sistema.
* **M2: Full Edit Experience (S50.3)**
  * *Target:* El usuario puede cerrar y reabrir el Wizard y ver sus selecciones pre-cargadas (hidratación local).
* **M3: E2E Integration & Feature Complete (S50.4)**
  * *Target:* El Admin hace clic en "Aprobar", las aristas se vuelven globales y el catálogo de grafos se actualiza. Integración cruzada confirmada.

### 3. Parallel Opportunities
- S50.4 (Aprobación Backend) no depende de que el Wizard de UI (S50.3) esté terminado, solo requiere los esquemas de S50.1. Podría hacerse en paralelo si existiera más de un agente trabajando.
