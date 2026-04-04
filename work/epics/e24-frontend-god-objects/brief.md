# Epic 24 Brief: Frontend God Objects Decomposition

## Hypothesis
El particionamiento de los 4 "God Objects" primarios del Frontend (`app.css`, `DataView_UI.html`, `FormRenderer_UI.html` y `FormBuilder_Inputs.html`) aliviará la sobrecarga cognitiva, prevendrá cuellos de botella en futuros desarrollos del UI, y habilitará el re-uso atómico sin dependencias cíclicas cruzadas ni archivos de +600 líneas difíciles de debugear. 

## Success Metrics
- Los módulos fragmentados (`DataView`, `FormRenderer`, `FormBuilder`) no superan las 300-350 líneas máximo por documento.
- `app.css` es erradicado y migrado hacia directivas acopladas, o modularizado al 100% bajo convenciones como BEM o Atomic CSS.
- El SPA mantiene su estabilidad Zero-XSS con el framework actual. No hay pérdidas de performance por redibujado de UI.

## Appetite (Resource / Escala)
- Dos sprints o menos. La lógica ya existe; se trata de una refactorización puramente estructural y dominal (Arquitectura de Capas de UI).

## Rabbit Holes (Peligros Ocultos)
- **Cascadas de Estado Perdidas:** Extraer la 'State Manager' de `DataView_UI` requiere inyectar correctamente EventBuses o Promesas y mantener viva la referencia (puntero global de variables `_state`).
- **Styles Collisions:** Extraer variables y layouts de `app.css` podría romper prioridades de render nativas de Ionic si no se encapsulan bien.
