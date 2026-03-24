# Epic Scope: Executive Dashboard (ApexCharts + Ionic Grid)

## Objective
Integrate an internal Business Intelligence engine using ApexCharts.js into the Single Page Application's "Inicio" (Home) view, powered by existing cached data for zero latency.

## In Scope
- Phase 1: Inject ApexCharts.js CDN into `Index.html`.
- Phase 2: Create the UI Canvas using Ionic Grid within the main container for two charts.
- Phase 3: Implement `renderDashboard()` data mining engine for Topology (Donut) and Capacity (Bar) charts using data from `window.__APP_CACHE__['Equipo']`.
- Phase 4: Implement safe initialization (Guardrail) to prevent memory leaks or duplicate rendering.

## Out of Scope
- Backend aggregations (all data mining happens in-memory on the frontend).
- Charts for entities other than `Equipo` at this moment.

## Done Criteria
- The two charts correctly display data from the cache.
- Navigation away from and back to "Inicio" cleanly destroys and re-renders the charts without duplication.
- Code is properly committed and documented.
