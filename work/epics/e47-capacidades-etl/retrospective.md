# Epic Retrospective: ETL Carga Masiva de Capacidades (E47)

## Summary
- **Epic ID:** E47
- **Dates:** 2026-04-28
- **Status:** Done

## Success Metrics Review
- **[x] El sistema puede procesar un archivo plano con la estructura definida.** - El Fill-Down de S47.1 maneja la herencia vertical.
- **[x] Las capacidades se ingieren correctamente asociando el nivel y etiquetas.** - S47.2 deduce niveles y etiquetas usando Hash Maps.
- **[x] Auto-generación con Math_Engine.** - `Math_Engine` fue refactorizado para aceptar indexación $O(1)$, evitando colapso del navegador.
- **[x] Campos vacíos procesados sin errores.** - Componentes vacíos saltados, herencia preservada.

## What Went Well
- La decisión de interceptar el flujo en `UI_ETL_Modal` permitió reutilizar por completo el código de presentación (UX).
- Refactorizar `Math_Engine` para O(1) con `isFastCache` preservó la arquitectura original sin duplicar código.

## What to Improve
- Inicialmente nos confiamos con la creación de los ciclos, pero detectamos en `/rai-architecture-review` que estábamos reescribiendo la lógica topológica en el ETL. Usar los scripts de QA automatizados de la metodología RaiSE ahorra mucho retrabajo.
- En S47.5 tuvimos una fuga arquitectónica donde las configuraciones del modelo de datos de las aristas estaban asumiendo un formato único de entidad en el Frontend, lo cual obligó a un análisis arqueológico de git para recuperar el árbol.

## Action Items
- Para futuras cargas masivas (ej. Riesgos o Personas jerárquicas), aplicar el patrón `isFastCache` y `nodesMap`.
- Al generar esquemas en `Schema_Engine.js` siempre declarar el padre único a través de dependencias estrictamente auto-referenciadas. La UI debe ser agnóstica o resiliente a los formatos nativos ("VERDADERO" vs booleanos) que regrese la capa del `DataStore`.
