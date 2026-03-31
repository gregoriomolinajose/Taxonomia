# Epic Brief: E13 - The Cleaning Sprint (Arch & Tech Debt)

## Objective
Desacoplar la lógica polinómica (Grafos Relacionales M:N anidados) del inyector maestro `FormRenderer_UI.html` hacia un módulo puramente dedicado a listas embebidas, emparejar configuraciones estáticas restantes (Hardcoded Rules) directo en motor de schemata y madurar el pipeline Node.js con empaquetamiento CSS real.

## Hypothesis & Context
Tras concluir el E12 (UI Modularization), logramos sanear el Front y la resiliencia en tiempo de ejecución. Sin embargo, nuestro escáner arquitectónico (2026-03-31) reveló dependencias en `FormRenderer_UI.html` mayores a 1500 LOC (Síndrome Clase Dios). Extraer los subgrids M:N hacia un `UI_SubgridBuilder` aislará riesgos lógicos y terminará de pulir el "Dumb View Layer". A su vez, el refactor incluye la migración a un Minificador Abstract Syntax Tree (AST) para CSS y la liquidación pasiva del viejo enrutador (UI_Router).

## Success Metrics
- `FormRenderer_UI.html` cae debajo de las 800 LOC tras la migración de dependencias jerárquicas (SubgridBuilder).
- Build automatizado de `deploy.dev/prod` usa EsBuild/Rollup para minificar CSS con cero fallas de parseo (Adiós RegEx peligroso).
- Cero reglas "Hardcodeadas" sobre `cant_` vivas en Componentes; todas transferidas a `APP_SCHEMAS`.

## Appetite
- **Scope**: Modificación interna de constructores visuales secundarios, optimización de pipeline.
- **Constraints**: No alterar el Backend Graph Engine, no modificar dependencias en Typescript / UI principal.

## Rabbit Holes (Avoid)
- Reescribir el DataGrid base.
- Migrar de Ionic Components a Frameworks reactivos (MVT).
