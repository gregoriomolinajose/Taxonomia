# Epic E58: Gobierno de Carga Masiva (Taxonomía) — Scope

> **Status:** DESIGN
> **Release:** REL-2026.Q2
> **Created:** 2026-05-22

## Objective

Implementar un flujo de gobierno de datos para la creación masiva de entidades taxonómicas, asegurando que toda agrupación creada inicie en estado "Borrador" hasta ser aprobada explícitamente por su Dueño designado. Las Personas se aprobarán automáticamente si existen en el Directorio Activo.

**Value:** Garantizar una única fuente de verdad confiable, impidiendo que datos incorrectos contaminen el sistema, devolviendo el control y la confianza al Liderazgo y a los Dueños de Entidades.

## Stories (Pendiente de estimación formal)

| ID | Story | Size | Status | Description |
|----|-------|:----:|:------:|-------------|
| S58.1 | Data Model: Estado Borrador | S | Pending | Agregar campos `status` (DRAFT/ACTIVE) y de `owner` a entidades. |
| S58.2 | Wizard Backend: Procesamiento DRAFT | L | Pending | Lógica de carga masiva para crear DRAFTs, validar Personas vs AD. |
| S58.3 | Workflow Backend: Aprobaciones | M | Pending | Endpoints para que los Dueños listen, aprueben o rechacen sus DRAFTs. |
| S58.4 | Wizard Frontend: UI de Carga | M | Pending | Interfaz del Wizard que muestra la previsualización de lo que será DRAFT vs ACTIVE. |
| S58.5 | Dashboard Frontend: Aprobaciones | M | Pending | Vista para que los Dueños revisen y den el Visto Bueno a las entidades. |
| S58.6 | Refactor: Filtros de Lectura Transversales | S | Pending | Asegurar que todos los endpoints actuales excluyan entidades DRAFT por defecto. |

**Total:** 6 stories

## Scope

**In scope (MUST):**
- Modificación del modelo de base de datos para soportar estados.
- Integración con Directorio Activo para validación automática de Personas.
- Interfaz para Dueños para revisar y aprobar/rechazar la creación de agrupadores.
- Ajuste de todas las lecturas del sistema para ocultar DRAFTs.

**In scope (SHOULD):**
- Notificaciones (email o in-app) al Dueño cuando se cargan borradores bajo su responsabilidad.

**Out of scope:**
- Flujos de aprobación multinivel (ej. que apruebe el jefe del dueño). → Se pospone para un Epic de Gobernanza Avanzada.
- Edición de DRAFTs por parte del dueño (solo podrá Aprobar o Rechazar). → Se pospone por simplicidad de la primera versión.

## Done Criteria

**Per story:**
- [ ] Code con type annotations
- [ ] Tests passing (E2E si aplica)
- [ ] Quality checks pass

**Epic complete:**
- [ ] All stories complete (S58.1–S58.6)
- [ ] Ninguna entidad creada por Wizard masivo aparece en reportes de liderazgo sin estar ACTIVE.
- [ ] Epic retrospective done
- [ ] Merged to `dev`

## Dependencies

```text
S58.1 (Model)
  ↓
S58.2 (Backend Wizard) ──┐
  ↓                      │
S58.3 (Backend Workflow) │
  ↓                      │
S58.4 (UI Wizard) ◄──────┘
  ↓
S58.5 (UI Dashboard)
  ↓
S58.6 (Global Filters)
```

**External:** Directorio Activo disponible y accesible para consultas de Personas.

## Architecture

| Decision | ADR | Summary |
|----------|-----|---------|
| Filtrado Transversal | N/A | Implementar global scope en ORM/consultas para omitir status=DRAFT. |

> Problem Brief: `work/problem-briefs/taxonomia-gobierno-carga-2026-05-22.md`

## Risks

| Risk | L/I | Mitigation |
|------|:---:|------------|
| Fuga de DRAFTs (Queries olvidadas) | M/H | S58.6 dedicada y auditoría en `/rai-quality-review` de endpoints. |
| Falsa validación de AD (Duplicados) | M/H | Hacer match exacto por email/ID corporativo; fallback a DRAFT si hay duda. |
| Borradores Huérfanos | L/M | Wizard bloquea la carga si no se especifica un Dueño válido en el archivo masivo. |

## Parking Lot

- Edición de DRAFTs antes de aprobar → Mantenido simple: rechazar e intentar de nuevo.
- Aprobación multinivel → Demasiada fricción inicial.
