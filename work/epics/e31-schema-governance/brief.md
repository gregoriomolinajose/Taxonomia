# Epic E31: Schema Engine Governance Layer — Brief

> **Status:** In Progress
> **Created:** 2026-04-10
> **Brief Origin:** `work/problem-briefs/schema-engine-constraint-governance-2026-04-10.md`

## Hypothesis (SAFe)

> *"Si las etiquetas de restricciones de comportamiento siguen declaradas inline en cada entidad del `Schema_Engine`, entonces agregar nuevas entidades y restricciones seguirá aumentando la deuda de legibilidad y el riesgo de duplicación para el equipo de desarrollo, medido por: **disminución de fallos en la configuración del esquema** al introducir nuevas entidades o campos."*

## Success Metrics

| Métrica | Estado actual | Target E31 |
|---------|--------------|------------|
| Líneas de `Schema_Engine.gs` por entidad nueva | ~20–30 líneas de duplicación pura | ~5–8 líneas únicas por entidad |
| Etiquetas de restricción duplicadas entre entidades | N repeticiones de `topologyRules` idénticos | 0 duplicaciones — referencias por clave |
| Fallos de configuración en Schema detectados en PR/test | Sin baseline | Reducción medible post-E31 |

## Appetite

**Size:** M-L (6 stories, estimación TBD SP)
**Risk:** Alto sobre `Schema_Engine.gs` (SSOT), bajo sobre consumidores existentes (sin cambio de contrato).

## Scope Summary

**In (MUST):**
- `TOPOLOGY_PRESETS` — catálogo nombrado de reglas topológicas (S31.2)
- `FIELD_TEMPLATES` — plantillas de campos comunes con composición inmutable (S31.3)
- Migración total de entidades `APP_SCHEMAS` a referencias (S31.4)
- Retrocompatibilidad verificada con FormEngine, Engine_DB, DataView (test suite)

**In (SHOULD):**
- Config Studio UI Viewer — auditoría visual, acceso `SUPER_ADMIN` vía perfil → "Sistema" (S31.5)
- Config Studio UI CRUD — binding regla↔campo↔entidad, exclusivo `SUPER_ADMIN` (S31.6)

**Out:**
- Nuevas entidades de negocio, Next-Gen MDM, persistencia del catálogo en Sheets

## Rabbit Holes

- **Aliasing mutable:** Expandir presets por referencia directa puede crear compartición de objeto mutable. Mitigation: `Object.freeze()` + test de inmutabilidad en S31.2.
- **Migración batch de entidades:** No migrar todas en un commit — riesgo de ruptura difícil de aislar. Migrar entidad a entidad con test run entre cada una.
- **Config Studio scope creep:** La UI de CRUD puede volverse una herramienta de "schema designer" completo. Limitar E31 al binding regla↔campo. El diseñador de entidades completo es E32+.
