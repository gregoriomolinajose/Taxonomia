# Epic E41: Decoupled Searchable Multi Component

## Architecture & Integration Strategy

### Problem Statement
Actualmente, el componente de selección múltiple (que reside en `UI_Component_SearchableMulti.client.js`) se construye mediante complejas inyecciones imperativas de DOM dentro del `FormRenderer_UI`. Esto no solo genera cuellos de botella en el mantenimiento (código repetitivo "spaghetti") sino que imposibilita exportar libremente esa pieza a otras aplicaciones nativas (via PWA o Capacitor) sin tener que arrastrar consigo el colosal e hiper-especificado core generador de Base de Datos del proyecto Taxonomía.

El éxito de implementaciones más recientes como el `UI_Component_SearchableSingle.client.js` ha demostrado que aislar estas estructuras mejora increíblemente la resiliencia en la asignación de eventos en JS, en contraste a las fallas silenciosas generadas por los escuchadores globales de sub-grillas obsoletas.

### Proposed Target Architecture

#### 1. Web Component Specification (`<tx-searchable-multi>`)
Se adoptará el estándar de `Vanilla Custom Elements` extendiendo de `HTMLElement`. Esto se prioriza frente a librerías de terceros buscando un bundle final purista y diminuto, apto de manera natural para WebView (PWA/Capacitor).

#### 2. Native DOM API Contract
```javascript
// Atributos Reactivos Nativos
const selector = document.createElement('tx-searchable-multi');
selector.setAttribute('entity-name', 'Persona');
selector.setAttribute('pre-selected', JSON.stringify([{ id_registro: 'PER-1A2B', nombre: 'Gregory' }])); // SCD-2 Graph Hydration compliant
selector.setAttribute('is-graph-edge', 'true');

// Propiedades Vivas (Javascript Context)
selector.dataSource = window.__ABAC_CONTEXT__.lists['Persona']; 

// Flujos de Retorno Hacia el FormEngine (Envoltura Desacoplada)
selector.addEventListener('txChange', (e) => {
    console.log("Newly selected payload:", e.detail.selection);
    // e.g. FormRenderer update payload
});
```

#### 3. Core Mechanics y PWA Alignment
- **UI de Selección Avanzada:** Basado visualmente en el mismo layout de Ionic Framework que usa Single. Arriba un Sticky Header o Searchbar flotante, debajo ListView de `ion-checkbox` controlados. La lista se alimentará inicialmente del pool de datos.
- **Scroll Infinito / Virtual:** (Optional / Future-proof) Su renderizador CSS usará flex-box containment nativos de PWA para que los teclados nativos en Android (`keyboardResize`) y iOS Safari no tapen el contenido de la selección.
- **Isolación Estilística:** Los estilos serán confinados evitando derrames. Usaremos `Shadow DOM (closed or open)` o delimitación BEM rigurosa si el Shadow DOM choca con Ionic. (Decisión Diferida para el Story S41.2).

### ADR Requirements
¿Debemos usar Shadow DOM puro, o inyectaremos marcadores CSS-BEM por ahora para no enojar los Web Components nativos de base abstracta que usa Ionic (`<ion-item>`)?
- El uso intensivo de Ionic 5/6+ Web Components (StencilJS) dentro de un Shadow DOM nuestro puede causar problemas en la inyección de estilos variables (`var(--ion-...)`).  
- **Sugerencia Técnica:** Usar Custom Element Standard (sin `attachShadow`) pero comportándose arquitecturalmente como un componente autónomo (Light DOM pero encapsulado).

### Testing Strategy
1. Unit tests sobre la lógica pura: `SearchableMulti.toggleItem()`, `SearchableMulti.getState()`.
2. Tests visuales de Component LifeCycle: Asegurar que `disconnectedCallback()` destruya por completo el cache HTML subyacente impidiendo Memoria zombi a largo plazo en navegación SPA profunda, algo trascendental en apps móviles.
