# Epic E70: Borrado Masivo (Bulk Delete) - Retrospective

## Summary
- **Epic**: E70 - Borrado Masivo
- **Status**: Completed
- **Dates**: Agosto 2026

## What went well
- La implementación del borrado masivo vía `upsertBatch` y el uso de `Engine_DB.bulkDelete` logró alto rendimiento en la base de datos Google Sheets.
- Las vistas de la interfaz (`UI_DataGrid.html` y `DataView_UI.client.js`) gestionaron correctamente el estado multiselección.
- Las pruebas E2E ayudaron a descubrir bugs sutiles de la base de datos subyacente.

## What to improve
- El manejo del Soft Delete a través de OCC (Optimistic Concurrency Control) demostró tener una discrepancia entre `bulkDelete` (que inyectaba `_overrideConcurrency: true`) y el borrado individual en esquemas tipo grafo (que lo omitía).
- Las dependencias asíncronas de UI (`ion-loading`) requieren forzosamente de promesas `await window.PresentSafe` en el lado del cliente.

## Process Improvements
- Se estandarizó la eliminación visual e inyección de datos para Entidades Topológicas (Grafos).
- Refinamos los enfoques de QA en Playwright para evitar aserciones sobre estados efímeros (como Shadow DOM toasts) en favor del estado material del grid de datos.
