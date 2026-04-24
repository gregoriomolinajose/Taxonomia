# Epic E40: Bug Bash Sprint

**Fecha:** 2026-04-16
**Estado:** In Progress (Desarrollo)

## Objective
Resolver bugs funcionales, deuda técnica o defectos recién detectados por el desarrollador para garantizar la estabilidad operativa del entorno.

## In Scope
- Recopilación, depuración y resolución del bug recién detectado.
- (Por documentar: Detalles específicos del bug una vez que se describa en la etapa de Epic Design / Problem Shape).

## Out of Scope
- Nuevas funcionalidades mayores (Features).
- Cambios disruptivos en la arquitectura del motor de persistencia a menos que sean un Fix crítico.

## Stories Preparadas
*(Se desglosarán en `/rai-epic-design` cuando brindes los detalles del bug)*

| ID | Nombre | Estado |
|---|---|---|
| S40.1 | Bug Fix: Drawer Header ReferenceError (WSOD) | DONE |
| S40.2 | E2E Playwright: Tests de Resiliencia Interactiva | DONE |
| S40.3 | E2E Playwright: Tests de Integridad ETL y OCC de Carga Masiva (Bug Bash) | DONE |
| S40.4 | Bug Fix: Falla de Hidratación de Schema Defaults en Capa Bulk ETL (Headless) | DONE |
| S40.5 | DataGrid Custom Ordering Refactor & QA Fix | DONE |

---

## Debug Summary (S40.1)
**Problem:** `Uncaught ReferenceError: targetTitleField is not defined` detonando la pantalla blanca (WSOD) al editar cualquier campo.
**Root Cause (5 Whys):**
1. *Why?* El event listener `updateDynamicHeader` (ubicado en `FormRenderer_UI.client.js`) usa la variable `targetTitleField` pero no está definida localmente.
2. *Why?* Esa variable fue eliminada durante el refactor de la Épica E35 (Historia S35.1), cuando la carga del título se desacopló hacia el nuevo helper externo `UI_Factory.buildDrawerHeader`.
3. *Why?* El desarrollador extrajo la generación del DOM del Header, pero olvidó eliminar el event listener anexo responsable de actualizar ese antiguo DOM al teclear.
4. *Root Cause:* Lógica huérfana de interfaz (EventListener zombie) de un componente extraído previamente, capturando y colisionando contra variables muertas del scope léxico.

**Countermeasure (Fix):**
Removida la clausura obsoleta `updateDynamicHeader` y sus dos delegaciones a `input` e `ionInput` desde el `FormRenderer_UI.client.js`. Ahora toda la gestión del título dinámico se delega naturalmente sin causar errores.

**Prevention:** 
El código obsoleto fue borrado. Vitest SPA Tests ejecutados comprobando 0% de regresiones visuales *(✓ 224 passed)*.

---

## Debug Summary (S40.4)
**Problem:** Durante la Carga Masiva (ETL), el campo "estado" se guardaba en blanco en lugar de asumir su valor `Activo` establecido estructuralmente en el diccionario de la entidad.
**Root Cause (5 Whys):**
1. *Why?* La red no transmitió la llave `estado` porque el CSV original prescinde limpiamente de columnas de auditoría.
2. *Why?* Al iterar sobre los encabezados para armar la inyección `Adapter_Sheets.upsertBatch`, se topó con un vacío.
3. *Why?* El adaptador, en los casos de ausencia de variable local, estaba programado para empujar asertivamente un string vacío `''`.
4. *Root Cause:* Deuda Autónoma de Repositorio. La lógica de generación de Default Values residuales (`defaultValue`) estaba ligada de manera acoplada al renderizador HTML (`UI_Factory.buildHidden`) en vez de pertenecer a la persistencia estricta. El motor ETL, al carecer de un DOM o Form Builder, evadía dichas inicializaciones.

**Countermeasure (Fix):**
Modificados los vectores de ensamblaje en `Adapter_Sheets.upsert` y `upsertBatch`. Se infundió una compilación cruzada `defaultValuesMap` en O(C) que hidrata nativamente los vacíos del payload cuando el `Schema_Engine` dicta un Standard (ej: "Activo").

**Prevention:**
El test E2E de Identidad Semántica fue amputado explícitamente del valor "estado" y recargado con una sonda de aserción ReadFull cruzada al final del loop para comprobar algorítmicamente que el servidor ahora sana y rellena transparentemente a sus espaldas.
