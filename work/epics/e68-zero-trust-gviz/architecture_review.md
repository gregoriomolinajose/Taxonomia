## Architecture Review: E68 (scope: epic)

### Critical (fix before merge)
- **H16 (Shotgun Surgery / DB Consistency):** El Paso 1 del algoritmo BFS (`Engine_ABAC.js:75-92`) sigue realizando un Full Table Scan, que es exactamente el problema arquitectónico de escala que esta épica (E68) busca resolver con GViz. Esto rompe la consistencia del diseño. **Debe corregirse implementando llamadas a GViz (`Engine_DB.listBy`).**

### Recommended (simplify before next cycle)
*No hay recomendaciones adicionales.*

### Questions (require human judgment)
- **H16 (Shotgun Surgery):** ¿Es `Adapter_Sheets.js` el único lugar que debería conectarse con GViz? Actualmente, todo pasa por `Engine_DB.listBy`, lo cual respeta las capas de abstracción (DB facade -> Adapter). Mantener esta regla es vital para evitar que el dominio se acople a URLs de Google Sheets.

### Observations (patterns noted)
- **H6 (Indirection Depth):** La cadena de llamadas `resolveTopologyFor` -> `Engine_DB.listBy` -> `Adapter_Sheets.query` -> `UrlFetchApp` introduce 3 capas de indirección. Sin embargo, esto está justificado por el principio de Responsabilidad Única (SRP): ABAC no debe saber SQL, DB no debe saber de peticiones HTTP, y Adapter no debe saber de permisos. **Proporcionalidad: Justificada**.
- **H14 (Coupling Direction):** El motor principal de ABAC (`Engine_ABAC`) ahora depende del facade `Engine_DB.listBy`. Esto es correcto ya que ABAC es una capa superior de negocio consumiendo servicios de persistencia, manteniendo la dirección del acoplamiento hacia el núcleo estable (la DB).
- **H13 (Orphaned Abstractions):** Se eliminó la lógica huérfana de "Graceful Degradation" en ABAC, reduciendo la deuda técnica.

### Verdict
- [ ] SIMPLIFY (Requiere completar la refactorización de escalabilidad del BFS)
