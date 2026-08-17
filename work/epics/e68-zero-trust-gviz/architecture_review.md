## Architecture Review: E68 — Ronda 2 (scope: epic)

**Auditor:** Opus  
**Fecha:** 2026-08-08  
**Scope:** Todos los archivos modificados en E68

---

### Critical (fix before merge)

- **Engine_DB.js:886** — *Regresión sintáctica:* Al extraer `_getColumnLetter`, faltaba `},` de cierre. Hubiera impedido la instanciación completa de `Engine_DB`. **Estado: CORREGIDO.**

---

### Recommended (simplify before next cycle)

*Ninguna recomendación de simplificación. La complejidad actual está justificada.*

---

### Questions (require human judgment)

**Q1. ¿Hasta dónde llega el alcance de GViz en E68?**

Actualmente, E68 migró los dos pasos del BFS topológico a GViz pero dejó intactas las consultas de identidad (`Persona`) y de permisos (`Sys_Permissions`) que siguen usando `_getCachedData` (Full Table Scan). Esto es consistente internamente porque:

- `Persona` se carga una sola vez por request (caché efímera) y se usa en múltiples puntos (identidad + validación).
- `Sys_Permissions` es típicamente una tabla pequeña (< 500 filas).

Sin embargo, si el sistema escala a 50,000+ personas, la carga inicial de `Persona` seguirá siendo un cuello de botella. **Decisión del negocio:** ¿Aceptamos este límite para E68 o lo incluimos en scope?

---

### Observations (patterns noted)

**H1 (Single Implementation):** `Engine_DB.listBy` tiene un solo consumidor real (`Engine_ABAC`). Pero esto es intencional — es un facade de persistencia diseñado para ser genérico. No es una abstracción huérfana.

**H6 (Indirection Depth):** `ABAC → Engine_DB.listBy → Adapter_Sheets.query → UrlFetchApp` = 3 capas. Justificado por SRP: ABAC no sabe SQL, DB no sabe HTTP, Adapter no sabe de permisos.

**H14 (Coupling Direction):** Correcto. ABAC (volátil) depende de Engine_DB (estable). Engine_DB depende de Adapter_Sheets (infraestructura). La dirección del acoplamiento va de lo volátil hacia lo estable.

**H9 (Semantic Duplication):** El patrón try/GViz + catch/fallback-cache se repetía textualmente. **✅ CORREGIDO EN S68.2:** Se extrajo a un helper unificado `_queryWithFallback(entityName, fieldName, value)`.

**H13 (Orphaned Abstractions):** Eliminación exitosa del código de Graceful Degradation en seguridad. No se detectan abstracciones huérfanas nuevas.

---

### Verdict

- [x] **PASS**

La arquitectura es proporcionada al problema. Las duplicaciones semánticas detectadas (H9) son candidatas para simplificación futura, no bloqueantes.
