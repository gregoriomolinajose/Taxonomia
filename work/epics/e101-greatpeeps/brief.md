# Epic Brief: GreatPeeps MVP (E101)

## Hypothesis
Si proveemos un hub integrador de reclutamiento (GreatPeeps) conectado directamente al Motor Agnóstico y base de datos de CorePlatform, los reclutadores podrán gestionar el embudo de selección sin silos y aprovecharemos los perfiles existentes de la arquitectura organizacional (Taxonomía) para el cruce de capacidades.

## Success Metrics
- Tiempo de publicación de vacante reducido.
- Filtro automático de CVs mediante IA Gemini con score >80% de asertividad.
- Trazabilidad y agendamiento sin salir de la plataforma.

## Appetite
1-2 sprints para el MVP completo.

## Rabbit Holes (Riesgos a evitar)
- Evitar crear un clon complejo de Workday; mantenerlo ligero y apoyado en Google Workspace.
- Evitar sobrescribir la lógica base (Engine_DB) para forzar campos de RRHH. Usar JSON schemas dinámicos.
