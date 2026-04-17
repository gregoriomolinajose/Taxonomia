# Epic E41: Decoupled Searchable Multi Component (PWA Ready)

## Objective
Transformar el actual subgrid genérico utilizado para la selección múltiple en un **Pure Web Component** (`<tx-searchable-multi>`), tomando como base estructural el componente `SearchableSingle`. El nuevo componente debe ser totalmente desacoplado, modular y compatible con el empaquetado nativo (PWA/Capacitor para iOS/Android), sentando los cimientos de la nueva UI Component Library de Taxonomía.

## Value
El rediseño permite a Taxonomía reutilizar la selección múltiple avanzada sin dependencia directa del `FormRenderer_UI` ni inyección rígida del DOM, mitigando *Memory Leaks* y *Ghost Stealing* en subgrids 1:N. Al encapsular el componente nativamente, se habilita la distribución Mobile PWA, resolviendo la última gran barrera arquitectónica para un desarrollo escalable en dispositivos táctiles.

## In Scope (MUST/SHOULD)
- Refactorización del código legacy que rige la selección múltiple (actualmente incrustado y fuertemente acoplado en `UI_Component_SearchableMulti.client.js`).
- Encapsulamiento como Web Component independiente con Shadow DOM o Scoped DOM (`<tx-searchable-multi>`).
- Implementación del Look & Feel del `SearchableSingle` (diseño mobile-first, Drawer nativo, Search Bar, Tags seleccionadas en pills superiores).
- Gestión del ciclo de vida para recolección de basura (Garbage Collection) y limpieza de Listeners al cerrar la vista.
- Compatibilidad nativa Capacitor / PWA.

## Out of Scope
- Migración de otros componentes (DataGrid, FileUpload) a Web Components puros (se relega a la E39 u otra épica).
- Lógica backend de resolución topológica estricta (ya resuelta en E38/E40).
- Configuración del Manifest PWA Global (se resolverá transversalmente).

## Stories
- **S41.1**: Design API Contract for Web Component. [Size: XS]
- **S41.2**: Implement Basic Markup & Data Binding (SearchableMulti Shadow Layout). [Size: S]
- **S41.3**: Port Search & Selection Engine from SearchableSingle (Logic Replication). [Size: M]
- **S41.4**: DOM Lifecycle Interceptors & Garbage Collection limits. [Size: S]
- **S41.5**: Integration Testing inside FormRenderer_UI. [Size: M]

## Done
- El componente `SearchableMulti` puede invocarse limpiamente mediante custom tags de HTML.
- Componente probado exitosamente sin generar pérdidas de memoria o listeners zombis.
- Funcionalidad de selección visual y búsqueda al nivel de UX del `SearchableSingle`.
- Validado bajo compilador / linter local.

## Risks
| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Shadow DOM impide capturar Custom Events de Ionic | Alta | El Componente retransmitirá delegando a `window.AppEventBus` o inyectará los eventos como propiedades `CustomEvent` con `composed: true`. |
| Conflictos Modales de Ionic (Z-Index múltiple) | Media | Manejar el componente como Modal independiente o usar un Full-Screen Popover en lugar de modales anidados infinitos. |
