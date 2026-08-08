## Quality Review: E68 — Ronda 2 (Post-Fixes)

**Auditor:** Opus  
**Fecha:** 2026-08-08  
**Archivos revisados:** Engine_ABAC.js, Engine_DB.js, Adapter_Sheets.js, Install_Seeder.js

---

### Critical (fix before merge)

- **Engine_DB.js:886** — *Syntax Error (REGRESIÓN):* La extracción de `_getColumnLetter` como helper dejó la función sin llave de cierre `}` ni coma `,`. El objeto `Engine_DB` completo fallaría al parsearse en V8. **Estado: CORREGIDO en esta ronda.**

---

### Recommended (improve code quality)

**1. Engine_ABAC.js:37 — Persona sigue con Full Table Scan**

La resolución de identidad (`this._getCachedData('Persona')`) descarga *toda* la tabla `Persona` para hacer un `.find()` por email. Esto no fue tocado en E68 pero es el mismo patrón que se corrigió en el BFS. En un sistema con 50,000+ empleados, esta sola línea puede consumir decenas de MB.

> **Mitigación:** No es bloqueante porque `_getCachedData` solo la carga una vez por request (caché efímera). Es un candidato para E69, no para E68.

**2. Engine_ABAC.js:56 — Sys_Permissions también Full Table Scan**

Mismo patrón: `this._getCachedData('Sys_Permissions')` seguido de `.filter()`. El riesgo es menor porque la tabla de permisos suele ser pequeña (< 500 filas), pero rompe la consistencia del diseño.

> **Mitigación:** Aceptable en E68. Candidato para E69.

**3. Install_Seeder.js:34-37 — Fallback con IDs truncados inconsistentes**

Cuando `APP_SCHEMAS` no está definido, el fallback hardcodea `PERM-BOOT-PERM` y `PERM-BOOT-WORK`. Estos IDs no siguen el patrón completo (`PERM-BOOT-SYSPERMISSIONS`). Si alguien corre el seeder sin esquemas y luego con esquemas, habrá registros huérfanos.

> **Sugerencia:** Alinear el fallback al mismo patrón: `PERM-BOOT-SYSPERMISSIONS` y `PERM-BOOT-CONFIGWORKSPACE`.

**4. Adapter_Sheets.js:827 — Serialización redundante**

`JSON.parse(JSON.stringify(rows))` clona profundo un array que ya fue construido línea a línea con valores primitivos. No hay referencias circulares ni objetos compartidos. Es CPU y memoria desperdiciada.

> **Sugerencia:** Devolver `rows` directamente o documentar por qué el deep-clone es necesario.

---

### Observations (no action needed)

**1. Engine_ABAC.js:80-103 — Paso 1 BFS bien refactorizado**

La iteración ahora recorre `ownerFields` individualmente y delega a `Engine_DB.listBy`. El fallback a `_getCachedData` con `.filter()` manual es correcto y defensivo. Aprobado.

**2. Engine_ABAC.js:127-137 — Paso 2 BFS consistente**

Mismo patrón que el Paso 1: intenta GViz, cae a caché si falla. La aserción `String(childRow[parentField]) === current.id` en línea 141 es redundante cuando GViz tiene éxito (ya filtró), pero es inofensiva y necesaria para el path de fallback. Aceptable.

**3. Engine_ABAC.js:190-210 — Zero-Trust limpio**

La lógica de denegación por defecto es clara, tiene log de trazabilidad, y el default final `return false` cierra cualquier caso no contemplado. Sin observaciones.

**4. Engine_DB.js:856 — `this._getColumnLetter` correctamente extraído**

El helper es ahora reutilizable y testeable de forma independiente. Buen refactor.

---

### Verdict

- [x] **PASS WITH RECOMMENDATIONS**

Los hallazgos pendientes (Persona FTS, Sys_Permissions FTS, fallback IDs, serialización redundante) son candidatos para un ciclo futuro (E69). Ninguno es bloqueante para merge.
