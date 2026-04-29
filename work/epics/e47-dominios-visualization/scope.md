# Epic Scope: E47 - Dominios Import and Visualization

## Objective
Standardize the "Dominios" entity schema to match "Capacidades", enable bulk ETL ingestion from Google Sheets/CSV, and implement a hierarchical ECharts Capacity-like visualization (Treemap) for Domains.

## In Scope
- Refactor `APP_SCHEMAS.Dominio` in `Schema_Engine.js` to align headers (`id_externo`, `descripcion`, `orden_path`, `contexto_completo_analisis`, `path_completo_es`).
- Ensure the ETL engine maps the new Dominios schema perfectly.
- Create or reuse the ECharts Treemap visualization for Dominios.

## Planned Stories
- [ ] **S47.1**: Refactor Domain schema in `Schema_Engine.js` to match Capacidad schema.
- [ ] **S47.2**: Verify and configure ETL Bulk Import for Dominios.
- [ ] **S47.3**: Implement ECharts Treemap Visualization for Dominios.

## Done Criteria
- [ ] Schema is aligned.
- [ ] Bulk upload works for Dominios.
- [ ] Treemap visualization renders for Dominios.
