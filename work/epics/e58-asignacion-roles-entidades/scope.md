# Epic Scope: E58 Asignación de Roles por Entidad

## Objective
Realizar y habilitar la asignación de roles para cada una de las entidades estructurales de la taxonomía (Unidad de Negocio, Value Stream, Portafolio, Grupo de Producto, Equipo), permitiendo gestionar qué personas ocupan qué roles a nivel de cada nodo del grafo jerárquico.

## In Scope
- Creación o actualización de los esquemas (`Schema_Engine.js`) para incluir campos de asignación de roles en:
  - Unidad de Negocio
  - Value Stream
  - Portafolio
  - Grupo de Producto
  - Equipo
- Definición de relaciones en el grafo (`Sys_Graph_Edges`) para vincular a la entidad `Persona` con las entidades antes mencionadas utilizando un subtipo de arista que identifique el rol (o un atributo adicional de rol).
- Adaptación de la Interfaz de Usuario (Lienzo o Formularios) para permitir seleccionar las personas que fungen en los distintos roles para la entidad.

## Out of Scope
- Migración de datos históricos de roles antiguos si no forman parte estructural del nuevo modelo de grafo, a menos que sea estrictamente necesario.
- Implementación de un motor de reglas de notificaciones basado en estos roles (se manejaría en otra épica de alertas o notificaciones).

## Planned Stories
- **S58.1**: Actualización Visual y Esquemas Estructurales (Rol + 4 Entidades)
- **S58.2**: Interceptor de Auto-Aprovisionamiento de Roles en Backend (`Business_Interceptors`)

## Implementation Plan

### Milestones
- **M1: Esquemas y UI (S58.1)**: Refactorizar `Schema_Engine.js` agregando `nombre_ingles`, `color_icono` y UX al `Rol`, y los campos relacionales de roles para Value Stream, Portafolio, Grupo Producto y Equipo.
- **M2: Integridad Relacional (S58.2)**: Construir el `AutoProvisionEntityRoles` en `Business_Interceptors.js` para asegurar que las selecciones de UI se reflejen físicamente en la tabla `Rol` y en `Sys_Graph_Edges`.

### Progress Tracking

| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|--------|----------|-------|
| 1 | S58.1 — Actualización de Esquemas | S | Done | S | 2 | Completado |
| 2 | S58.2 — Interceptor de Auto-Aprovisionamiento | M | Pending | | | |

## Done Criteria
- Las 5 entidades estructurales tienen soporte completo en UI (visualización y edición) para la asignación de roles.
- La persistencia de la asignación de roles se realiza correctamente en la base de datos a través de las relaciones del grafo o de los campos correspondientes.
- La consulta de una entidad devuelve los roles actualizados.
- La tabla Rol recibe correctamente los campos UX (`nombre_ingles`, `color_icono`, `especialidad` ampliado).
- El sistema crea de forma desatendida el rol oficial si este no existe cuando se asigna a una persona.
