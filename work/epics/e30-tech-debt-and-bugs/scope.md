# Epic E30: Tech Debt & Bugs — Scope

> **Status:** IN PROGRESS
> **Release:** REL-TBD
> **Created:** 2026-04-10

## Objective

Resolver deuda técnica estructural y visual acumulada en las iteraciones anteriores (Cleaning Sprint) y atender bugs adicionales detectados durante las pruebas dinámicas.

**Value:** Estabilizar el entorno compilado, mitigar side-effects de DOM mediante la migración a Local State y prevenir fragilidades en despliegues (clasp/assets).

## Stories (TBD SP estimated)

| ID | Story | Size | Status | Description |
|----|-------|:----:|:------:|-------------|
| S30.1 | Limpieza Segura de Assets Temporales | S | Pending | Delegar exclusión de .build/assets al `.claspignore` en vez de usar mutación directa con `fs`. |
| S30.2 | Robustez en Muteo Estructural de Relacionales | M | Pending | Inyectar flag `readonly` vía prop-drilling en `UI_SubgridBuilder` para reemplazar hacks pasivos de CSS. |
| S30.3 | DOM Pasivo a Estado Local en Componentes | M | Pending | Evitar los bridges temporales vía *hidden inputs* con JSON strings. Anclar estado efímero en closure memory. |
| S30.4 | Evolución de ThemeManager | M | Pending | Migrar inyección en crudo de `window.hydrateThemeConfig` hacia una Clase ES6 formally orquestada. |
| S30.5 | AST RegExp CSS Minifier | L | Pending | Evaluar integración de integrador CSS (Rollup/Esbuild) para prevenir corrupciones visuales por Regex casero. |

**Total:** 5 stories base + (X) anexos dinámicos en Testing, TBD SP

## Scope

**In scope (MUST):**
- Remover mutaciones file-system riesgosas.
- Refactorización a mitigaciones por *Software Design* en lugar de parches (CSS hacks).
- Anexar activamente bugs funcionales descubiertos al momento de hacer end-to-end testing de esta historia.

**In scope (SHOULD):**
- Optimizar la carga y gestión de colores UI.
- Solidez en la inyección de estilos para evitar parsing manual.

**Out of scope:**
- Implementaciones arquitectónicas pesadas relacionadas con "Next-Gen MDM" (Optimistic Locking, Asynchronous Lookups, etc.), los cuales quedan reservados para E31+.

## Done Criteria

**Per story:**
- [ ] Integración libre de dependencias rotas
- [ ] Quality Review y tests completos (sin regresiones de memoria/DOM)

**Epic complete:**
- [ ] All stories complete (S30.X)
- [ ] Tests exploratorios exhaustivos de los bugs anexados aprobados
- [ ] Epic retrospective done
- [ ] Merged to `develop`

## Dependencies

```
S30.1 (DevOps/Deploy)
  ↓
S30.2 (DOM)
  ↓      
S30.3 ──┐
  │     │ (Core UI Architecture paralelas)
S30.4 ──┤
  │     │
S30.5 ◄─┘
```

**External:** Lista dinámica creciente de defectos reportados por Exploratory Testing del usuario.

## Parking Lot
Extraídos exitosamente.

## Implementation Plan

> Added by `/rai-epic-plan` — 2026-04-10

### Story Sequence

| Order | Story | Size | Dependencies | Milestone | Rationale |
|:-----:|-------|:----:|--------------|-----------|-----------|
| 1 | S30.1 | S | None | M1 | Quick win. Previene colisiones críticas de despliegue antes de tocar código. |
| 2 | S30.2 | M | None | M1 | Desacopla la lógica UI de `UI_SubgridBuilder` y evita efectos secundarios de CSS globales pasivos. |
| 3 | S30.4 | M | None | M2 | Migración aislada a ES6 Class de ThemeManager. Base para arquitecturas UI modulares futuras. |
| 4 | S30.3 | M | S30.4 | M2 | Remueve dependencias de hidden inputs. Se inicia tras estabilizar variables de Theme. |
| 5 | S30.5 | L | All Prev | M3 | Modificación pesada de pipeline AST Node que afectará el output CSS global, requiere entorno limpio. |

### Milestones

| Milestone | Stories | Target | Success Criteria |
|-----------|---------|--------|------------------|
| **M1: Core Stabilization** | S30.1, S30.2 | TBD | Despliegue sin fallas por Clasp y mutación evitada en Subgrids. |
| **M2: UI & State Isolation** | +S30.4, S30.3 | TBD | Temas y DOM Event Bridging utilizan encapsulamiento de memoria y clases nativas sin parsings pasivos. |
| **M3: Pipeline Modernization**| +S30.5 | TBD | Integrador (Esbuild/Rollup) funcionando fluidamente con Ionic. CSS estable en compilación. |
| **M4: Epic Complete** | — | TBD | Bugs exploratorios resueltos integrados en la arquitectura. |

### Parallel Work Streams

```text
Time →
Stream 1 (Ops/Build): S30.1 ──────────────────────> S30.5
                                                      ↑
Stream 2 (DOM/UI):          S30.2 ─► S30.4 ─► S30.3   │
                                                      │
Stream 3 (Testing):          [ Bugs N dinámicos ] ────┘
```

**Merge points:**
- S30.5 requiere que Stream 2 esté completado para no romper UI mientras se refactoriza el bundling CSS.

### Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|:------:|:------:|:--------:|-------|
| S30.1 | S | Pending | — | — | Limpieza Segura de Assets Temporales |
| S30.2 | M | Pending | — | — | Robustez en Muteo Estructural de Relacionales |
| S30.3 | M | Pending | — | — | DOM Pasivo a Estado Local en Componentes |
| S30.4 | M | Pending | — | — | Evolución de ThemeManager |
| S30.5 | L | Pending | — | — | AST RegExp CSS Minifier |

### Sequencing Risks

| Risk | L/I | Mitigation |
|------|:---:|------------|
| S30.5 (Regex) rompa CSS | H/H | Aislar en branch final. Ejecutar pruebas visuales de extremo a extremo en Vitest. |
| Local State en S30.3 | M/M | Garantizar recolección de basura correcta al desmontar componentes de tabla en DataView. |
