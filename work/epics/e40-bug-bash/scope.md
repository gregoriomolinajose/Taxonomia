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
| S40.2 | E2E Playwright: Tests de Resiliencia Interactiva | TODO |

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
