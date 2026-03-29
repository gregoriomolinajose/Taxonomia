# Epic Plan: E6 - Arquitectura Escalable de Grafos

## Sequenced Stories
1. **S6.1 - Config-Driven SCD-2 [M]**
   - Modificar `Schema_Engine.gs` inyectando propiedades de configuración `isTemporalGraph` y `topology`.
2. **S6.2 - Diccionario de Topologías [S]** *(Depende de: S6.1)*
   - Crear el sub-sistema de validación de topologías para determinar y frenar multiplicidad 1:N no autorizada en estructuras rígidas.
3. **S6.3 - Engine_Graph Service [M]** *(Depende de: S6.2)*
   - Extraer y aislar toda la lógica de patching SCD-2 de `Engine_DB.js` hacia el nuevo `Engine_Graph.js`.

## Timeline & Milestones
- **Milestone 1:** Schema agnóstico (Termina S6.1).
- **Milestone 2:** Service Router (Termina S6.3) — Integración final con el Backend.
