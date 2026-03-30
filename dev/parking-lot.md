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
