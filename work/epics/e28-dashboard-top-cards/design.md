# Epic Design: E28 Visibilidad de Estructura Ágil en Dashboard

## 1. Gemba (Perspectiva Arquitectónica)
Actualmente, el área principal (`Dashboard_UI.html`) solo presenta información de bienvenida sin extraer métricas vivas de la Base de Datos. Contamos con un `Engine_DB.list()` funcional que posee caché en nivel de servidor (RAM de Apps Script) que mitiga golpes I/O a Sheets o Cloud DB.

## 2. Decisiones Arquitectónicas (ADRs Ligeras)
1. **Delegación de Conteo (Server-Side vs Client-Side):**
   - No enviaremos todo el array de datos (`list()`) al frontend para contarlo allí.
   - Construiremos un endpoint RPC puntual (ej. `API_GetDashboardCounters()`) en el servidor para que solo viaje el "JSON de sumatorias".
   - Esto abarata costos de transferencia y respeta el rendimiento frontend.
2. **Estilizado (CSS):**
   - Mantenimiento estricto de UI Cohesion: El contenedor debe acatar `color: var(--sys-on-surface); background: var(--sys-surface);` entre otros, garantizando Dark Mode instantáneo e imperceptible. No se usarán IDs absolutos con configuraciones ad-hoc.

## 3. Story Breakdown
- [ ] **S28.1 - Backend Counters API (Size: XS):** 
  - Archivos: `API_Universal.gs` / `Controller_Action.gs`
  - Dependencias: Ninguna.
  - Implementación de la función `API_GetDashboardCounters()` que haga `Engine_DB.list('Equipo').rows.length` (y las demás entidades) utilizando la caché del motor.
- [ ] **S28.2 - Dashboard Cards UI Component (Size: S):**
  - Archivos: `Dashboard_UI.html` (y nuevo `UI_DashboardCards.client.js` si aplicase arquitectura modular, de lo contrario embebido).
  - Dependencias: S28.1.
  - Maquetación Flexbox de `dashboard-cards`, aplicando el sistema de grillas o Flex del Design System y estados vacíos ("Skeletal loading" o "Cargando...").

## 4. Contratos de Inyección (API)
```json
{
  "status": "success",
  "data": {
     "Portafolio": 25,
     "Equipo": 40,
     "Persona": 230
  }
}
```

## 5. Riesgos y Mitigaciones
- **Rápida expiración de Sesión / Tiempos Altos:** Apps Script puede demorar ~600ms a 1.2s en levantar el contenedor si no hay uso. 
  - **Mitigación:** Asegurar que el front pinte un *Skeleton Loading* mientras el promise se resuelve, evitando bloquear a los usuarios a que naveguen a otras pantallas como "Seguridad" o "DataView" si no quieren esperar los números.
