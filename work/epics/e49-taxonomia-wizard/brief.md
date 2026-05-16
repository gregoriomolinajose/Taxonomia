---
epic_id: "E49"
title: "Taxonomía Wizard & Self-Service Portal"
status: "draft"
created: "2026-05-04"
---

# Epic Brief: Taxonomía Wizard & Self-Service Portal

## Hypothesis
For los clientes y áreas de negocio who necesitan un portal de autoservicio separado de la administración actual,
the "Taxonomía Wizard" is a contenedor interactivo
that permite consolidar visualmente y vincular de forma guiada la propiedad de portafolios, productos, dominios, capacidades, equipos y personas.
Unlike la creación aislada por subgrids actuales, our solution proporciona un medidor de progreso global en un flujo dinámico basado en esquemas que facilita la orquestación integral a pantalla completa.

## Success Metrics
- **Leading:** Despliegue de la entidad "Taxonomía" y el contenedor visual (Full Screen Create) del Wizard.
- **Lagging:** Reducción en la fricción para la alta de elementos de taxonomía, con usuarios de negocio completando el flujo de 9 pasos sin soporte de administradores.

## Appetite
M — [5-7 stories]

## Scope Boundaries
### In (MUST)
- Creación de la entidad `Taxonomia` en `Schema_Engine.js` con relaciones N:M hacia el resto de las entidades.
- Blueprint CRUD con soporte para `uiBehavior: 'fullscreen'` (o similar) para anular el drawer en la acción "Create".
- Motor de Wizard dinámico definido por esquema con 9 pasos.
- Estados por paso (Pendiente, En Proceso, Finalizado) con medidor de progreso global.
- Pasos de Directorio (TI, Negocio, Producto), Asociaciones (Portafolios, Productos, Equipos, Colaboradores) y Altas (Dominios, Capacidades).
- Portal / Home separado para clientes de área.

### In (SHOULD)
- Navegación secuencial sugerida pero no restrictiva (saltos entre pasos permitidos).

### No-Gos
- Modificar el Blueprint CRUD actual de forma que rompa las vistas "Drawer" existentes para otras entidades.
- Re-implementar lógicas M:N; se debe reutilizar el Schema-Driven Relational Provisioning de la E48.

### Rabbit Holes
- Acoplar el estado del Wizard fuertemente al backend en cada click, arriesgando la tolerancia a fallos. El estado de "En Proceso" debe ser ágil.
