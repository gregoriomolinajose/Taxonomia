# Epic Brief: Executive Dashboard (ApexCharts + Ionic Grid)

## Hypothesis
By integrating a Business Intelligence engine using ApexCharts.js on the main dashboard, we can provide executives with instant, zero-latency visualizations of organizational topology and capacity, leveraging the existing frontend cache (`window.__APP_CACHE__`).

## Success Metrics
- Zero-latency rendering of the charts using `window.__APP_CACHE__`.
- Accurate representation of team topology (Donut chart by `tipo_equipo`).
- Accurate representation of team capacity (Bar chart by `nombre_equipo` and `total_integrantes`).
- No duplicate chart initializations when navigating between views and returning to "Inicio".

## Appetite
1 Sprint cycle.

## Rabbit Holes
- Potential race conditions if the dashboard attempts to render before `window.__APP_CACHE__` is fully populated.
- Duplication of ApexCharts instances if not properly destroyed upon view changes.
