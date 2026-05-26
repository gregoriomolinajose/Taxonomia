# S60 — Retrospectiva

**Story:** S60 · Config_System Schema (adapter-driven)  
**Fecha inicio:** 2026-05-26 · **Fecha cierre:** 2026-05-26  
**Estimado:** S (1 día) · **Real:** ~45 min  
**Epic:** E6

---

## Resumen de lo Implementado

- Entidad `Config_System` agregada a `APP_SCHEMAS` con `adapter: 'config'` en metadata
- Guard de routing en `Engine_DB.list()`, `orchestrateNestedSave()` y `delete()`
- Limpieza de `helpText` hardcodeados con dominios específicos en `Config_Workspace`
- Test de completitud de schema actualizado para excluir entidades con adapter especial
- 3 commits · 191 tests verdes · 2 deploys exitosos a dev

---

## Qué salió bien

- El patrón `adapter` en metadata demostró ser la extensión correcta: limpio, genérico, y aplicable en los 3 métodos de mutación sin duplicar condiciones.
- El QR atrapó el bug real del `delete()` sin guard antes del merge.
- El fix del test fue elegante: el filtro genérico por `metadata.adapter` hará que futuras entidades de sistema queden automáticamente excluidas.

## Qué mejorar

- El CLI `rai pattern add` y `rai signal emit-calibration` fallan con `UnicodeEncodeError` en Windows (cp1252 vs Unicode). No bloqueante para el desarrollo, pero bloquea el registro de telemetría y patrones. Abrir issue en RaiSE.

---

## Heutagogical Checkpoint

1. **¿Qué aprendiste?**  
   El guard debe cubrir TODAS las rutas de escritura desde el primer commit, no solo las que se planean en el diseño. `delete()` no estaba en el design doc pero era evidente que necesitaba el mismo guard.

2. **¿Qué cambiarías del proceso?**  
   El `rai-story-plan` debería incluir una checklist explícita: "¿Cuántas rutas de escritura expone el motor? ¿Están todas cubiertas?" para entidades con routing especial.

3. **¿Mejoras al framework?**  
   Agregar al template de diseño para historias con guards/routing: "Enumera TODOS los métodos del motor que podrían invocar a Adapter_Sheets y confirma cuáles requieren el guard."

4. **¿En qué eres más capaz ahora?**  
   En identificar inmediatamente los "surface attack points" de un motor genérico cuando se introduce un nuevo tipo de entidad con comportamiento diferente.

---

## Patrones (registrado manualmente por bug de encoding en CLI)

**PAT-G-S60-001** (technical):  
"Entidades de sistema con `adapter` en metadata deben excluirse de tests de completitud de schema de negocio. Usar `schema.metadata.adapter` como discriminador en filtros de test para evitar falsos negativos."

**PAT-G-S60-002** (architecture):  
"Al introducir un guard de routing en un motor genérico, cubrir TODAS las rutas de escritura en el mismo commit: list, save/orchestrate, update, delete. Nunca dejar una ruta sin guard aunque no esté en el scope inmediato."

---

## AR / QR

- **AR Verdict:** PASS — diseño proporcional, 2 preguntas de contexto
- **QR Verdict:** PASS WITH RECOMMENDATIONS — 1 bug real encontrado y corregido (delete sin guard)
