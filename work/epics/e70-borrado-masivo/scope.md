# Epic 70: Borrado Masivo (Bulk Delete)

## Objective
Implementar la funcionalidad de borrado masivo en el DataGrid, permitiendo a los usuarios seleccionar múltiples registros mediante checkboxes y eliminarlos en lote desde el Toolbar superior, respetando las políticas de ABAC y la topología del grafo.

## Boundaries

### In Scope
- UI: Agregar botón `Eliminar N Seleccionados` en el Toolbar superior del DataGrid (`UI_DataView_Toolbar` / `DataView_UI`).
- Backend API: Exponer operación `bulk_delete` en `API_Universal`.
- Seguridad: Validar ABAC para todos los IDs seleccionados.
- Base de datos: Implementar `Engine_DB.bulkDelete` con batch update hacia Google Sheets.
- Grafo: Preservar el cierre topológico de relaciones para entidades tipo grafo.

### Out of Scope
- Interfaz gráfica para seleccionar relaciones a borrar (las relaciones dependientes se asume que se cierran por defecto).
- Soporte para restaurar registros eliminados masivamente desde la UI (esto requiere otra épica).

## Progress Tracking

| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|--------|----------|-------|
| 1 | S70.1 — UI Toolbar & Motor Base Datos Bulk Delete | M | Pending | | | |
