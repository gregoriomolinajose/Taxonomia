# Epic Scope: E28 Visibilidad de Estructura Ágil en Dashboard

## Objective
Resolver la falta de visibilidad del Área de Negocio sobre el volumen de la estructura ágil de la empresa (Portafolios, Equipos, Personas) proveyendo tarjetas rectangulares totalizadoras en la cabecera del Dashboard principal, estandarizadas bajo el sistema de diseño actual.

## In Scope
- Creación del componente UI de Tarjeta (Card) que soporte icono, título y número total.
- Inyección de las variables de diseño (`var(--sys-*)`) al nuevo componente, asegurando que soporte Dark Mode de forma transparente.
- Módulo o Data layer en Backend y Frontend para solicitar el conteo total de las entidades "Portafolio", "Equipos" y "Persona".
- Renderizado de 3 tarjetas alineadas en la sección superior vista en Dashboard.

## Out Scope
- Graficación de estadísticas temporales (ej. barras, crecimiento mensual de equipos).
- Detalle extendido (click-through) por área a menos que ya esté resuelto por las vistas preexistentes (DataView).
- Modificación o alteración del esquema de subgrids desarrollado en la epic anterior; esta es una funcionalidad puramente informativa del nivel raíz.

## Expected Stories
- **S28.1 Backend Data Count:** Endpoints o lógica de DB para retornar contadores agrupados o filtrados por ABAC.
- **S28.2 UI Cards Component:** Componente de la interfaz y su contenedor de layout.

## Definition of Done
- El dashboard principal renderiza las 3 tarjetas en la parte superior.
- Cada tarjeta muestra el total en vivo extraído del backend correctamente.
- Diseño consistente con el theme global (0 CSS en línea, paso estricto por lint).
- Validado por un entorno limpio (Zero Defects).

## Implementation Plan

### Sequencing Strategy (Dependency-driven)
Optamos por la de manera explícita dado que este es un desarrollo corto:
- **S28.1** permite asentar la lógica RPC y conteo.
- **S28.2** utiliza el contrato RPC para pintar la UI y manejar los esqueletos de carga.

### Milestones
- **M1: Backend Walking Skeleton:** El endpoint `API_GetDashboardCounters` devuelve los valores calculados usando caché, resolviéndose rápidamente.
- **M2: UI Core MVP:** Las tarjetas están vivas en el Dashboard, implementan el design system nativo sin CSS suelto, y manejan skeletons asíncronos. (Cierre de Épica)

### Progress Tracking
| Seq | ID    | Story | Size | Estado |
|-----|-------|-------|------|--------|
| 1   | S28.1 | Backend Counters API | XS | Terminado |
| 2   | S28.2 | Dashboard Cards UI Component | S | Terminado |
| 3   | S28.3 | Dashboard Card Componentization | S | Terminado |
