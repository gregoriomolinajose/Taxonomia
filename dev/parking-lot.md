# Backlog & Parking Lot (Next Epics: E11+)

Este documento condensa la Deuda Técnica material, ideas heurísticas y advertencias de escalabilidad no resueltas de los pasados ecosistemas (E8-E10). Estos Tickets deben fungir como historias fundacionales priorizadas a despacharse durante la Épica E11 y futuras refactorizaciones estructurales.

## 🏗️ Deuda Topológica y Estructural

### 1. Universalidad Escalable Topológica (SCD-2)
* **Origen:** E8 Contextos limitantes sobre estrategias topológicas 1:N y M:N limitadas vía cierres en `Set`.
* **Acción Causal:** Si el módulo `Topology_Strategies.js` va a prepararse para interactuar con cargas masivas ETL inyectando grafos *completos* (Ej. topologías de *Grafo Cíclico Limitado* o *Árboles de Propagación Forzada*), es imperativo añadir un segundo estrato de validación iterativa auto-defensiva (`currentActiveEdges`). Adicionalmente se debe prevenir que *Guard Clauses* idénticos entre estrategias conformen *Trade-Offs* o violaciones asintomáticas de *Zero-Trust Data Binding* y el principio *DRY*.

### 2. Generación Procedimental DOM (Factory Component Pattern)
* **Origen:** E9 FormEngine / E10 Spike S10.4 Diferida.
* **Acción Causal:** `FormEngine_UI.html` logró librarse numéricamente de sus variables locales (`var(--spacing-5)`), pero su arquitectura visual es monolítica. Su motor depende de +1700 iteraciones anidadas del engorroso `document.createElement`. Considerar una migración radical hacia **Plantillas Reactivas Interpolarizadas** o abstraer su enrutamiento lógico con un patrón puro *Factory Component*, logrando abstracciones sostenibles sin colapsar el V8 ante cientos de campos.

### 3. Especialización del Flattener Recursivo de Theming (JSON Tokens)
* **Origen:** E9 / H8 Theme Parser condicional `if (key === "default")`.
* **Acción Causal:** Refactorizar la estructura de los JSON Tokens nativos aislando el rastreo o separar la indexación de `default` hacia un post-procesador estático (mapeo de alias) posibilitando que la base abstracta del `flattenTokens()` recupere la ceguera sintáctica pura frente al contexto de los desarrolladores.

### 4. Extraer y Desacoplar Controladores de Custom Events
* **Origen:** E8 Interactividad *Padre-Hijo*. 
* **Acción Causal:** Los manejadores interactivos (`levelChanged`) se incrustan como mutaciones directamente en la inicialización cíclica de las Opciones UI. La acumulación de Closures incrementa el "Fat File Smell" del Renderizador Visual. Evaluar la escisión de los *Event Listeners* hacia utilerías semánticas (`Events_Controller.js`) centralizando la interactividad del DOM desvinculado de la inyección primaria.

### 5. Absence of Native UI Safety Checks (Fallo Silencioso DOM)
* **Origen:** E9 Garbage Collector Queue.
* **Acción Causal:** Se programó agresivamente el `topModal.dismiss()`, pero se asume devotamente que la mutación topológica devolverá intacta la *Function* sin reventar con un `TypeError` global si la capa perdiera sus atributos base durante fallos externos. Blindar proactivamente el Controlador LIFO de Nodos añadiendo *Guard Clauses* previos tipo: `if (topModal && typeof topModal.dismiss === 'function')`.

---

## 🛠️ Testing e Integración de Herramientas (Tooling)

### 6. Instanciar Tests Unitarios Isomórficos Nativos (Jest)
* **Origen:** E10 (S10.1 Refuerzo).
* **Acción Causal:** Instanciar formalmente un `SubgridState.test.js` emulando escenarios heurísticos agresivos (Ej. `rules.rootRequiresNoParent`). Incorporar estas validaciones lógicas cimentará la meta E10 donde el "Node.JS-Native" evalúa y determina el comportamiento Reactivo Visual de campos (Disabled/Opacity) validando el 100% el Isomorfismo *Zero-DOM* en backend puro antes de correr Apps Script.

### 7. Pipeline Formal de Minificación (SSoT payload)
* **Origen:** E10 `DataView_UI` Styles Transferidos (Ticket 22).
* **Acción Causal:** Estacionar 1200 líneas maestras absolutas en `CSS_App.html` incrementa silenciosamente el Payload y consumo sobre el protocolo HTTP en 30%-50%. Encender tempranamente un framework minificador pre-compilado en el workflow subyacente (`esbuild` o `gulp-clean-css`), exprimiendo la entrega final (`clasp push`) depurando retornos de carro espaciales.

### 8. Ecosistema Exclusivo de Automatización QA (Testing Sandboxing)
* **Origen:** E10 E2E Profiler Tool inyectado productivamente.
* **Acción Causal:** Extirpar asimetrías de control de calidad. Utilidades E2E como nuestro asincrónico `__runMemoryProfile_E2E()` anidan en entornos operativos reales. Reordenarlos exiliándolos dentro de artefactos encapsulados localmente (ej: `TEST_Suite_UI.html`) o directivas *Tree-Shaking* permitiendo flujos E2E desinfectados contra el ecosistema final estable del cliente.

### 9. File-Aware Deployment & QA Isolation (H21)
* **Origen:** E11.S11.4 Architecture Review.
* **Acción Causal:** Aunque el código QA (`TEST_Suite_UI.html`) ha sido extraído semánticamente, el compilador actual de Apps Script lo sigue empujando incondicionamente. En la próxima refactorización de DevSecOps, se debe integrar una exclusión explícita en el sub-proceso `.build/` del `deploy.js` (`exclude: ['TEST_*.html']`) y condicionales en `Index.html` (`<?!= IS_DEV ? include('TEST_Suite_UI') : "" ?>`) para asegurar verdadero *Tree-Shaking* en Producción.
