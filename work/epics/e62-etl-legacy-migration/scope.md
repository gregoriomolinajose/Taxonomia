# Epic Scope: e62-etl-legacy-migration

## Objective
Migrate all remaining entity-specific business rules from the legacy frontend ETL algorithm to the modern backend Job Worker system, enabling the complete deprecation of `DataEngine_ETL.client.js`.

## In Scope
- Migration of `Persona` `ALLOWED_DOMAINS` validation to the backend (`Business_Interceptors` or `hydrateAndDeduplicate`).
- Migration of `Persona` auto-provisioning (Workspace Sync) to trigger automatically after the ETL job completes (Job Queuing chaining).
- Migration of `Dominio` dynamic topology mapping (`relaciones_padre` from `orden_path`).
- Migration of Date formatting fallback to ISO 8601 globally in `Engine_ETL.js`.
- Flattening de XLSX (Capacidades) para soportar archivos de jerarquía anidada Macro/Capacidad.
- Complete deletion of `DataEngine_ETL.client.js` and `DataEngine_ETL_Capacidades.client.js`.

## Out of Scope
- Rewriting the entire Google Sheets generation logic.
- Changing the fundamental schema structure for entities.
- Any UI/UX changes on the ETL modal (already covered in e61).

## Planned Stories
- [x] S62.1 Migrate Persona Rules (Allowed Domains & Auto-Sync) ✓
- **S62.2:** Migrate Dominio Dynamic Topology
- **S62.3:** Capacidad Flattening Strategy & Global Date Parsing
- **S62.4:** Clean up legacy ETL modules

## Progress Tracking
| Story | Status | Estimated Time | Actual Time | Velocity |
|-------|--------|----------------|-------------|----------|
| S62.1 | Completed | 120m | 120m | 1.0 |
