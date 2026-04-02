# Epic Design: Gobernanza Topológica (ABAC)

## Architecture & Technical Direction
Migraremos de un modelo de autorización RBAC estático (Basado en Rol nominal) a un modelo de grafos ABAC (Atribute-Based Access Control) resuelto dinámicamente.
*   **Decisión Arquitectónica (ADR 001):** Resolución Central Asíncrona. Se resolverá el "Árbol de Pertenencia" del usuario durante la inyección inicial (`___ABAC_CONTEXT___`) calculada 1 sola vez en el `API_Auth`. La interfaz será un mero lienzo reaccionario al contexto provisto. La validación blindada ocurrirá simétricamente en el Backend (`Controller`).

## Breakdown de Historias (Stories)

### S18.1: Session Topology Resolver (Backend)
- Desarrollar el interceptor recursivo en GAS (`Engine_Graph`) que determina la pertenencia transitiva de un usuario dado. (e.g. Si soy PO de este Producto, soy dueño implícito de todas las sub-entidades).
- **T-Shirt Size:** XS

### S18.2: Rule Evaluator Engine (Middleware)
- Extender el Motor de Esquemas para integrar semánticamente directivas como `abac: "ownerOnly"`. Crear el Middleware que cruce `___ABAC_CONTEXT___` con la topología diana.
- **T-Shirt Size:** S

### S18.3: Hierarchical Escalation Module (Topología)
- Sub-motor matemático para trepar el DAG permitiendo que líderes superiores (Agile Coach, Portfolio) hereden poder de sus nodos hijos como delegación de emergencia (`Delegation Strategy`).
- **T-Shirt Size:** L

### S18.4: Contextual UI Renderer (Frontend)
- Adaptar las herramientas visuales pesadas (`FormBuilder_Inputs`, `DataView_UI`) para ocultar flujos iterativos de aquellos usuarios sin derecho asertivo ABAC explícito (Cero alertas invasivas; directamente UX Invisible).
- **T-Shirt Size:** M
