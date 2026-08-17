# Epic Retrospective: E68

## Metrics
- **Stories Planned:** 1
- **Stories Completed:** 1
- **Cycle Time:** ~2 horas (Diseño rápido, validación PoC e implementación inmediata).

## What went well
- La validación temprana (PoC) sobre la conectividad de `UrlFetchApp` con GViz redujo el riesgo técnico masivamente antes de comprometer el código de `Adapter_Sheets`.
- El modelo Zero-Trust fue aplicado limpiamente en `Engine_ABAC.js` sin destruir dependencias lógicas ajenas.
- El debugging disciplinado (`/rai-debug`) usando métricas de entorno integrado permitió descubrir la causa raíz de la asignación fallida del rol SysAdmin de forma determinista.

## What could be improved
- La latencia (tiempo de ida y vuelta HTTP) será ligeramente superior, aunque el sistema de caché subyacente y la estabilidad lo justifican. Esto fue discutido y aprobado bajo el criterio empresarial de preferir la estabilidad a la rapidez milisegundos.
- **Lección Aprendida (GViz Heuristics):** GViz a veces deduce erróneamente que la primera fila es de datos si todos los datos son de tipo String, causando que los JSON retornen con llaves vacías. Se debe obligar a GViz a tratar la primera fila como encabezado añadiendo `&headers=1` explícitamente a todas las URLs.
- **Lección Aprendida (Anti-Drift):** Se demostró que consultar directamente por índice de columna quemado ('A', 'B', 'H') es peligroso en bases de datos gestionadas por humanos (Google Sheets) porque es propenso a desplazamientos. Esto requirió introducir un resolutor dinámico (`resolveColumnLetter`).

## Artifacts Generated
- `Adapter_Sheets.js` actualizado con `.query()`, `resolveColumnLetter()` y `&headers=1`.
- `Engine_DB.js` actualizado con `.listBy()`.
- `Engine_ABAC.js` protegido con Zero-Trust y consultas dinámicas case-insensitive.
- `Install_Seeder.js` con siembra dinámica de RO-SYSADMIN.
