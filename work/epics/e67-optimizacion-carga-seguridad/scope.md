# Epic Scope: Optimización Extrema de Carga Inicial y Postura de Seguridad

## Objective
Reducir el tiempo de carga percibido y el payload de inicio a menos de 2.5 segundos, eliminando cuellos de botella bloqueantes, mejorando la seguridad de la caché ABAC y podando recursos innecesarios.

## Scope Boundaries

### In Scope
- Eliminar la doble invocación de `AuthManager.init()`
- Corregir el bug de bypass de caché de tuples en `Engine_DB.list`
- Eliminar includes duplicados en `Index.html`
- Diferir librerías pesadas en `Index.html`
- Carga selectiva de tablas para Dashboard en `getAppBootstrapPayload`
- Caché ABAC con invalidación cross-tenant
- Solucionar vulnerabilidades menores detectadas (Avatar XSS, Domain Leakage)
- Consolidar I/O de `PropertiesService` en `doGet()`
- Inyectar Identidad al HTML para ahorrar RPC
- Mostrar Splash Genérico
- Podar Metadata backend del `APP_SCHEMAS` inyectado

### Out of Scope
- Refactorización visual del Dashboard
- Refactorización de la lógica core de ABAC (solo optimización de su carga y persistencia)
- Lazy Loading de recursos más allá de los iniciales identificados.

## Planned Stories (S67)

### Progress Tracking
| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|--------|----------|-------|
| 1 | S67.1 — Correcciones Críticas Inmediatas | S | Done | - | - | Fix duplicado, caché DB y XSS (Dependencia 0) |
| 2 | S67.2 — Bootstrap Selectivo y Diferimiento | M | Done | 150m | - | Diferir CDNs, carga lazy de tabs y poda de esquema (Depende de S67.1) |
| 3 | S67.3 — Refactorización Server-Side (I/O y Caché ABAC) | M | Pending | - | - | Caché de seguridad cruzada, propiedades en 1 I/O (Puede paralelizarse parcialmente) |

### Milestones
- **M1: Quick Wins & Security Baseline** (Completa S67.1): Doble llamada de red eliminada, vulnerabilidades cerradas y caché básico de tuples funcionando.
- **M2: UI No-bloqueante** (Completa S67.2): App renderiza y reacciona de inmediato, posponiendo carga de gráficos hasta requerirlos.
- **M3: Backend Sincrónico Veloz** (Completa S67.3): `doGet` responde en mínimo tiempo usando el caché ABAC. Integración total (Epic Complete).

## Done Criteria
- Tiempo de First Contentful Paint y DOMContentLoaded reducido.
- Payload de Bootstrap reducido al menos en 50%.
- No existen llamadas duplicadas de red en el inicio.
- El sistema mantiene la correcta visualización del dashboard.
- Todos los cambios de seguridad están verificados.
