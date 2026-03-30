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
