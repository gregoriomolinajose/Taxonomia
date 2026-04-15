---
epic: E35
topic: Detalles Estéticos y Refinamiento UX (incl. Test Automation Vitest)
date: 2026-04-15
---

# Retrospectiva de Épica E35

## 1. Métricas de Épica
- **Historias Completadas:** 3 (S35.1, S35.3, S35.4)
- **Tasa de Errores Críticos (Producción):** 0
- **Estabilidad de la Pruebas:** Migradas a Vitest, >200 Pruebas exitosas (H10 y Gobernance verificada).

## 2. ¿Qué funcionó bien?
- Trasladar el ID dinámico a los Drawers estáticos de UI.
- Evitamos dependencias externas asíncronas para extraer los IDs de los Nodos.
- Refactorización de pruebas a _Vitest_, resolviendo dependencias frágiles de Common JS.

## 3. Desafíos y Patrones Descubiertos
- **Desafío:** `Adapter_Sheets.upsert.test.js` era altamente frágil porque validaba aserciones basadas en la cantidad de campos insertados o auto-aprovisionados.
- **Aprendizaje:** Implementar aserciones *ortogonales* orientadas a capas conceptuales (no técnicas).

## 4. Mejoras Sistemáticas Aplicadas
- Agregamos Strict-Driven Architecture (`Schema_Engine`) para fallar tempranamente cuando un nodo carece de `primaryKey`. 
- Incorporación exitosa de interceptores en `jest.setup.js` para simular GAS en Vitest.

## Próximos pasos
1. Lanzar diseño e iteraciones de Épica E36.
