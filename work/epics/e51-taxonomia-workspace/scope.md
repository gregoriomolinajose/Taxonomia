# Epic 51: Taxonomía como Contexto de Trabajo (Workspace Mode)

## Objective
Evolucionar la entidad "Taxonomía" de un nodo estructural del organigrama hacia un "Espacio de Trabajo" (Workspace). Permitir que los líderes de portafolio modelen relaciones puras (ej. Rol -> Persona, Equipo -> Persona) dentro del contexto de una Taxonomía sin alterar de inmediato la arquitectura universal, brindando visibilidad y control descentralizado.

## Value
Desbloquea la adopción de la plataforma por parte del liderazgo al proporcionarles un entorno seguro y aislado donde pueden agrupar y visualizar dominios e interconexiones sin perder el control o propiedad de los datos fundacionales.

## Scope Boundaries

### In Scope (MUST/SHOULD)
*   **ADR-004:** Soporte para `workspaceMode` en el `Schema_Engine` (permite definir `fixedParentId` para campos relacionales).
*   **Escritura:** Actualizar `UI_FormSubmitter` para inyectar `fixedParentId` como `id_nodo_padre`, el valor como `id_nodo_hijo`, y usar el ID de la Taxonomía como `contexto_id`.
*   **Lectura:** Actualizar `RelationBuilder` y `TXSearchable` para hidratar sus estados iniciales buscando aristas por `contexto_id` en lugar de requerir que el `id_nodo_padre` sea la Taxonomía.
*   **Promoción masiva:** Asegurar que `Engine_DB.publishDraftContext` pueda promover estas aristas tripartitas sin depender de que la Taxonomía sea un nodo de la arista.

### Out of Scope (WONT)
*   Visualización consolidada de múltiples taxonomías (se pospone).
*   Permisos ABAC a nivel de arista individual (se mantiene a nivel de Taxonomía / Borrador masivo).

## Breakdown (Stories)

*   **S51.1:** [M] Schema Engine & Workspace Mode Definition (Añadir metadatos de configuración en el esquema de Taxonomía).
*   **S51.2:** [L] Form Submitter Refactor for Tripartite Edges (Modificar cómo se guardan los datos relacionales).
*   **S51.3:** [M] UI Components Hydration Refactor (Hacer que los buscadores puedan leer relaciones tripartitas).

## Done Criteria
1. El negocio puede asignar una Persona al Rol "Head of Technology" dentro de la pantalla de una Taxonomía.
2. En la base de datos `Sys_Graph_Edges`, se crea una arista donde el Padre es el Rol, el Hijo es la Persona, y la Taxonomía queda en `contexto_id`.
3. Al recargar la página, la UI recarga correctamente la Persona asignada leyendo el contexto.

## Risks & Mitigations
*   **Riesgo:** Romper la retrocompatibilidad con aristas bipartitas estándar (ej. `Portafolio -> Dominio`). 
    *   **Mitigación:** Encapsular toda la lógica nueva detrás del flag estricto `workspaceMode: true` en el esquema.

## Implementation Plan

### Story Sequence

| Seq | Story | Rationale | Dependencies |
|-----|-------|-----------|--------------|
| 1 | **S51.1: Schema Engine & Workspace Mode Definition** | Es el cimiento (Dependency-driven). Sin la metadata, los otros componentes no pueden operar de manera condicional. | Ninguna |
| 2 | **S51.2: Form Submitter Refactor for Tripartite Edges** | Necesitamos asegurar que podemos aislar y construir la arista tripartita (escritura) correctamente. (Walking skeleton). | S51.1 |
| 3 | **S51.3: UI Components Hydration Refactor** | Cerrar el ciclo habilitando la lectura de la base de datos para rellenar los controles pre-guardados en el UI. | S51.1, S51.2 |

### Milestones

- [x] **M1: Schema & Write (S51.1, S51.2)**
  - *Purpose:* Habilitar la definición semántica en el front y lograr grabar en BD de forma tripartita.
  - *Success Criteria:* Un envío de formulario de taxonomía con el rol de 'Head of Technology' graba correctamente `id_nodo_padre="ROLE-16"`, `id_nodo_hijo="PERS-1"`, `contexto_id="TAX-X"` en la tabla `Sys_Graph_Edges`.
- [x] **M2: Read & Complete (S51.3)**
  - *Purpose:* Habilitar la lectura e hidratación, logrando el E2E del Wizard.
  - *Success Criteria:* Al recargar un borrador previamente guardado, el UI reconoce correctamente las relaciones del contexto tripartito y pinta a la Persona como seleccionada.

### Tracking

| Story | Status | Assigned | Target |
|-------|--------|----------|--------|
| S51.1 | Done | Rai | - |
| S51.2 | Done | Rai | - |
| S51.3 | Done | Rai | - |
| S51.4 | Done | Rai | Debug: ETL Validation |
| S51.5 | Done | Rai | Debug: Stepper Hydration |
