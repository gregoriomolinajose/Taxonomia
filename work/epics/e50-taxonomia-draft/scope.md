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
| S50.1 | XS | Todo | - | - | Ajustes de Schema (Rol y Graph_Edges) |
| S50.2 | S | Todo | - | - | GraphUtils filter + Wizard payload intercept |
| S50.3 | S | Todo | - | - | UI hydration context flag |
| S50.4 | S | Todo | - | - | Botón de Aprobación Masiva |

## Risks
| Risk | L/I | Mitigation |
|------|:---:|------------|
| Aristas Huérfanas si la Taxonomía se rechaza | M/L | Crear un Hook on-delete en Taxonomía que elimine en cascada `DELETE FROM Sys_Graph_Edges WHERE contexto_id = X`. |
