# Epic E31: Schema Engine Governance Layer — Scope

> **Status:** DESIGN
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
| S31.5 | Schema Config Studio UI (Viewer) | L | Pending | Interfaz de administración read-only que liste el catálogo de presets y templates, y muestre qué entidades usan cada regla. Accesible desde el icono de perfil → sección "Sistema" (nueva), exclusivo para `SUPER_ADMIN`. |
| S31.6 | Schema Config Studio UI (CRUD) | L | Pending | Extender el Config Studio con capacidad de crear/editar reglas de campo para una entidad específica, generando la declaración correspondiente en el schema. Binding entre reglas del catálogo y campos de entidades. Exclusivo `SUPER_ADMIN`. |

**Total:** 6 stories, TBD SP

## Scope

**In scope (MUST):**
- Extracción de `TOPOLOGY_PRESETS` y `FIELD_TEMPLATES` del `Schema_Engine.gs`
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
- [ ] Sin regresiones en suite de tests existente
- [ ] Retrocompatibilidad verificada con FormEngine, Engine_DB y DataView_Engine

**Epic complete:**
- [ ] Todas las stories completadas (S31.1–S31.6)
- [ ] `Schema_Engine.gs` no crece por entidad nueva sin agregar un preset nuevo
- [ ] Al menos 0 etiquetas de restricción duplicadas entre entidades verificado por audit script
- [ ] Disminución medible de fallos de configuración (métrica del Brief)
- [ ] Epic retrospective completada
- [ ] Merged a `develop`

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
