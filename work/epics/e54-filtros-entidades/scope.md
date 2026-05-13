# Epic E54: Habilitar Filtros en Todas las Entidades

## Business Objective
Implementar una funcionalidad de filtro universal para todas las entidades del sistema. Utilizando como referencia la experiencia de usuario de Jira, se proveerá una interfaz unificada donde el usuario pueda seleccionar campos específicos (Ej. Área de producto, Alcance, Creador) y aplicar múltiples criterios (checkboxes, selección múltiple) para afinar las vistas y grillas de datos.

## Scope
- Diseñar e implementar el componente UI de Filtros (drawer o sidebar) siguiendo las referencias de Jira.
- Crear un selector dinámico de campos para que el usuario elija sobre qué columnas filtrar.
- Implementar la lógica de filtrado de estado (front-end o back-end dependiendo del volumen de datos) soportando selecciones múltiples (Ej. "Identidad", "Colaboración", "Sin valor").
- Proveer controles para "Borrar los elementos seleccionados" y "Borrar todo".
- Integrar este componente universal en las vistas principales de todas las entidades (Ej. Taxonomía, Personas, Capacidades, etc.).

## Out of Scope
- Vistas guardadas (guardar una combinación de filtros para el futuro). Se abordará en otra iteración.
- Búsqueda semántica o por IA. El enfoque es filtrado estricto por valores discretos y relaciones.

## Planned Stories
- **S54.1**: Diseño UI/UX del Componente de Filtros Universales (Sidebar).
- **S54.2**: Lógica Base del Motor de Filtros (State management para los criterios seleccionados).
- **S54.3**: Integración del Filtro Universal en la Vista de Grillas/Listas Principales.
- **S54.4**: Soporte a Campos Relacionales y Selectores Múltiples dentro de las opciones del filtro.

## Done Criteria
- [ ] El componente de filtros está visible y funcional en al menos todas las vistas de listado de las entidades principales.
- [ ] Es posible filtrar por campos de texto y selección única/múltiple.
- [ ] La UI concuerda estructuralmente con la funcionalidad de referencia solicitada (Jira-like).

## Implementation Plan

### Sequence & Rationale

| Seq | Story | Name | Rationale | Dependencies |
|-----|-------|------|-----------|--------------|
| 1 | S54.1 | UI/UX Componente de Filtros | **Walking skeleton:** Crear la base visual del Drawer/Sidebar, aislando los estilos y la maqueta HTML/CSS (Jira-like) antes de inyectar lógica. | Ninguna |
| 2 | S54.2 | Lógica Base del Motor | **Core MVP:** Implementar el state management y la extracción dinámica de `APP_SCHEMAS`. Alimenta a S54.1 con opciones reales. | S54.1 |
| 3 | S54.3 | Integración (Wrapper Genérico) | **Risk-first:** Integrar vía un Wrapper/HOC genérico sobre el List Engine en lugar de mutar archivo por archivo, previniendo shotgun surgery. | S54.2 |
| 4 | S54.4 | E2E & Campos Relacionales | **Integration Checkpoint (PAT-E-539):** Resolución de IDs relacionales a etiquetas legibles, soporte a arreglos M:N y prueba E2E transversal. | S54.3 |

### Milestones

- [ ] **M1: Walking Skeleton (S54.1 - S54.2)** - Drawer estructurado, capturando estados dinámicos sin tocar vistas principales.
- [ ] **M2: Core MVP (S54.3)** - Filtrado end-to-end funcionando sobre vistas en producción (ej. Personas, Portafolio).
- [ ] **M3: Feature Complete (S54.4)** - Soporte completo de relaciones múltiples y validaciones de E2E listas.

### Tracking

| Story | Status | T-Size | Actual | Assigned |
|-------|--------|--------|--------|----------|
| S54.1 | Done   | S      | 1h     | Rai      |
| S54.2 | Done   | M      | 1.5h   | Rai      |
| S54.3 | To Do  | L      |        | Rai      |
| S54.4 | To Do  | M      |        | Rai      |

### Sequencing Risks
1. **Sobrecarga de Renderizado (Media):** Re-renderizar una grilla con cientos de dominios cada vez que se marca un checkbox puede bloquear el navegador. *Mitigación:* Se implementará Debounce al callback de `onFilterChange`.
