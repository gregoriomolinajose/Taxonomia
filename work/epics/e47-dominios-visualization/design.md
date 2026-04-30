# Design: E47 - Dominios Import and Visualization

## Architecture Decisions
1. **Schema Standardization**: We will force `Dominio` to share the exact same field semantics as `Capacidad` to reuse the ETL and UI logic.
   - `id_registro` -> `id_externo`
   - `definicion` -> `descripcion`
   - Added: `orden_path`, `contexto_completo_analisis`, `path_completo_es`.
2. **ETL Reuse**: By standardizing the schema, the existing `Adapter_Sheets` logic will automatically pick up the right fields.
3. **UI Reuse**: `UI_View_ECharts.client.js` is already designed to be entity-agnostic. We just need to ensure `DomainMap_UI` or `UI_DataView_Toolbar` registers the "Treemap" button for the "Dominio" entity and maps the fields properly.
