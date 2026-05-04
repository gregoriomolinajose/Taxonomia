# Epic Scope: E49 Taxonomía Wizard & Self-Service Portal

## Objective
Desarrollar un portal de autoservicio y un asistente (wizard) dinámico a pantalla completa que agrupe y guíe la creación de la estructura organizacional (Taxonomía). La entidad Taxonomía actuará como un contenedor N:M para portafolios, productos, dominios, capacidades, equipos y directivos/personas.

## Boundaries

**In Scope:**
- Entidad `Taxonomia` en `Schema_Engine.js` (relaciones N:M).
- Propiedad de esquema para forzar acción `Create` a "Pantalla Completa" (anular Drawer).
- Motor dinámico `Wizard_UI` basado en Blueprint CRUD.
- Tracking de estado por paso (Pendiente, En Proceso, Finalizado) con medidor de progreso.
- Portal "Home" aislado para clientes de negocio.
- 9 Pasos configurados en el Wizard:
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
- Alterar la lógica existente del Blueprint CRUD general para otras entidades (deben seguir usando Drawers).
- Rediseño de componentes atómicos internos (los subgrids y selectores deben usar `UI_Factory` actual).

## Planned Stories (Draft)
- **S49.1:** Configuración de Entidad Taxonomía en Schema_Engine y soporte Fullscreen Create.
- **S49.2:** Creación del Home Self-Service aislado para Clientes.
- **S49.3:** Motor Base del Wizard Dinámico y medidor de progreso (UI State).
- **S49.4:** Integración de los pasos de Directorios y Asociaciones (TI, Negocio, Producto, Portafolios, Productos, Equipos, Colaboradores).
- **S49.5:** Integración de los pasos de Altas estructuradas (Dominios y Capacidades) y testing end-to-end.

## Done Criteria
- [ ] La vista de Creación de Taxonomía se abre en pantalla completa.
- [ ] El usuario puede navegar libremente por los 9 pasos y su progreso se refleja visualmente (Pendiente, En Proceso, Finalizado).
- [ ] Al finalizar, se crean correctamente las relaciones N:M entre Taxonomía y todas las entidades seleccionadas.
