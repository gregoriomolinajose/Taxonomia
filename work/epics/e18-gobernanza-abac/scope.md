# Scope E18: Gobernanza Topológica y Seguridad Contextual (ABAC)

## Reglas de Negocio a Implementar (Criterios de Éxito)

### 1. Seguridad por Pertenencia (Micro-Gobernanza)
Tener el rol de "Scrum Master" no otorga derecho universal a editar todos los equipos de la empresa. El sistema validará topológicamente que un usuario solo pueda vincular, editar o gestionar a las "Personas" del Equipo del cual es **explícitamente** el dueño o está anidado bajo él.
- El mismo principio rige para un Release Train Engineer (RTE) sobre su Tren.

### 2. Separación de Funciones (Segregation of Duties)
Se erradica la posibilidad de que un solo rol pueda construir silos autónomos.
- **Directiva:** La alta dirección (VMO, Portfolio) creará los contenedores estratégicos top-level (Portafolios, Value Streams).
- **Operación:** La capa ejecutora (Líderes de Producto y Trenes) únicamente podrá vincular sus equipos e iniciativas a esos contenedores previamente pre-autorizados, restringiendo la creación en las ramas del grafo.

### 3. Escalamiento Natural y Resiliencia Operativa
La agilidad no puede detenerse. Si un Scrum Master no está disponible, el sistema reconocerá matemáticamente la jerarquía y subirá automáticamente la delegación, permitiendo que el Agile Coach asignado o el RTE del Tren **hereden sus permisos de forma temporal** en cascada para destrabar la operación.

## Impacto en la Experiencia del Usuario (UX)

### Transparencia de Cero Fricción
En lugar de fallar en servidor mediante un mensaje frustrante de "Acceso Denegado" post-submit, la plataforma se adapta preventivamente a quien la visualiza modificando el DOM (Ocultando inputs, apagando menús):
- Si un Director de Negocio (Stakeholder) ingresa a la plataforma, contemplará toda la taxonomía como un mapa estricto de **solo lectura**.
- Si un Product Manager entra a un producto contiguo que no gestiona, los botones de "Editar", "Remover" o "Agregar" simplemente **no existirán** en su marco de visión.

## Definition of Done (Cierre Mínimo Viable)
- Interceptor backend operando bajo las directivas `Segregation of Duties` y `Micro-Gobernanza`.
- Formulario de edición filtrando `APP_SCHEMAS.rules` para ABAC.
- Re-dibujo adaptativo del UI DataGrid con opacidad de botones y desaparición de opciones en base a las reglas configuradas.

## Implementation Plan

### Story Sequence

| Seq | Story | Rationale | Dependencies |
|-----|-------|-----------|--------------|
| 1 | S18.1: Session Topology Resolver | Risk-first. El cálculo de nodos de pertenencia es la raíz del Control ABAC. | None |
| 2 | S18.2: Rule Evaluator Engine | Walking skeleton. Inyecta barrera middleware sobre esquema antes de pensar en UI. | S18.1 |
| 3 | S18.4: Contextual UI Renderer | Integration Checkpoint (PAT-E-539). Cruza el backend dinámico de S18.2 con re-renderizado mudo en Frontend. | S18.2 |
| 4 | S18.3: Hierarchical Escalation Module | Escalation Logic (Post-V1). Añade resiliencia trepando el DAG tras estabilizar la V1 segura. | S18.1, S18.2 |

### Milestones

- **M1: Walking Skeleton** (S18.1, S18.2): El interceptor matriz calcula accesos exactos y `APP_SCHEMAS.rules` bloquea cualquier asalto en Controller.
- **M2: UI Checkpoint PAT-E-539** (S18.4): Se demuestra mutación reactiva y UX "Zero Fricción" sin emitir bloqueantes ruidosos.
- **M3: Resiliencia Completa** (S18.3): Delegación en-ruta (RTEs, Agile Coaches heredan permisos atómicamente por árbol).

### Progress Tracking

- `[x]` S18.1: Session Topology Resolver (XS)
- `[x]` S18.2: Rule Evaluator Engine (DB-Driven) (M)
- `[x]` S18.4: Contextual UI Renderer (M)
- `[x]` S18.3: Hierarchical Escalation (L)
- `[x]` S18.5: Governance Admin Panel (Zero-Code UI) (XL)
