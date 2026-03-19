---
type: guardrails
version: "1.0.0"
---

# Guardrails: Taxonomia Project

> Code and architecture guardrails — fill with /rai-project-create or /rai-project-onboard

---

## Guardrails Activos

### Code Quality

| ID | Level | Guardrail | Verification | Derived from |
|----|-------|-----------|--------------|--------------|
| GR-01 | must- | Engine_DB es un Enrutador agnóstico, sin llamadas directas a Apps Script APIs. | Code Review | docs/rules_db.md |
| GR-02 | must- | Dual-Write mandatorio a Sheets y CloudDB. | Architecture Review | docs/rules_db.md |
| GR-03 | must- | Encabezados a db transformados a snake_case estrictamente. | Unit Test | docs/rules_db.md |
| GR-04 | must- | Uso exclusivo de Web Components de Ionic para UI dinámico. | Code Review | docs/rules_ui.md |
| GR-05 | must- | Progressive Disclosure: usar ion-stepper para formularios largos. | UX Review | docs/rules_ui.md |
| GR-06 | must- | Toda entidad en esquemas debe ser un Object y definir campos en array fields. | Logic test | docs/business_model.md |
| GR-07 | must- | Todo cambio debe inyectar created_at, updated_at, updated_by. | DB Audit | docs/rules_db.md |
