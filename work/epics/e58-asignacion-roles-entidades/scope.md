# Epic Scope: E58 Asignación de Roles por Entidad [REOPENED]

## Objective
Realizar y habilitar la asignación de roles para cada una de las entidades estructurales de la taxonomía (Unidad de Negocio, Value Stream, Portafolio, Grupo de Producto, Equipo), permitiendo gestionar qué personas ocupan qué roles a nivel de cada nodo del grafo jerárquico.

## Problem Statement
Las entidades necesitan propietarios designados para habilitar flujos de aprobación y escalamiento jerárquico. Se requiere que estos roles existan formalmente en la tabla `Rol` y se vinculen vía la arista `PERSONA_ROL`, pero que el usuario final pueda asignarlos de la manera más fluida posible desde la entidad jerárquica (ej. seleccionando a la persona desde el Portafolio). Adicionalmente, el cálculo de topología debe ser preciso y no mezclar profundidades de distintos tipos de relaciones.

## Scope Definitions

### In Scope
- Creación visual de los campos de selección de personas (Roles) en UI.
- Auto-creación transparente del registro `Rol` (si no existe) y la relación `PERSONA_ROL` vía Interceptores de Mutación.
- Asignación de los siguientes roles a sus entidades:
  - Value Stream -> Dueño del Value Stream
  - Portafolio -> Gerente de Portafolio
  - Grupo de Producto -> Gerente de Producto
  - Equipo -> Dueño de Producto
- Ampliación del límite recursivo de Persona a 15 niveles y aislamiento de la validación topológica por tipo de relación.

### Out of Scope
- Gestión manual exhaustiva del diccionario de roles (se optó por auto-creación y selección por convención).
- Asignación múltiple para los roles específicos mencionados (todos deben ser Single Select).

### Progress Tracking

| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|--------|----------|-------|
| 1 | S58.1 — Actualización de Esquemas | S | Done | S | 2 | Completado |
| 2 | S58.2 — Interceptor de Auto-Aprovisionamiento | M | Done | M | 3 | Desplegado y verificado |
| 3 | S58.3 — Aislamiento Topológico y Limite de Profundidad Persona | S | Done | S | 2 | Desplegado a PROD |

## Done Criteria
- Las 5 entidades estructurales tienen soporte completo en UI (visualización y edición) para la asignación de roles.
- La persistencia de la asignación de roles se realiza correctamente en la base de datos a través de las relaciones del grafo o de los campos correspondientes.
- La consulta de una entidad devuelve los roles actualizados.
- La tabla Rol recibe correctamente los campos UX (`nombre_ingles`, `color_icono`, `especialidad` ampliado).
- El sistema crea de forma desatendida el rol oficial si este no existe cuando se asigna a una persona.
