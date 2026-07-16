# Epic Brief: ETL Legacy Migration

## Hypothesis
Migrating the remaining legacy ETL logic from `DataEngine_ETL.client.js` to the backend `Engine_ETL.js` / `Job_Worker.js` will allow us to completely delete the old frontend ETL module, reducing technical debt, standardizing all mass imports through the central Queue, and improving maintainability.

## Success Metrics
- 100% of ETL business rules run asynchronously in the backend.
- `DataEngine_ETL.client.js` and `DataEngine_ETL_Capacidades.client.js` are completely deleted from the codebase.
- No loss of functionality during mass imports for Persona, Dominio, and Capacidad.

## Appetite
1-2 days of development.

## Rabbit Holes
- The XLSX parsing for `Capacidad` might require a specialized server-side parser or a change in business process to use a flat CSV. We must clarify this before implementing.
