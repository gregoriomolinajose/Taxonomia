---
epic_id: "E49"
grounded_in: "Gemba of [src/Schema_Engine.js, src/FormRenderer_UI.client.js, src/UI_FormStepper.client.js]"
---

# Epic Design: E49 Taxonomía Wizard & Self-Service Portal

## Affected Surface (Gemba)

| Module/File | Current State | Changes |
|-------------|---------------|---------|
| `src/Schema_Engine.js` | Entidad Taxonomía no existe. | Inyectar entidad `Taxonomia` con todos sus campos y metadata `uiBehavior: 'fullscreen-wizard'` para indicar renderizado especial. |
| `src/FormRenderer_UI.client.js` | Todo formulario nuevo invoca `DrawerStackController.push(modal)`. | Interceptar la renderización de la entidad `Taxonomia` si `uiBehavior === 'fullscreen-wizard'`, redirigiendo la orquestación a un `<ion-modal>` a pantalla completa mediante `UI_Wizard_Taxonomia`. |
| `src/UI_FormStepper.client.js` | Orquestador de steps secuenciales simple (Lineal). Sin estados de completitud. | No modificar. En su lugar, se creará un motor paralelo o heredado que maneje saltos aleatorios y estados de completitud (Pendiente, En Proceso, Finalizado). |
| `src/UI_Router.client.js` / `Index.html` | Rutas centradas en administración (`Dashboard_UI`, etc). | Añadir soporte para una vista `SelfService_Home_UI` exclusiva para clientes/áreas de negocio. |

## Target Components

| Component | Responsibility | Key Interface |
|-----------|---------------|---------------|
| `UI_Wizard_Taxonomia.client.js` | Modal `<ion-modal>` a pantalla completa con navegación no lineal (cualquier orden). Almacena el estado de los 9 pasos y la barra de progreso global. | `UI_Wizard_Taxonomia.present(entityName, initialData)` |
| `SelfService_Home_UI.html` | Pantalla de inicio para clientes de negocio donde visualizan sus portafolios/taxonomías actuales y pueden crear una nueva. | `SelfService_Home_UI.render(containerId)` |
| `Schema_Engine.js -> Taxonomia` | Definición de las 9 secciones y mapeo topológico N:M para Directorios (TI, Negocio, Producto), Asociaciones y Altas. | `APP_SCHEMAS.Taxonomia` |

## Key Contracts

**Wizard State Representation:**
```javascript
const wizardState = {
    progress: 0, // 0 to 100
    steps: {
        'Directorio de TI': { status: 'Pendiente' | 'En Proceso' | 'Finalizado' },
        'Directorio de Negocio': { status: 'Pendiente' | 'En Proceso' | 'Finalizado' },
        // ...
    }
};
```

**Schema Override for Fullscreen:**
```javascript
APP_SCHEMAS.Taxonomia = {
    primaryKey: 'id_taxonomia',
    metadata: {
        titleField: 'nombre',
        uiBehavior: 'fullscreen-wizard' // Flag que intercepta el FormRenderer
    },
    // ...
}
```

## Migration Path
- Se respetará el `Blueprint CRUD` nativo (`FormRenderer_UI.client.js`). Las demás entidades no se verán afectadas (seguirán usando `DrawerStackController`).
- Para las Altas de N:M (Subgrids), se seguirá utilizando `UI_SubgridBuilder.client.js`, inyectándolo dinámicamente en el Wizard para preservar la idempotencia construida en la Épica E48.
