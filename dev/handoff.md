# Proyecto Taxonomía - Handoff State (Post Epic E14)
**Última Actualización:** Al cierre de la sesión E14 (15 Ago 2026).
**Propósito:** Este archivo sirve como puente cognitivo para inicializar un nuevo chat/agente AI preservando el contexto crítico de la sesión anterior.

## 1. Estado Actual de Desarrollo
*   **Epic E14 (The Modularization Epoch):** Completada y fusionada a `develop`.
*   **Logros de la Épica:** 
    *   Erradicación de variables globales (sustituidas por LocalEventBus/PubSub).
    *   Migración a ES6 Syntax (Template Literals, Arrow Functions).
    *   Destrucción asíncrona estricta del DOM (`try/finally` para Modales).
*   **Auditoría de Arquitectura:** Se levantó un reporte exhaustivo (`src_modules_audit_grouped.md` local) analizando la densidad de líneas de todo el ecosistema FrontEnd.

## 2. Deuda Técnica Fichada (Para Epic E15)
*   **Monolitos Críticos:** `FormRenderer_UI.html` (764 líneas) y `DataView_UI.html` (759 líneas) son demasiado grandes y mezclan responsabilidades (DOM, Caching, Parsing CSV). Son el objetivo inminente para la próxima fase de fragmentación.
*   **Pipeline Vulnerable (AST):** Se descubrió mediante un *White Screen of Death* que nuestro script de `deploy.js` es ciego ante errores de sintaxis Javascript cuando este se aloja crudo dentro de un `<script>` HTML. *Solución pendiente:* Integrar validación AST (ej. `acorn` / `esprima`) antes de invocar `clasp push`.
*   **Inyección Isomórfica:** Se resolvió un bug asíncrono con `evaluateFieldState` en `SubgridState.js` porque debe serializarse manualmente vía `.toString()` en el `Index.html`. Esta es una fragilidad por diseño.

## 3. Próximos Pasos (Next Session)
1. **Planificar Historias E15:** Diseñar la estrategia quirúrgica para extraer el "CSV Parser" de `DataView_UI` y separar el "Lookup Hydrator" de `FormRenderer_UI`.
2. **Robustecer CI/CD:** Implementar el validador AST local en el script de despliegue Node para prevenir fallas V8 crudas.

**Directriz de Recuperación para IA:** Al inicializar un chat nuevo leyendo este archivo, el agente entenderá perfectamente en qué estado quedó el código, qué se prioriza a continuación y cuáles fueron los aprendizajes inmediatos.
