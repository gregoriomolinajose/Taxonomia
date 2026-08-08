---
epic_id: "e67"
title: "Optimización Extrema de Carga Inicial y Postura de Seguridad"
status: "draft"
created: "2026-08-08"
---

# Epic Brief: Optimización Extrema de Carga Inicial y Postura de Seguridad

## Hypothesis
For los usuarios finales que experimentan tiempos de carga excesivos (7+ segundos) en su primera interacción con el sistema,
the solución es una reingeniería de la hidratación inicial y caché de seguridad
that entrega la pantalla inicial y los datos críticos en menos de 2.5 segundos, validando permisos sin bloquear el hilo principal.
Unlike el estado actual de carga monolítica y ABAC bloqueante, our solution difiere inteligentemente scripts secundarios, inyecta la identidad pre-calculada, e hidrata de forma progresiva.

## Success Metrics
- **Leading:** El payload de inicialización se reduce drásticamente; `AuthManager.init()` se invoca solo una vez; scripts CDN se difieren; tiempo al Time-To-First-Byte y DOMContentLoaded baja considerablemente.
- **Lagging:** El tiempo de carga percibido se reduce a menos de 2.5 segundos, y la invalidación de permisos funciona de forma segura y veloz usando `CacheService`.

## Appetite
M — [S=2-4 stories, M=5-7, L=8-10]

## Scope Boundaries
### In (MUST)
- Eliminar la invocación duplicada y añadir guard de idempotencia en `AuthManager.init()`
- Corregir el bypass de caché en `Engine_DB.list` para formato `tuples`
- Carga selectiva de tablas para Dashboard (`uiConfig.dashboardCard`, `uiConfig.dashboardDirectory`) en `getAppBootstrapPayload`
- Diferir librerías pesadas (ECharts, SheetJS, ApexCharts)
- Consolidad I/O a `PropertiesService` en un solo llamado en `doGet`
- Precalcular identidad ABAC en caché e inyectar al HTML

### In (SHOULD)
- Splash genérico (sin leakage de schema ni UI interna)
- Resolver el bloqueo de avatar al inicio
- Podar backend properties del `APP_SCHEMAS` inyectado al frontend

### No-Gos
- Reescribir todo el backend de ABAC, esto es optimización, no reconstrucción de reglas ABAC.
- Re-diseñar el Dashboard visualmente.

### Rabbit Holes
- Tratar de precargar demasiadas cosas, la idea es Lazy Load donde sea posible.
