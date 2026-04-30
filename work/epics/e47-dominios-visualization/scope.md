# Epic Scope: E47 - Dominios Import and Visualization

## Objective
Standardize the "Dominios" entity schema to match "Capacidades", enable bulk ETL ingestion from Google Sheets/CSV, and implement a hierarchical ECharts Capacity-like visualization (Treemap) for Domains.

## In Scope
- Refactor `APP_SCHEMAS.Dominio` in `Schema_Engine.js` to align headers (`id_externo`, `descripcion`, `orden_path`, `contexto_completo_analisis`, `path_completo_es`).
- Ensure the ETL engine maps the new Dominios schema perfectly.
- Create or reuse the ECharts Treemap visualization for Dominios.

## Planned Stories
- [x] **S47.1**: Refactor Domain schema in `Schema_Engine.js` to match Capacidad schema.
- [x] **S47.2**: Verify and configure ETL Bulk Import for Dominios.
- [x] **S47.3**: Implement ECharts Treemap Visualization for Dominios.
- [x] **S47.4**: Implement Topological Auto-Inference (`orden_path`) fallback for missing edges.
- [x] **S47.5**: Harden Graph Edge Resilience against invisible whitespace artifacts.
- [x] **S47.6**: Implement Strict Root Enforcement to isolate orphaned sub-levels from the main view.
- [x] **S47.7**: Adjust Treemap depth expansion (`leafDepth: 2`) to show multiple nested levels by default.

## Done Criteria
- [x] Schema is aligned.
- [x] Bulk upload works for Dominios.
- [x] Treemap visualization renders for Dominios.
- [x] Root view accurately isolates Nivel 0 and displays Nivel 1/2 dynamically without polluting the canvas with orphaned nodes.
