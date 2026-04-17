# Epic E41: Unified Searchable Web Component

## Architecture & Integration Strategy

### Problem Statement
Actualmente, los componentes de selección de datos (`UI_Component_SearchableSingle` y `UI_Component_SearchableMulti`) existen como flujos de código separados inyectados imperativamente en `FormRenderer_UI`. Esto violenta sistemáticamente la regla H10 (Pattern Duplication) de la arquitectura, ya que ambos componentes comparten el 90% de su estructura (Buscador, Renderizador asíncrono, Ionic Modal Drawer), difiriendo únicamente en su cardinalidad de salida (Click único vs Arreglo de opciones/Checkboxes). A su vez, mantener este acoplamiento imposibilita exportar la funcionalidad como una pieza standalone PWA/Capacitor.

### Proposed Target Architecture

#### 1. Web Component Specification (`<tx-searchable>`)
Se adoptará el estándar `Vanilla Custom Elements` extendiendo de `HTMLElement`. Esto consolida una biblioteca nativa ultra-ligera.

#### 2. Native DOM API Contract
```javascript
// Atributos Reactivos Nativos
const selector = document.createElement('tx-searchable');
selector.setAttribute('entity-name', 'Persona');
selector.setAttribute('multiple', 'true'); // <--- El atributo maestro de Cardinalidad
selector.setAttribute('pre-selected', JSON.stringify([{ id_registro: 'PER-1A2B', nombre: 'Gregory' }]));

// Propiedades Vivas (Javascript Context)
selector.dataSource = window.__ABAC_CONTEXT__.lists['Persona']; 

// Payload Unificado
selector.addEventListener('txChange', (e) => {
    // Si multiple="false", retorna objeto. Si "true", retorna Array.
    console.log("Payload:", e.detail.selection);
    // Destruye el nodo tras su éxito si es modal
});
```

#### 3. Core Mechanics y PWA Alignment
- **Dual Behavior Conditional Mapping:** El DOM interno se pintará diferentemente dependiendo de `multiple`. 
  - Si es *false*: Renderiza `<ion-item>` con cursor directo, cerrándose al hacer click.
  - Si es *true*: Renderiza `<ion-checkbox>`, inyecta una lista horizontal (pills) superior flotante con las opciones activas, y requiere botón "Confirmar".
- **Isolación Estilística:** Se priorizará Custom Element Light DOM (sin `attachShadow`) si se identifican conflictos con las variables inyectadas por Ionic Framework (`--ion-color-primary`, etc).

### ADR Requirements
- **Descarte de Virtual Scroll:** Basado en el *Quality Review*, se descartó implementar *Infinite Scroll* en listas PWA para el componente genérico. La carga en bloque de hasta ~500 registros con un motor de búsqueda algorítmico interno es más que suficiente para este workflow sin saturar al GPU Mobile. Un `overflow-y` nativo resuelve el encuadre con Virtual Keyboards.

### Testing Strategy
1. Unit tests: Validar que `txChange` retorna la estructura de datos correcta basándose iterativamente en el switch del atributo `multiple`.
2. Tests visuales de PWA LifeCycle: Asegurar purga completa del caché de memoria y DOM Event Listeners tras el `disconnectedCallback()`.
