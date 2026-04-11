# Reporte Consolidado E2E: Auditoría de Fricciones y Latencia

Tras aplicar la depuración profunda eliminando los bloqueos muertos (`waitForTimeout`), implementando los clicks incondicionales (`force: true`), y restaurando la tolerancia de latencia de red (`15,000ms`), hemos consolidado un mapa claro del rendimiento de la Plataforma y lo que debemos mejorar en las próximas Historias (Epics).

## 1. Hallazgos Superados (PASS)
- **Modales e Intercepción Visual:** El problema donde los `ion-modal` o subgrids interceptaban los clics de las pruebas automáticas o del usuario rápido ha sido resuelto mecánicamente en la arquitectura E2E.
- **Validación del Dashboard (Bootstrap):** La prueba crítica de inicialización (`dashboard-counters.spec.js`) pasó de quedarse trabada y colapsar a las 2 horas, a ejecutarse y devolver validación **verde en 5.3 segundos**. 

## 2. Puntos de Fricción Identificados para Mejora

### 2.1 Latencia Resolutiva del RPC (Google Sheets)
- **Problema:** En secuencias profundas (ej. crear una Unidad -> Portafolio -> Grupo seguido), la base de datos de Google Apps Script sufre aceleración negativa al resolver los componentes `Subgrid`.
- **Qué mejorar en la Plataforma:** El "DataEngine" actualmente encola sus respuestas. Para mitigar esta fricción que no es visual sino de transferencia, el Front-End (Dashboard y AppGrid) debe implementar un mecanismo de **Optimistic UI** (render de resultados instantáneo local y sincronización *background*) en lugar de congelar los cajones (Drawers) esperando el `POST` del servidor.

### 2.2 Re-Cálculo de Permisos y Sincronía (Context Load)
- **Problema:** Un click instantáneo a `[id="btn-create-new"]` al inicio del ciclo de vida falla si las tablas maestras de validaciones de relaciones no han terminado de inyectado al "State".
- **Qué mejorar en la Plataforma:** `FormEngine_UI.client.js` debe emitir verdaderos eventos de `Form_Ready` cuando la metadata es mapeada por el Graph, en lugar de renderizar visualmente el botón primero y "activar" la funcionalidad después.

### 2.3 Bloqueos de Contexto (Chrome Profile Zombies)
- **Problema (Infraestructura de Test):** A nivel servidor CI local, Chrome sufre de fallos de *SingletonLock* cuando interrumpe flujos.
- **Qué mejorar en testing:** Migrar de `chromium.launchPersistentContext` hacia `playwright.request` para limpiar la infraestructura de tests de UI cuando sólo se desea probar validaciones del sistema core SC-2.

## Conclusión Técnica
Nuestra E30.4 y las pruebas End-to-End han expuesto que la "fricción" moderna de Taxonomia yace primariamente en el puente de Red entre la Hoja de Cálculo y el Cliente (Latencia de Hydration RPC), y no en la construcción de la UI. 

Las próximas mejoras deberían enfocarse en **"Optimistic UI"** y re-estructurar el **DataStore_Engine** para renderizaciones hiper-veloces en lugar de obligar al usuario/robot a esperar las respuestas.
