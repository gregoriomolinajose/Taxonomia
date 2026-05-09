# Epic Scope: E50 Taxonomía Draft & Role Architecture

## Objective
Evolucionar la entidad Taxonomía para que actúe como un "Borrador de Escenario" (Graph Snapshot). Implementar el almacenamiento asilado de aristas en modo borrador mediante un JSON encapsulado, y resolver contextualmente la asignación de roles sin impactar el grafo global hasta la aprobación de un Administrador.

## Boundaries

**In Scope:**
- **Esquema:** Añadir el campo `especialidad` a `Sys_Roles` (TI, Negocio, Producto, Agilidad).
- **Esquema:** Añadir el campo de payload `aristas_borrador` (JSON) y estado a `Taxonomía`.
- **Motor UI:** Adaptar el FormStepper de la Taxonomía para guardar sus selecciones localmente y enviarlas al payload JSON en la base de datos (Borrador).
- **Hidratación UI:** Ajustar `TXSearchable` o el motor del Wizard para que lea las pre-selecciones del JSON de la Taxonomía en lugar de hacer fetch directo a `Sys_Graph_Edges`.
- **Backend/ETL (Approval):** Implementar la lógica del botón "Aprobar" (con protección ABAC) que lea el JSON de `aristas_borrador` y ejecute las inserciones reales en `Sys_Graph_Edges`.
- **Geometría de Roles:** Durante la aprobación, las aristas de roles se traducirán a una relación directa: `Origen: Persona -> Destino: Taxonomia_Cobranza -> Tipo_Relacion: ID_DEL_ROL` y opcionalmente la arista global del catálogo `Persona -> Rol`.

**Out of Scope:**
- Visualización gráfica (nodos y flechas) interactiva del borrador. (De momento, solo usamos listas/subgrids estándar).
- Historial de cambios o Diff de "Borrador vs Versión Actual" (Se pospone para otra historia/épica).

## Planned Stories
- **S50.1:** Añadir atributo `especialidad` a la entidad Rol en `Schema_Engine.js`.
- **S50.2:** Habilitar el campo `aristas_borrador` (JSON) en la Taxonomía y modificar la recolección de datos del Wizard para agrupar las asociaciones en lugar de impactar `Sys_Graph_Edges`.
- **S50.3:** Hidratación de UI en modo Borrador: Hacer que los `TXSearchable` del Wizard muestren selecciones previas leyendo del Payload JSON en memoria.
- **S50.4:** Backend ETL de Aprobación: Crear el servicio/función (ABAC admin) que desempaqueta el JSON y crea las aristas duales (Contexto + Catálogo) en `Sys_Graph_Edges`.

## Done Criteria
- [ ] Roles pueden crearse con su `especialidad`.
- [ ] El Wizard de Taxonomía permite navegar y seleccionar personas para roles específicos (ej. Head de TI).
- [ ] Cerrar y re-abrir el Wizard preserva el borrador intacto leyendo del JSON de la Taxonomía, sin que el resto del sistema vea esas relaciones.
- [ ] Un Administrador puede darle "Aprobar", lo que genera las aristas reales y finaliza el proceso.

## Progress Tracking
| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|:------:|:------:|:--------:|-------|
| S50.1 | XS | Todo | - | - | Agregar select de especialidad |
| S50.2 | M | Todo | - | - | Modificar recolección del FormStepper a Payload JSON |
| S50.3 | L | Todo | - | - | Hidratación del TXSearchable desde Local State / JSON |
| S50.4 | M | Todo | - | - | Función ETL de aprobación final (Borrador a Activo) |

## Risks
| Risk | L/I | Mitigation |
|------|:---:|------------|
| Nodos Fantasma en el JSON (Stale Data) | M/H | Validar existencia de los IDs referenciados durante el proceso ETL de aprobación. Ignorar aristas rotas silenciosamente o lanzar error. |
| Fricción en TXSearchable | H/M | `TXSearchable` depende fuertemente de `Graph_Utils`. Requerirá inyectarle temporalmente una propiedad `mockGraph` o sobrescribir su ciclo de vida para que use el JSON. |
