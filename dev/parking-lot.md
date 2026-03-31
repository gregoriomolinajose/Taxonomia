# Backlog & Parking Lot (Next Epic: E9)

Este documento registra deudas técnicas, ideas y recomendaciones observadas durante las revisiones de Arquitectura y Calidad de la Épica E8 (Graph Governance), las cuales deben priorizarse como historias formales en el próximo ciclo (Epic E9).

## 💡 Recomendaciones de Arquitectura y Calidad (Desde E8)

### 1. Refuerzo Isomórfico (Subgrid Validations)
* **Contexto (S8.7.4):** Se abstrajo `isNewRecord` a una función pura sin estado global (`window`).
* **Acción para E9:** Refactorizar el resto de los validadores condicionales visuales en `FormEngine_UI.html` (ej. activadores de *Relational Proximity*) hacia inyecciones puras en `SubgridState.js` para asegurar que el frontend pueda someterse al 100% a tests Unitarios desconectados del DOM.

### 2. Universalidad de Estrategias Topológicas (Hermetic Limits)
* **Contexto (S8.7.6):** Las estrategias 1:N y M:N de cierres (SCD-2) fueron limitadas vía `Set`/`Map` en memoria $O(1)$ para evitar el cierre indiscriminado (`Implicit Trust Bug`).
* **Acción para E9:** Si `Topology_Strategies.js` va a habilitarse para un consumo de ETL masivos donde se le pase un *Grafo Completo* como argumento secundario, debemos añadir un filtro extra iterativo y auto-defensivo que acote el bloque `currentActiveEdges` estrictamente hacia la matriz resultante de hijos procesados, volviendo el módulo universal bajo una política estricta de *Zero-Trust Data Binding*.

### 3. Design System Linter (UI Hardcoding)
* **Contexto (S8.7.3):** Se erradicaron colores CSS explícitos (ej. `red`, `blue`) que rompían la experiencia de contraste Multitemático en `DataView_UI`.
* **Acción para E9:** Implementar validaciones automatizadas (Linters o RegExp Checks en scripts de Build) o refactorizar el `CSS_App.html` aislando totalmente cualquier parámetro estético de reactividad forzándolo a utilizar variables declaradas (`var(--color-danger)`). Prohibición absoluta de inyectar reglas estáticas locales por JavaScript al `style`.

### 4. Definición de Theme Manager (Native vs JS)
* **Contexto (S8.7.3):** Eliminar parámetros duramente fijados en HTML y CSS levantó un interrogante arquitectónico fundamental para el soporte del Multi-Theme (Dark/Light).
* **Acción para E9:** Decidir si la persistencia y lectura dinámica del Tema (Dark Mode, High Contrast, etc.) operará exclusivamente usando el objeto global de CSS `:root` nativo con Media Queries, o si será centralizado mediante una instancia JavaScript pura (ThemeManager) estandarizando diccionarios de color para elementos inalcanzables del DOM (ej. librerías y gráficos SVG / ApexCharts).

### 5. Extracción y Desacoplamiento de Event Listeners
* **Contexto (S8.7.2):** Se inyectaron escuchadores custom (`levelChanged`) directamente dentro del iterador de inyección de HTML (`uiComponent()`) en `FormEngine_UI.html` para lograr la reactividad de los dropdowns padre-hijo.
* **Acción para E9:** Evaluar la migración y centralización de todos los *Custom Events* interactivos hacia una macro-clase o Controller puro (idealmente `SubgridState.js` o un `Events_Controller.js`) separando completamente el registro de eventos DOM de las directivas de interpolación de HTML, reduciendo el peso cognitivo e impidiendo el desborde (fat file smell) del motor gráfico.

### 6. Subrutina de Renderizado DRY (FormEngine_UI)
* **Contexto (S8.7.2 Quality Review):** La declaración de Elementos del DOM como `document.createElement('ion-select-option')` fue repetida idénticamente tanto en la inicialización principal del componente como dentro de los eventos de *repaint* (`levelChanged`).
* **Acción para E9:** Modularizar la inyección de opciones HTML extrayendo esa lógica hacia una función de dibujo aislada y reutilizable dentro del Controller. Esto limpiará el método primario adhiriéndose al principio DRY (Don't Repeat Yourself).

### 7. Gobernanza de Estado del Modal Stack (Desacoplamiento)
* **Contexto (S8.7.1):** La estructura MDM In-line se apoya actualmente de una pila LIFO global inyectada rudimentariamente vía `window.formModalStack = window.formModalStack || []`.
* **Acción para E9:** Refactorizar el control y apilamiento asíncrono hacia el ecosistema inyectado puramente (e.g. `SubgridState.js`), extirpando por completo el enrutamiento visual dependiente del objeto `window` principal.

### 8. UX Boundary: Profundidad Máxima de Modales Recursivos (Z-Index Guard)
* **Contexto (S8.7.1):** La recursividad del FormEngine admite infinitos formularios incrustados (Sub-familias -> Familias -> Módulos -> Divisiones) sin advertir fatiga de navegador ni escalando infinitamente el `z-index`.
* **Acción para E9:** Implementar un límite algorítmico front-end (Max Depth o Constraint de Apilamiento, sugerido 3 niveles) donde la interfaz alerte al usuario o impida seguir anidando la creación in-line, forzándolo a resolver las dependencias subyacentes primero y evitando colapsos visuales.

### 9. Memory Profiling (Garbage Collection QA)
* **Contexto (S8.7.1 Quality Review):** Se programó el Pop manual del *Modal Stack* tras operaciones exitosas de base de datos para prevenir *Memory Leaks* causados por Closures y Virtual Scrolls ocultos, pero actualmente no tenemos métricas de retención de memoria.
* **Acción para E9:** Integrar pruebas e2e automatizadas o mediciones de *Profiling* enfocadas al consumo de RAM nativa cuando un operador anida y desanida N modales consecutivamente, certificando matemáticamente que Ionic y el recolector de basura de JS desechan correctamente el nodo desprendido.

## 💡 Recomendaciones de Arquitectura y Calidad (Desde E9 / S9.1)

### 10. `flattenTokens()` - Especialización del Flattener Recursivo (H8)
* **Contexto (S9.1 AR):** La función recursiva de hidratación de JSON Theming contiene una lógica condicional fuerte \`if (key === "default")\` que acopla el analizador abstracto a convenciones sintácticas locales del negocio.
* **Acción Futura:** Refactorizar la estructura de los JSON Tokens (ej: aislar un subárbol paralelo de variables abstractas) o separar esta sustitución en un mapeo de alias post-proceso, garantizando que la función base \`flattenObject\` recupere su pureza matemática matemática ciega frente al dominio.

### 11. CSS Structural Isolation `DataView_UI.html` vs `CSS_App.html` (H11)
* **Contexto (S9.1 AR):** A fin de erradicar los estilos en línea y obedecer la pureza de tokens nativos, se incrustaron selectores dedicados \`.dv-x\` temporalmente en un bloque interno \`<style>\` de \`DataView_UI.html\`.
* **Acción Futura:** Determinar si este enfoque de "Shadow-DOM emulado" es lo oficial. De no serlo y privilegiar una Gobernanza Global a escala de SPA MDM, será imprescindible purgar todos los bloques locales \`<style>\` y aglutinarlos centralmente en \`CSS_App.html\` delegándole toda responsabilidad estructural general.

### 12. Generación Procedimental DOM (H7)
* **Contexto (S9.1 AR):** \`FormEngine_UI.html\` logró despenderse de constantes pixel numéricas (ej. utilizando tokens variables \`var(--spacing-5)\`), pero su proceso de ensamblaje continúa atado intrínsecamente a \`document.createElement\` iterativo en más de 1700 líneas.
* **Acción Futura:** Considerar la encapsulación eventual en un patrón "Factory Component" puro, o migrar hacia Plantillas Reactivas Interpolarizadas que eleven la razón Abstracción / Líneas de Código, permitiendo mayor predecibilidad estructural y mejor facilidad de testing.

### 13. Redundancia Semántica en Inyección asíncrona (Quality Review S9.1)
* **Contexto (S9.1 QR):** Durante el pipeline de parseo JSON (`flattenTokens`), la intercepción de variables tipo `default` causa que la iteración continúe y genere duplicaciones en memoria (ej. `--color-text` y `--color-text-default`).
* **Acción Futura:** Añadir un `return;` interno iterativo en `flattenTokens` o manejar la sub-llave con condicionales mutuamente excluyentes para economizar milisegundos de arranque y aligerar la entropía del `:root` en el navegador.

### 14. Delegación de Responsabilidad de Topological Guard (H6/H7)
* **Contexto (S9.2 AR):** El diseño inicial del `ModalStackController` delegó la comprobación de profundidad (Max Depth Guard) al propio generador visual (`FormEngine.renderForm`), fragmentando la responsabilidad.
* **Acción Futura:** Refactorizar el diseño para que el método puro `ModalStackController.push()` sea el único soberano responsable de evaluar la profundidad y devolver un booleano (Aceptado/Rechazado), absorbiendo la lógica de detonación de alertas y manteniendo el controlador visual limpio.

### 15. Corrupción de Estado Global tras Extracción de Modal Stack (Quality Review S9.2)
* **Contexto (S9.2 QR):** Al abstraer `formModalStack` a un Controller IIFE, existe el altísimo riesgo de olvidar migrar el reseteo explícito de la variable global `currentEditId` que se ejecutaba en la rutina antigua al cerrar todos los modales. 
* **Acción Futura:** Asegurar que `ModalStackController.pop()` o `closeTop()` fuerce proactivamente la mutación de `window.currentEditId = null` y reasigne `window.currentFormModal` apropiadamente si el LIFO queda vacío, previniendo ediciones accidentales sobre registros limpios.

### 16. Fallo Silencioso en Garbage Collection UI (Quality Review S9.2)
* **Contexto (S9.2 QR):** El plan sugirió usar `modal.dismiss().then(() => modal.remove())` para eliminar el nodo Ionic. Si `dismiss()` dispara un error (ej. superposición de overlays), la promesa es rechazada, omitiendo el `.then()` y provocando un Memory Leak visual (DOM Node zombi).
* **Acción Futura:** Aplicar una cadena de promesas tolerante a fallos: `modal.dismiss().catch(()=>{}).finally(() => modal.remove())` garantizando matemáticamente la destrucción final del nodo desprendido (Zero-Trust al Lifecycle de Ionic).

### 17. Ausencia de Safety Checks en DOM Inyectado (Quality Review S9.2)
* **Contexto (S9.2 QR):** En `closeTop()`, se asume ciegamente que el objeto devuelto por `stack.pop()` siempre contedrá el método nativo `.dismiss()`. Si el DOM llegara a mutilarse remotamente o el objeto perdiera su interfaz gráfica (mutación de Frameworks externos), la llamada cruda reventaría con un *TypeError*.
* **Acción Futura:** Agregar Guard Clauses formales tipo `if (topModal && typeof topModal.dismiss === 'function')` antes de ejecutar el ciclo de vida de Ionic para blindar totalmente el Controlador contra corrupciones de punteros nativos.

### 18. Contaminación del Global Namespace por Controladores Utilitarios (H11/H12)
* **Contexto (S9.3 AR):** Durante la extracción DRY del FormEngine, las funciones `_populateSelectOptions` y `_bindLevelChangeRepaint` se inyectaron directamente al objeto `window` para asegurar el minimum viable scope sin refactorizar la orquestación del empaquetado. 
* **Acción Futura:** En futuras épicas donde extraigamos esta lógica hacia archivos dedicados (ej. `utils.js` o ESM Modules), estos helpers procedimentales deben encapsularse dentro de un Namespace formal genérico (ej. `const UI_Factory = { ... }`) para mitigar cualquier riesgo de colisión de verbos a escala global.

### 19. Ausencia de Defensividad Tipo "Type Checking" en Helpers DRY (Quality Review S9.3)
* **Contexto (S9.3 QR):** Las abstracciones creadas recientemente (`_populateSelectOptions`) operan incondicionalmente bajo la presunción semántica estricta (`dataArr.forEach()`). Si las asincronías fallaran inyectando un tipo divergente (`null`, `string`, `undefined`) a los inyectores procedimentales globales, la aplicación colapsará visualmente en su totalidad por una variable no iterable.
* **Acción Futura:** Incrustar validaciones puras iniciales en las utilidades visuales (`if (!Array.isArray(dataArr)) return;`) para salvaguardar la robustez del V8 Engine.

### 20. Violación DRY Potencial en Guard Clauses de Redes Complejas (Trade-Off S9.4)
* **Contexto (S9.4 AR):** Como parte de la estabilización matemática de la topología SCD-2, introdujimos *Guard Clauses* idénticas tipo `if (!Array.isArray(x)) return []` sobre `strategy_1toN` y `strategy_MtoN`. Arquitectónicamente decidimos no extraer estas 2 líneas a un interceptor para evitar profundidades de indirección en un archivo de solo 60 líneas (H6 vs H4).
* **Acción Futura:** Si el modelo de datos de Govermance incorpora nuevas estrategias matemáticas de cierre futuro (Ej. Topologías de *Grafo Cíclico Limitado* o *Árboles de Propagación Forzada*), la replicación manual de estos 2 renglones constituirá formalmente una violación al principio DRY. Se recomienda extraerlos a una abstracción como `validateTopologyPayload()` antes de instanciar un tercer Handler Topológico.

### 21. Desarrollo de Suites Unitarias Jest Pruebas de DOM Desacoplado (AR S10.1)
* **Contexto (S10.1 AR):** Tras migrar las condicionales jerárquicas ($O(N)$) de opacidad y *disable* lógico de listas en el componente relacional hacia el retorno puro `{isDisabled, opacity, placeholder}` de `SubgridState.evaluateFieldState`, la validación topológica quedó 100% aislada de Google Apps Script.
* **Acción Futura:** Instanciar formalmente un `SubgridState.test.js` e incorporar una Suite en Jest de pruebas *NodeJS-Native* orientada ciegamente a verificar el dictamen lógico de estados del UI al inyectar reglas complejas (ej. `rules.rootRequiresNoParent`). Esto cimenta el estándar Unit-Tested Isomórfico impulsado en S10.1.

### 22. Pipeline de Minificación para SSoT CSS (AR S10.2)
* **Contexto (S10.2 AR):** Tras extraer exitosamente el Shadow-DOM de 660 líneas desde `DataView_UI.html` hacia el archivo absoluto `CSS_App.html`, nuestro archivo maestro ahora concentra +1100 líneas de reglas estáticas.
* **Acción Futura:** Al despachar a Producción o instanciar una Épica de Rendimiento, se recomienda integrar un *Build Tool* ligero (ej. gulp-clean-css o esbuild) exclusivo para minificar el contenido de `CSS_App.html` (quitar espacios, comentarios arquitectónicos y retornos de carro) ahorrando entre un 30% a 50% de peso (Payload) de transferencia de red HTTP hacia el navegador cliente.
