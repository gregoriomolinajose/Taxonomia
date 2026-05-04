# Epic Scope: E49 Taxonomía Wizard & Self-Service Portal

## Objective
Desarrollar un portal de autoservicio y un asistente (wizard) dinámico a pantalla completa que agrupe y guíe la creación de la estructura organizacional (Taxonomía). La entidad Taxonomía actuará como un contenedor N:M para portafolios, productos, dominios, capacidades, equipos y directivos/personas.

## Boundaries

**In Scope:**
- Entidad `Taxonomia` en `Schema_Engine.js` (relaciones N:M).
- Portal "Home" aislado para clientes de negocio (`SelfService_Home_UI`).
- Invocación directa del flujo de Alta de Taxonomía desde el portal de clientes (Pantalla Completa) aislándolo del `FormRenderer_UI` administrativo.
- Extensión del componente existente `UI_FormStepper.client.js` para soportar estados de sección (Pendiente, En Proceso, Finalizado) sin duplicar código.
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

## Done Criteria
- [ ] La vista de Creación de Taxonomía se abre en pantalla completa desde el Portal Self-Service.
- [ ] El usuario puede navegar libremente por los 9 pasos y su progreso se refleja visualmente (Pendiente, En Proceso, Finalizado) en los íconos del Stepper.
- [ ] Al finalizar, se crean correctamente las relaciones N:M entre Taxonomía y todas las entidades seleccionadas de forma idempotente.
