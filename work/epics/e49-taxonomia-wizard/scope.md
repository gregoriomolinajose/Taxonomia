# Epic Scope: E49 Taxonomía Wizard & Self-Service Portal

## Objective
Desarrollar un portal de autoservicio y un asistente (wizard) dinámico a pantalla completa que agrupe y guíe la creación de la estructura organizacional (Taxonomía). La entidad Taxonomía actuará como un contenedor N:M para portafolios, productos, dominios, capacidades, equipos y directivos/personas.

## Boundaries

**In Scope:**
- Entidad `Taxonomia` en `Schema_Engine.js` (relaciones N:M).
- Portal "Home" aislado para clientes de negocio (`SelfService_Home_UI`).
- Invocación de `renderForm(..., { customContainer: modal })` desde el portal de clientes para reutilizar la lógica de `FormRenderer_UI` sin usar el Drawer lateral.
- Extensión del componente existente `UI_FormStepper.client.js` para soportar estados de sección.
- 9 Pasos configurados en la entidad Taxonomía:
  1. Directorio de TI
  2. Directorio de Negocio
  3. Directorio de Producto
  4. Portafolios Asociados
  5. Productos Asociados
  6. Equipos participantes
  7. Colaboradores (Personas)
  8. Alta de Dominios
  9. Alta de Capacidades

**Out of Scope:**
- Alterar la lógica existente del Blueprint CRUD general para otras entidades (`FormRenderer_UI.client.js` no se toca).
- Creación de un nuevo motor de UI secuencial (reutilizaremos `UI_FormStepper.client.js`).
- Rediseño de componentes atómicos internos (los subgrids y selectores deben usar `UI_Factory` actual).

## Planned Stories (Draft)
- **S49.1:** Configuración de Entidad Taxonomía en `Schema_Engine.js` con todas sus relaciones N:M.
- **S49.2:** Extensión del `UI_FormStepper` (Modo Stateful) para permitir tracking de estados de campos sin bloquear saltos aleatorios.
- **S49.3:** Creación del Home Self-Service aislado para Clientes (`SelfService_Home_UI`) y enrutador.
- **S49.4:** Ensamblaje del `<ion-modal>` Fullscreen en el Self-Service instanciando el Stepper con los pasos de Directorios y Asociaciones.
- **S49.5:** Integración final de Altas estructuradas (Dominios/Capacidades) y End-to-End Testing de N:M.
- **S49.11:** Refinamiento visual UI/UX (Layout Stepper, Tipografías, y Badges).
- **S49.12:** Estabilización Arquitectónica del FormEngine y Stepper (Fix de Fugas de Abstracción y Carga Asíncrona).

## Done Criteria
- [ ] La vista de Creación de Taxonomía se abre en pantalla completa desde el Portal Self-Service.
- [ ] El usuario puede navegar libremente por los 9 pasos y su progreso se refleja visualmente (Pendiente, En Proceso, Finalizado) en los íconos del Stepper.
- [ ] Al finalizar, se crean correctamente las relaciones N:M entre Taxonomía y todas las entidades seleccionadas de forma idempotente.

## Implementation Plan

> Added by `/rai-epic-plan` — 2026-05-04

### Story Sequence

| Order | Story | Size | Dependencies | Milestone | Rationale |
|:-----:|-------|:----:|--------------|-----------|-----------|
| 1 | S49.1 | S | None | M1 | Proveer la entidad estructural (Data Layer) primero. |
| 2 | S49.2 | M | None | M1 | Añadir la inyección de `customContainer` al `FormRenderer_UI` y el `stateful: true` al Stepper. |
| 3 | S49.3 | S | None | M2 | Crear el cascarón de Home de Negocio y sus rutas de acceso independiente. |
| 4 | S49.4 | L | S49.1, S49.2, S49.3 | M2 | Ensamblar el modal a pantalla completa invocando el `FormRenderer` y conectar todos los selectores N:M. (Integration Checkpoint) |
| 5 | S49.5 | M | S49.4 | M3 | Probar la cascada y la visualización final E2E. |

### Milestones

| Milestone | Stories | Target | Success Criteria |
|-----------|---------|--------|------------------|
| **M1: Walking Skeleton** | S49.1, S49.2 | Day 1 | La entidad existe en memoria; el Stepper visualiza estados estáticamente. |
| **M2: Core MVP (Integration)** | +S49.3, S49.4 | Day 2 | Se entra al Home, se abre modal a pantalla completa y se completan asociaciones simples (TI, Negocio, Portafolios). |
| **M3: Feature Complete** | +S49.5 | Day 3 | Alta completa con Dominios y Capacidades funcionando. Relaciones creadas en BD. |
| **M4: Epic Complete** | — | Day 3 | Criterios de hecho (Done) cumplidos. Code Review y Merge a Develop. |

### Parallel Work Streams

```text
Time →
Stream 1 (Backend/Data): S49.1 ──────────────────┐
                                                 ↓
Stream 2 (UI Engine):    S49.2 ──────────────────► Merge (S49.4 Integration) ─► S49.5
                                                 ↑
Stream 3 (Routing/Home): S49.3 ──────────────────┘
```

**Merge points:**
- Antes de S49.4: Las tres piezas fundacionales se conectan (el cascarón SelfService lanza el UI_FormStepper con la definición del Schema de S49.1).

### Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|:------:|:------:|:--------:|-------|
| S49.1 | S | Done | 15m | 4 | Completada la inserción estructural |
| S49.2 | M | Done | 30m | 5 | IoC inyectado exitosamente y modo stateful validado. |
| S49.3 | S | Done | 20m | 4 | Completada encapsulación de estilos Premium y ocultamiento de barra administrativa en el ruteador. |
| S49.4 | L | Done | 35m | 6 | Integración de Wizard_Taxonomia en vista Fullscreen y rediseño estilo iOS del portal. |
| S49.5 | M | Done | 25m | 5 | Inyectado Wizard_Taxonomia en APP_SCHEMAS y probado E2E con relaciones N:M. |
| S49.11| M | Done | 30m | 5 | Implementación visual del stepper terminada. |
| S49.12| S | Done | 20m | 5 | Estabilización del FormEngine prefetching y el evento onStepChange. |

### Sequencing Risks

| Risk | L/I | Mitigation |
|------|:---:|------------|
| Ruptura Involuntaria de otros FormSteppers | M/H | Testear manualmente la entidad `Familia` u otra con Stepper tras S49.2. |
| Complejidad M:N Excesiva en un Modal | M/M | Utilizar estrictamente el `UI_SubgridBuilder.client.js` existente (SRP). |
