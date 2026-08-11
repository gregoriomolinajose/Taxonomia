# Contexto Local (Taxonomia Project)

## Estado Actual
- **Fase**: `Session Closed`
- **Épica Activa**: Ninguna. Epicas E67 y E68 cerradas y fusionadas.
- **Rama Actual**: `develop` (Limpia y actualizada)
- **Versión**: v1.2.19 (Último auto-deploy)

## Notas de Hand-off (Para nueva conversación)
- **Logros Recientes y Parches Rápidos**:
  - Implementación de `ABAC_GLOBAL_VER` dinámico en `Engine_ABAC.js` para un control fino de invalidación de caché L2 (ABAC_V3).
  - Corrección del parser de fechas GViz `_parseGVizDate()` y parseo JSON ultra-resiliente (`substring(startIdx, endIdx)`) en `Adapter_Sheets.js`.
  - Fix crítico en la resolución de relaciones en `Engine_DB.js` para mapear de forma robusta `id_nodo_hijo` y `id_nodo_padre` al lidiar con referencias a objetos.
  - Fix de tipo de entrada en el typeahead y resolución segura de inputs que no son correos electrónicos.
- **Estado de Tareas Pendientes**:
  - Existe un bug documentado del *Taxonomy Canvas* en el parking-lot listo para ser retomado en la próxima iteración.
- **Siguientes Pasos**:
  - Al abrir la nueva conversación, utiliza el skill `/rai-session-start` para cargar este contexto automáticamente.
  - Seleccionar la siguiente épica o historia del Backlog priorizado o atender los issues del parking-lot.

## Patterns
- Use A-XX prefix for local patterns.
