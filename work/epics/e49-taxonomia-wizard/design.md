---
epic_id: "E49"
grounded_in: "Gemba of [src/Schema_Engine.js, src/FormRenderer_UI.client.js, src/UI_FormStepper.client.js]"
---

# Epic Design: E49 Taxonomía Wizard & Self-Service Portal

## Affected Surface (Gemba)

| Module/File | Current State | Changes |
|-------------|---------------|---------|
| `src/Schema_Engine.js` | Entidad Taxonomía no existe. | Inyectar entidad `Taxonomia` con todos sus campos y relaciones N:M (usando `relationType: 'hijo'`) para los 9 directorios. No se usarán flags especiales de UI. |
| `src/FormRenderer_UI.client.js` | Punto de entrada global para formularios en modo Drawer. | **(IoC Strategy)** Se modificará levemente para aceptar un parámetro `config.customContainer`. Si se recibe, el renderizador armará el DOM ahí en lugar de usar el `DrawerStackController`, protegiendo la funcionalidad core pero permitiendo reutilizarla en Fullscreen. |
| `src/UI_FormStepper.client.js` | Orquestador de steps secuenciales simple. Sin estados de completitud visuales. | Añadir modo `stateful: true` para habilitar el seguimiento del progreso de cada sección (Pendiente, En Proceso, Finalizado). |
| `src/UI_Router.client.js` / `Index.html` | Rutas centradas en administración (`Dashboard_UI`, etc). | Añadir soporte para una vista `SelfService_Home_UI` exclusiva para clientes/áreas de negocio. |

## Target Components

| Component | Responsibility | Key Interface |
|-----------|---------------|---------------|
| `SelfService_Home_UI.html` | Pantalla de inicio para clientes de negocio donde visualizan sus taxonomías actuales. Al crear una nueva, invoca a `FormRenderer_UI.renderForm(..., { customContainer: modal })`, reutilizando el motor sin usar el Drawer. | `SelfService_Home_UI.render(containerId)` |
| `UI_FormStepper.client.js` | Modalidad `stateful`. Valida el progreso por sección y renderiza los íconos. | `new UI_FormStepper({ stateful: true, ... })` |

## Key Contracts

**Wizard State Representation (Inside UI_FormStepper):**
```javascript
// La instancia interna calculará dinámicamente:
const sectionStatus = {
    'Directorio de TI': 'Finalizado', // Todos los requeridos llenos
    'Directorio de Negocio': 'En Proceso', // Algún input llenado
    'Alta de Dominios': 'Pendiente' // Ningún input llenado
};
```

## Migration Path
- Se preserva el `Blueprint CRUD` nativo (`FormRenderer_UI.client.js`) sin inyectar deuda técnica condicional.
- Para las Altas de N:M (Subgrids), se seguirá utilizando `UI_SubgridBuilder.client.js`, inyectándolo dinámicamente en el Stepper para preservar la idempotencia construida en la Épica E48.
