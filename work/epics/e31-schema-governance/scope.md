# Epic E31: Schema Engine Governance Layer — Scope

> **Status:** PLANNED
> **Release:** REL-TBD
> **Created:** 2026-04-10
> **Brief:** `work/problem-briefs/schema-engine-constraint-governance-2026-04-10.md`

## Objective

Desacoplar el catálogo de presets topológicos y plantillas de campos reutilizables de las definiciones inline de entidades en `Schema_Engine.gs`, estableciendo una **Capa de Gobernanza del Schema** que elimine la duplicación silenciosa, mejore la legibilidad y reduzca los fallos de configuración al introducir nuevas entidades o campos.

**Value:** Agregar una nueva entidad al sistema dejará de requerir redeclaración de reglas ya catalogadas. El schema pasará de crecer O(N × K) a O(N + K), donde K es el número de presets/templates y N el número de entidades. La auditoría de restricciones se vuelve trivial — una sola fuente de verdad por tipo de regla.

## Stories

| ID | Story | Size | Status | Description |
|----|-------|:----:|:------:|-------------|
| S31.1 | Auditoría de Duplicaciones en Schema_Engine | S | Pending | Inventariar todos los patrones repetidos en `Schema_Engine.gs`: topologyRules idénticos, campos comunes, y etiquetas de restricción repetidas. Produce el mapa de duplicaciones que alimenta S31.2–S31.4. |
| S31.2 | Catálogo TOPOLOGY_PRESETS | M | Pending | Extraer los bloques `topologyRules` repetidos en un catálogo `TOPOLOGY_PRESETS` con claves named (ej. `"JERARQUICA_ESTRICTA_STD"`). Implementar resolvedor transparente en `Schema_Engine` para que los consumidores no requieran cambios. |
| S31.3 | Catálogo FIELD_TEMPLATES | M | Pending | Extraer los campos comunes declarados verbatim en cada entidad (`lexical_id`, `estado`, separadores estándar) en un objeto `FIELD_TEMPLATES` con función de composición inmutable. |
| S31.4 | Migración de Entidades a Referencias | M | Pending | Refactorizar todas las entidades de `APP_SCHEMAS` para referenciar presets por clave en lugar de declararlos inline. Validar retrocompatibilidad total con `FormEngine`, `Engine_DB` y `DataView_Engine` mediante test suite. |
| S31.5 | Schema Config Studio UI (Viewer) | L | Skipped | (Replaced by S31.10-13) Interfaz de administración read-only que liste el catálogo de presets y templates. |
| S31.6 | Schema Config Studio UI (CRUD) | L | Skipped | (Replaced by S31.10-13) Extender el Config Studio con capacidad de crear/editar reglas de campo. |
| S31.3b | M | Done ✓ | 30min | M | AUDIT_FIELDS (6 campos) + VERSION_FIELD — universales en todas las entidades |
| S31.7 | L | Done ✓ | 35min | M | Adapter_Sheets_Provisioner: create/reconcile/quarantine/mark — 13 tests |
| S31.10-13 | M | Done ✓ | 150min | M | Composer multi-contexto: Templates + Graph Behavior + Architecture Review |

**Total:** 8 stories, TBD SP

## Scope

**In scope (MUST):**
- Extracción de `TOPOLOGY_PRESETS` y `FIELD_TEMPLATES` del `Schema_Engine.gs`
- Templates de auditoría de industria: `AUDIT_FIELDS()`, `VERSION_FIELD()` en todas las entidades de negocio
- Schema Provisioner auto-reparable: create-if-missing, add-missing-columns, quarantine-orphans, mark-sheets
- Resolvedor transparente que mantiene retrocompatibilidad con todos los consumidores existentes
- Refactorización completa de todas las entidades a referencias por clave
- Validación mediante test suite existente (sin regresiones)

**In scope (SHOULD):**
- Config Studio UI de visualización (auditoría visual del catálogo sin escritura) — exclusivo `SUPER_ADMIN`, entrada vía icono de perfil → sección "Sistema"
- Config Studio UI CRUD (gestión de reglas por campo/entidad) — exclusivo `SUPER_ADMIN`
- Nueva sección "Sistema" en el menú de perfil (oculta para todos los roles excepto `SUPER_ADMIN`)

**Out of scope:**
- Nuevas entidades de negocio (eso pertenece a E32+)
- Optimistic Locking, Async Lookups, Soft-Delete — reservados para Next-Gen MDM (parking lot)
- Migración del `Schema_Engine` a una base de datos persistente en Sheets — fuera de E31, puede evaluarse en E32

## Done Criteria

**Per story:**
- [x] Sin regresiones en suite de tests existente
- [x] Retrocompatibilidad verificada con FormEngine, Engine_DB y DataView_Engine

**Epic complete:**
- [x] Todas las stories completadas (S31.1–S31.6 refactorizadas y S31.10-13)
- [x] `Schema_Engine.gs` no crece por entidad nueva sin agregar un preset nuevo
- [x] Al menos 0 etiquetas de restricción duplicadas entre entidades verificado por audit script
- [x] Disminución medible de fallos de configuración (métrica del Brief)
- [x] Epic retrospective completada
- [x] Merged a `develop`

## Dependencies

```
S31.1 (Auditoría)
  ↓
S31.2 (TOPOLOGY_PRESETS) ──┐
S31.3 (FIELD_TEMPLATES) ───┤ (paralelas)
                           ↓
                        S31.4 (Migración Entidades)
                           ↓
               S31.5 (Config Studio Viewer)
                           ↓
               S31.6 (Config Studio CRUD)
```

**External:** Suite de tests E30 debe pasar limpia antes de iniciar la migración en S31.4.

## Parking Lot

- Persistencia del catálogo en Google Sheets (Schema como dato, no código) — E32+
- Exportación/importación de presets (interoperabilidad multi-proyecto) — E32+
- Vista de diff de schema entre versiones (audit trail) — Post-E32

---

## Implementation Plan

> Added by `/rai-epic-plan` — 2026-04-10

### Story Sequence

| Orden | Story | Size | Dependencias | Milestone | Rationale |
|:-----:|-------|:----:|:------------:|:---------:|-----------|
| 1 | S31.1 — Auditoría de Duplicaciones | S | Ninguna | M1 | **Risk-first.** Produce el mapa exacto de patrones repetidos. Sin él, S31.2/S31.3 son especulativas. Walking skeleton informacional. |
| 2a | S31.2 — TOPOLOGY_PRESETS | M | S31.1 | M2 | **Paralela con S31.3.** Mayor impacto en reducción de duplicación (topologyRules es el bloque más pesado por entidad). |
| 2b | S31.3 — FIELD_TEMPLATES | M | S31.1 | M2 | **Paralela con S31.2.** Independiente de TOPOLOGY_PRESETS — áreas de código distintas. |
| 3 | S31.4 — Migración de Entidades | M | S31.2 + S31.3 | M3 | **Dependency-driven.** Necesita ambos catálogos listos. Entidad a entidad con test run entre cada una. |
| 4 | S31.5 — Config Studio UI (Viewer) | L | S31.4 | M3 | Walking skeleton de la UI — muestra el catálogo ya poblado. Incluye sección "Sistema" en ProfileMenu. |
| 5 | S31.6 — Config Studio UI (CRUD) | L | S31.5 | M4 | Extensión del Viewer. Se inicia solo cuando el Viewer está estable y validado por SUPER_ADMIN. |

### Milestones

| Milestone | Stories | Success Criteria | Demo |
|-----------|---------|-----------------|------|
| **M1: Walking Skeleton** | S31.1 | Mapa de duplicaciones publicado. Se conoce el número exacto de patrones repetidos y cuántas líneas ahorrará la extracción. | Review del reporte de auditoría |
| **M2: Core Backend Refactored** | +S31.2, S31.3 | `TOPOLOGY_PRESETS` y `FIELD_TEMPLATES` creados. Suite de tests pasa sin regresiones. Listos para migración de entidades. | `Schema_Engine.gs` con los dos catálogos en aislamiento |
| **M3: Schema Completo + UI Viewer** | +S31.4, S31.5 | Todas las entidades usan referencias. Config Studio Viewer muestra el catálogo en el SPA. Verificar acceso exclusivo SUPER_ADMIN. | Demo E2E: agregar entidad nueva con solo ~5 líneas únicas |
| **M4: Epic Complete** | +S31.6 | Config Studio CRUD funcional. Done criteria epicos verificados. Retrospective completa. | Demo CRUD: vincular preset a campo, verificar en form render |

### Parallel Work Streams

```
Tiempo →
Stream 1 (Backend Schema):  S31.1 → S31.2 ──────────────────→ S31.4
                                   → S31.3 ──────────────────↗

Stream 2 (Frontend UI):                                        S31.5 → S31.6

E2E Integration checkpoint: ────────────────────────────── [M3: Viewer + Entities] ──→ M4
```

**Merge point:** S31.5 no puede iniciar hasta que S31.4 esté completa y testeada — el catálogo debe estar resuelto antes de renderizarlo.

### Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|:------:|:------:|:--------:|-------|
| S31.1 | S | Done ✓ | 25min | S | Reporte de auditoría: 3 presets, 4 templates, bug Sys_Graph_Edges |
| S31.2 | M | Done ✓ | 15min | S | TOPOLOGY_PRESETS: 3 presets, 6 entidades migradas, Object.freeze |
| S31.3 | M | Done ✓ | 10min | XS | FIELD_TEMPLATES: SYSTEM_FIELDS, ESTADO_FIELD, GRAPH_SEPARATOR |
| S31.4 | M | Done ✓ | 20min | M | FIELD_TEMPLATES migration + bug Sys_Graph_Edges fix (414 lines) |
| S31.5 | L | Skipped | — | — | Reemplazado por Blueprint Composer (S31.10) |
| S31.6 | L | Skipped | — | — | Reemplazado por Blueprint Composer (S31.11-13) |

### Sequencing Risks

| Riesgo | P | I | Mitigación |
|--------|---|---|------------|
| S31.4 migración batch rompe contrato en `Engine_DB` | M | H | Migrar una entidad a la vez; ejecutar test suite completa entre cada una. No hacer commit batch. |
| S31.2 aliasing mutable en TOPOLOGY_PRESETS | M | H | `Object.freeze()` obligatorio en todos los presets. Test de inmutabilidad en S31.2 antes de continuar. |
| S31.5/S31.6 excede scope → "Schema Designer" completo | L | M | Hard stop: E31 solo implementa binding preset↔campo. Diseñador de entidades completo es E32+. |
