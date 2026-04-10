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

### ✓ AST RegExp CSS Minifier (H14)
* **Resolución:** [E30] Promovido a la iteración Bug Bash.

### ✓ Evolución de ThemeManager (H1)
* **Resolución:** [E30] Promovido a la iteración Bug Bash.

### ✓ Limpieza Segura de Assets Temporales (H4)
* **Resolución:** [E30] Promovido a la iteración Bug Bash.

### ✓ Robustez en Muteo Estructural de Componentes Relacionales (H10)
* **Resolución:** [E30] Promovido a la iteración Bug Bash.

### ✓ Proxy DOM Pasivo a Estado Local (H6)
* **Resolución:** [E30] Promovido a la iteración Bug Bash.


## 🏗️ Deuda Topológica y Estructural Activa

*(No hay items activos inmediatos, los pendientes fueron movidos a E30)*


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

### 18. Encapsulamiento del Motor ABAC en Frontend (H2)
* **Origen:** Arch Review Epic 18 (S18.4).
* **Acción Causal:** El Helper frontal `window.ABAC.can()` accede globalmente a `__ABAC_CONTEXT__`. A medida que el framework de Acceso crezca con atributos paramétricos (Attribute-Based Policies complejas), evaluar su migración de un "Namespace Helper/Diccionario Crudo" hacia una Clase Instanciada de ES6 con gestión activa de estado.

### 19. Travesías ABAC M:N (parentStrategy: GRAPH)
* **Origen:** Análisis Edge Cases (S18.3).
* **Acción Causal:** El escalamiento jerárquico actualmente asume una travesía bottom-up 1:N por Llave Foránea matemática. Si en un futuro el negocio requiere heredar permisos mediante relaciones polimórficas (Grafo Temporal en `Relacion_Dominios`), introducir una propiedad `parentStrategy: "GRAPH"` en `topological_metadata` para invocar la recursión por medio de `Engine_Graph.js`.

### 20. Extracción de Layout Master-Detail (H10)
* **Origen:** Arch Review Epic 24 (S24.8).
* **Acción Causal:** El panel Sliding-Drawer Jira-Style salta iterativamente el renderizado dinámico modal del DataViewEngine. Cuando surja la demanda de usar Master-Detail en dominios de negocio, integrar dinámicamente un parámetro de template layout: 'split-pane' nativamente al Data Engine.
