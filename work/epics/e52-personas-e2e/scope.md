# Epic E52: Soporte E2E para Entidad Personas (CRUD, ETL, Frontend)

## Objective
Habilitar el soporte "End-to-End" (E2E) para la entidad `Persona`, permitiendo a los usuarios gestionar empleados y perfiles humanos directamente en la aplicación mediante un ciclo completo de CRUD, importación masiva (ETL) y visualización adaptada en el DataGrid.

## Value
La gestión de "Personas" es el pilar fundacional para el diseño organizacional. Al tener perfiles humanos en el sistema, podemos comenzar a asignar roles (`Cargo -> Persona`) y construir mapas organizacionales piramidales.

## Scope Boundaries

### In Scope (MUST/SHOULD)
*   **Definición de Esquema:** Creación del metadata map para `Persona` en `Schema_Engine.js` con soporte para campos como nombre, email, avatar, fecha de ingreso.
*   **Frontend (UI):** Soporte en `UI_DataGrid` para mostrar avatares e información clave. Integración en `FormRenderer_UI` para edición.
*   **ETL Bulk Upload:** Capacidad de cargar listas de Personas masivamente vía Google Sheets/CSV.
*   **Directorio AD (Mock/Stub):** Soporte inicial para perfiles de imagen.

### Out of Scope (WONT)
*   Integración técnica síncrona bidireccional con Active Directory (solo lectura/bulk).
*   Matrices de habilidades (Skill matrices) complejas; eso pertenecerá a un módulo de Talento.

## Breakdown (Stories)
*   **S52.1: Schema Definition & Backend Registration**
    *   *Descripción:* Definir el esquema de `Persona` y registrar la tabla en DB/Caché.
    *   *Size:* M
*   **S52.2: UI Views & Form Configuration**
    *   *Descripción:* Implementar el renderizado visual de Personas en el DataGrid (incluyendo componentización del Avatar) y validación del formulario.
    *   *Size:* M
*   **S52.3: ETL Bulk Upload Configuration**
    *   *Descripción:* Mapear los encabezados y la lógica de ingesta en el ETL para soportar cargas masivas de empleados.
    *   *Size:* S
*   **S52.4: Validation & Relational Setup**
    *   *Descripción:* Verificaciones E2E y pruebas de integridad relacional (Preparación para asignación Personas <-> Roles).
    *   *Size:* S

## Done Criteria
1. El usuario puede ver una pestaña "Personas" en el menú principal.
2. Puede crear, editar y eliminar Personas usando el FormBuilder estándar.
3. Puede subir un CSV de empleados y ver los datos en el Grid sin errores.

## Risks & Mitigations
*   **Riesgo:** Inconsistencias en el parser de emails durante el ETL.
    *   **Mitigación:** Configurar reglas de validación de Regex robustas en `Schema_Engine.js`.
*   **Riesgo:** Problemas de renderizado de cientos de avatares en el DataGrid.
    *   **Mitigación:** Asegurar lazy-loading nativo o confiar en el virtual scrolling existente del DataGrid.

## Implementation Plan

### Story Sequence
| Seq | Story | Rationale | Dependencies |
|-----|-------|-----------|--------------|
| 1 | S52.1: Schema & Backend | Base arquitectónica requerida. | Ninguna |
| 2 | S52.2: UI Views & Forms | UI necesaria para consumir el schema. | S52.1 |
| 3 | S52.3: ETL Integration | Ingesta masiva requiere el schema estricto. | S52.1 |
| 4 | S52.4: Validation | Aseguramiento de calidad E2E. | S52.2, S52.3 |

### Milestones
- [ ] **M1: Data Layer (S52.1)**: Esquema y persistencia estables.
- [ ] **M2: Interface Layer (S52.2, S52.3)**: CRUD UI y carga masiva operativos.
- [ ] **M3: Production Ready (S52.4)**: QA superado.

### Tracking
| Story | Status | Assigned | Target |
|-------|--------|----------|--------|
| S52.1 | Todo | - | - |
| S52.2 | Todo | - | - |
| S52.3 | Todo | - | - |
| S52.4 | Todo | - | - |
