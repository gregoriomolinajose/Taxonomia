# Backlog & Parking Lot (Post-Epic 11 / E12+)

Este documento condensa la Deuda Técnica material devuelta por los heurísticos de la última Quality Review.

## 🗑️ Historial de Deuda Técnica Resuelta

### ✓ FormContext Object Injection (H8)
* **Origen:** Arch Review Epic 14 (S14.1).
* **Resolución:** [E14] La arquitectura FormBuilder_Inputs fue desmantelada e invertida por Factory patterns orgánicos.

### ✓ Granularidad Múltiple en DataGrid (H4)
* **Origen:** Arch Review Epic 14 (S14.4).
* **Resolución:** [E16] Durante DataGrid Minimalism aislamos el SearchBox, alcanzando SRP sin sobre-fracturar micro-archivos.

### ✓ RBAC Validations (Zero-Trust Frontend)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Resolución:** [E18] Escalado orgánicamente a Épica y ejecutándose centralmente en la presente Gobernanza ABAC.

### ✓ Decoupled Pub/Sub en Vistas Recursivas (AppEventBus)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Resolución:** [E15] El SPA implementó `LocalEventBus` mitigando fugas orgánicamente durante el Cleaning Sprint.


## 🏗️ Deuda Topológica y Estructural Activa

### 2. AST RegExp CSS Minifier (H14)
* **Origen:** Arch Review Epic E11 (`deploy.js`).
* **Acción Causal:** Abandonar la regex casera en favor de integrar oficialmente _Rollup_ o _Esbuild_ al pipeline Node.js si la densidad de tokens/alias CSS de Ionic se descontrola en la siguiente iteración.

### 10. Evolución de ThemeManager (H1)
* **Origen:** Arch Review Epic 14 (S14.2).
* **Acción Causal:** El script `UI_ThemeManager.html` fue extraído exitosamente aislando `window.hydrateThemeConfig()`. Al tener una única implementación inyectada en crudo, se propone evaluar su migración a una Clase ES6 formal orquestada dinámicamente por `AppController` en iteraciones futuras de arquitectura.

### 11. Limpieza Segura de Assets Temporales (H4)
* **Origen:** Arch Review Epic 14 (S14.2).
* **Acción Causal:** La eliminación forzada del directorio temporal `.build/assets` en `deploy.js` previene colisiones con Clasp. Evaluar si delegar esta exclusión estrictamente al filtro pasivo de `.claspignore` (ej. ignorar `**/*.css` nativo) es preferible frente a operaciones activas de File System (Mutación) en el pipeline script.


## 🚀 Next-Gen MDM Architecture (Post-Epic 14 / Roadmap)

### 14. Motor de Optimistic Locking
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** Implementar bloqueo optimista para prevenir colisiones concurrentes. Si el *Usuario B* guarda sobre un registro modificado más recientemente por el *Usuario A*, el sistema debe frenar la escritura, notificar quién lo alteró y solicitar confirmación de sobreescritura.

### 15. Typeahead Debounce para Paginación de Selects (Big Data)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** Prevenir el colapso del DOM en listas de catálogo masivas (N > 2,000, ej. Incidentes). Introducir el flag `lookupType: "async"` en el esquema para que el backend renderice un buscador con Debounce (300ms) que cargue silenciosamente bloques de 20 records.

### 16. Soft-Delete Unidireccional (Huérfanos Ocultos)
* **Origen:** Sesión de Diseño S14.5 (Edge Cases MDM).
* **Acción Causal:** El borrado lógico de un Padre (ej. Portafolio) NO debe mutar el estado de sus hijos físicos en la base de datos (se mantienen intactos). `Engine_Graph.js` asume la responsabilidad topológica in-line: si detecta al padre como eliminado, automáticamente omite del DOM a sus hijos por herencia de grafo.

### 17. Robustez en Muteo Estructural de Componentes Relacionales (H10)
* **Origen:** Arch Review Epic 18 (S18.4).
* **Acción Causal:** El Hiding Pasivo en `FormRenderer_UI` utiliza selectores CSS ("catch-all" con `pointer-events: none`) para bloquear elementos exóticos y chips generados por `UI_SubgridBuilder`. Se propone inyectar a futuro un parámetro formal `readonly: true` vía *prop drilling* desde el inicializador del subgrid para que este se auto-restrinja desde su pipeline estructural nativo.

### 18. Encapsulamiento del Motor ABAC en Frontend (H2)
* **Origen:** Arch Review Epic 18 (S18.4).
* **Acción Causal:** El Helper frontal `window.ABAC.can()` accede globalmente a `__ABAC_CONTEXT__`. A medida que el framework de Acceso crezca con atributos paramétricos (Attribute-Based Policies complejas), evaluar su migración de un "Namespace Helper/Diccionario Crudo" hacia una Clase Instanciada de ES6 con gestión activa de estado.
