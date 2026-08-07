# Epic Retrospective: e62-etl-legacy-migration

## Objective Recap
Migrate all remaining entity-specific business rules from the legacy frontend ETL algorithm to the modern backend Job Worker system, enabling the complete deprecation of `DataEngine_ETL.client.js` and `DataEngine_ETL_Capacidades.client.js`.

## Stories Completed
- S62.1: Migrate Persona Rules (Allowed Domains & Auto-Sync)
- S62.2: Migrate Dominio Dynamic Topology
- S62.3: Capacidad Flattening Strategy & Global Date Parsing
- S62.4: Clean up legacy ETL modules

## Key Learnings
- V8 Sequential Iteration State Mutation: In Apps Script's V8 engine, mutating object state (like deleting temporary IDs) during a sequential pass over an array of nodes *while simultaneously attempting parent-child linking* causes critical race conditions and topological breakage. Multistage mapping and separate cleanup loops resolve this elegantly.
- Batch Persist: Relying on `upsertBatch` drastically mitigates Google Apps Script lock limits when loading thousands of taxonomy records.

## Metrics
- Features Migrated: Persona, Dominio, Capacidad
- Net Code Reduced: Deleted `DataEngine_ETL_Capacidades.client.js` and `DataEngine_ETL_Capacidades.html` (~573 lines deleted). Stripped legacy mappings from `UI_Component_BulkImporter.client.js`.
- Epic State: **Completed**
