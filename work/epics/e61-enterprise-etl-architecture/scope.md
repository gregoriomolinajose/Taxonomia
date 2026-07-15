# Epic E61: Enterprise ETL Architecture — Scope

> **Status:** IN PROGRESS
> **Release:** REL-61 (Enterprise ETL)
> **Created:** 2026-07-08

## Objective

Refactorizar el módulo de Importación/Exportación (ETL) para transformarlo en una arquitectura de grado empresarial, desacoplada y escalable. Esto permitirá soportar grandes volúmenes de datos asíncronamente, delegar las reglas de transformación a los esquemas, y facilitar la integración futura con nuevas fuentes de datos sin modificar el motor principal.

**Value:** Elimina la deuda técnica de reglas *hardcodeadas*, previene bloqueos de UI (Timeouts) en cargas masivas, permite la reutilización del motor de validación en toda la aplicación, y facilita la experiencia de usuario con una gestión de errores resiliente.

## Stories (21 SP estimated)

| ID | Story | Size | Status | Description |
|----|-------|:----:|:------:|-------------|
| S61.1 | IDataProvider Interface | S | Done | Implementar patrón Adapter para abstraer Google Sheets del motor ETL. |
| S61.2 | Metadata Hooks Engine | M | Done | Mover lógica dura de entidades a APP_SCHEMAS (onRowTransform). |
| S61.3 | Centralized Validation | M | Done | Crear ValidationEngine basado en esquema para ingesta y UI. |
| S61.4 | Async Job Processing | L | Done | Implementar cola de tareas en backend y polling en frontend. |
| S61.5 | Dead Letter Queue (DLQ) | L | Pending | Tabla temporal para filas con error y UI de resolución de conflictos. |
| S61.6 | Enhanced ETL Progress UX | S | Done | Mejorar la experiencia de carga visual con micromensajes en tiempo real. |
| S61.10 | Bounded Extraction | S | Done | Optimización de extracción acotada. |
| S61.11 | Async Pulse | S | Done | Procesamiento de chunks por pulsos. |
| S61.12 | Non-blocking Hydration | S | Done | Hidratación en background sin congelar UI. |
| S61.13 | CacheSignal Limits | S | Done | Pruning de la caché para evitar límite de 100KB y fixes de logs. |
| S61.14 | ETL Job Mutex Lock | S | Done | Control de concurrencia para evitar race condition entre API y Trigger. |

**Total:** 6 stories, 23 SP

## Scope

**In scope (MUST):**
- Abstraer Google Sheets usando el patrón Adapter.
- Eliminar los `if (entityName === ...)` del motor principal, usando *hooks* en esquemas.
- Motor de validación centralizado usando las propiedades del esquema.
- Ingesta asíncrona por Jobs para evitar timeouts del navegador.

**In scope (SHOULD):**
- Interfaz gráfica (UI) para la cola DLQ que permita corregir datos erróneos en pantalla.

**Out of scope:**
- Crear adaptadores de S3, FTP o Excel nativo → (Se difiere a futuras necesidades, la interfaz quedará lista).
- Migración de datos históricos → (No es necesario, es un refactor de motor).

## Done Criteria

**Per story:**
- [ ] Code with type annotations
- [ ] Tests passing
- [ ] Quality checks pass (ruff, pyright)

**Epic complete:**
- [ ] All stories complete (S61.1–S61.5)
- [ ] Carga de prueba de 10,000 registros exitosa sin timeout.
- [ ] Epic retrospective done
- [ ] Merged to `develop`

## Dependencies

```
S61.1 (Adapter)
  ↓
S61.2 (Hooks) ──┐
  ↓             │ (parallel)
S61.3 (Valids) ◄─┘
  ↓
S61.4 (Jobs)
  ↓
S61.5 (DLQ UI)
```

**External:** Ninguna.

## Architecture

| Decision | ADR | Summary |
|----------|-----|---------|
| Transport Decoupling | ADR-061 | Uso de IDataProvider para abstraer orígenes de datos. |
| Entity Rules | ADR-062 | Inyección de transformaciones vía APP_SCHEMAS. |

> Problem Brief: N/A

## Risks

| Risk | L/I | Mitigation |
|------|:---:|------------|
| Google Apps Script Quotas | H/H | Limitar el chunking del Job Worker para no exceder cuota de 6 minutos de ejecución. |
| Breaking changes in UI | M/H | Mantener compatibilidad de API para el frontend actual hasta tener S61.4 listo. |

## Parking Lot

- Soporte nativo a archivos `.xlsx` → Difiere a cuando negocio lo pida.

## Implementation Plan

> Added by `/rai-epic-plan` — 2026-07-08

### Story Sequence

| Order | Story | Size | Dependencies | Milestone | Rationale |
|:-----:|-------|:----:|--------------|-----------|-----------|
| 1 | S61.1 (Adapter) | S | None | M1 | Aislar la dependencia fuerte de Google Sheets primero para probar el motor en memoria. |
| 2 | S61.2 (Hooks) | M | S61.1 | M2 | Extraer la lógica "harcodeada" actual usando la nueva interfaz genérica. |
| 3 | S61.3 (Validation)| M | S61.1 | M2 | Implementar el motor de reglas. Puede ir en paralelo a la abstracción de Hooks. |
| 4 | S61.4 (Jobs) | L | S61.2, S61.3 | M3 | Mover la ejecución a un *Worker* asíncrono para prevenir timeouts en la UI. |
| 5 | S61.5 (DLQ UI) | L | S61.4 | M3 | Implementar la pantalla de errores utilizando la metadata que devuelvan los Jobs asíncronos. |

### Milestones

| Milestone | Stories | Target | Success Criteria |
|-----------|---------|--------|------------------|
| **M1: Walking Skeleton** | S61.1 | Día 2 | El sistema lee/escribe sin hacer llamadas explícitas a `SpreadsheetApp` en el core. |
| **M2: Core MVP** | S61.2, S61.3 | Día 5 | La lógica se lee del schema. Las subidas pequeñas (síncronas) siguen funcionando bien. |
| **M3: Feature Complete** | S61.4, S61.5 | Día 10 | Las cargas masivas (>10,000) ocurren en segundo plano y los errores se envían al DLQ. |
| **M4: Epic Complete** | — | Día 11 | Done criteria met, retro done, merged to develop. |

### Parallel Work Streams

```text
Time →
Stream 1 (Critical): S61.1 ─► S61.2 ─────────────► S61.4 ─► S61.5
                               ↓                     ↑
Stream 2 (Parallel):           S61.3 (Validation) ───┘
```

**Merge points:**
- After S61.1: Se divide la lógica de transformaciones (Hooks) y validaciones (Validation) a distintos miembros o bloques.
- Before S61.4: Ambos motores (Hooks y Validación) deben estar listos antes de convertirlos en *workers* asíncronos.

### Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|:------:|:------:|:--------:|-------|
| S61.1 | S | Done | — | — | |
| S61.2 | M | Done | — | — | |
| S61.3 | M | Done | — | — | |
| S61.4 | L | Done | — | — | |
| S61.5 | L | Pending | — | — | |

### Sequencing Risks

| Risk | L/I | Mitigation |
|------|:---:|------------|
| Frontend Timeout en transición | H/H | No habilitar los componentes S61.1 a S61.3 en producción para entidades pesadas hasta tener S61.4 finalizado. |
| Complejidad DLQ UI | M/M | El alcance de DLQ será solo "visualización" en V1, y re-procesamiento en V2 si el tiempo apremia. |
