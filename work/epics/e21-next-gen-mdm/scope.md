# Epic Scope: E21 Next-Gen MDM data Layer

> **Status:** 🚧 In Progress
> **Origin:** Governance Backlog

## 📌 Context
El proyecto Taxonomia ha estabilizado su infraestructura y su Pipeline UI (E19 y E20). Ahora el foco de Deuda Técnica (Tech Debt Post-E11) y la prioridad más alta apuntan al Manejo Excepcional de Datos (MDM), al que le faltan protecciones clave para escalabilidad corporativa, tales como concurrencia, fluidez asincrona en búsquedas largas, y métodos de borrado no-destructivo, rematado con la limpieza de tests deficientes y scripts de ECMAScript obsoletos.

## 🎯 Objectives
- **Optimistic Locking:** Blindaje contra Colisiones/Sobreescrituras en Guardado y Edición con múltiples usuarios (via Hashes o Versions).
- **Asynchronous Debounce / Typeahead:** Mitigar recargas innecesarias durante la captura de filtros pesados en la base de datos y la interfaz de búsqueda.
- **Soft-Delete Graph Cleanup:** Eliminación lógica de un Nodo de Grafo en lugar de física, para mantener analiticas operando en el tiempo si hay data corrupta.
- **Quality Audits (Cleanup):** Reemplazar concatenación de ES5 (`+`) por Template Literals en archivos legacy y erradicar Tests "Mudos" sin Assertions lógicas.

## 📦 In Scope
1. Motor `Engine_DB.gs`: Version properties o ETags para cada Entity; flag de isDeleted pasivo.
2. FormEngine: Catch `OptimisticLockError` alertando elegante al usuario del conflicto.
3. Debounced EventBus o DOM Listeners.
4. QA Modulo Test.

## 🚫 Out of Scope
- Migración generalizada de BD a Cloud SQL (sigue basado en GAS/Spreadsheets).
- WebSockets o Time-Real updates (mantendremos HTTP Requests puras).

## 📝 Planned Stories
1. **[ ] S21.1: Optimistic Locking Engine & UI Catch**
2. **[ ] S21.2: Asynchronous Bus Debouncing & Typeahead Filters**
3. **[ ] S21.3: Soft-Delete Topological Integrity Implementation**
4. **[ ] S21.4: Refactor - ES5 Concats & Silent Tests Mutation**

## Implementation Plan
*Pendiente de /rai-epic-design*
