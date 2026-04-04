# Epic Retrospective: E20 Pipeline Evolution

## Summary
- **Epic ID**: E20
- **Duration**: 2026-04-02
- **Completed Stories**: S20.1, S20.2, S20.3
- **Velocity Tracking**: Alta (Sprints de 1 sesión en fase Turbo).

## What went well
1. **Delegación de Assets**: Refactorizar la limpieza `fs.rmSync` a reglas pasivas `.claspignore` agilizó enormemente los Push nativos de GAS.
2. **Esbuild Adoption**: Transformamos las obsoletas validaciones Regex de CSS minification directas a un transpiler en Milisegundos y con garantía del AST.
3. **Módulo de Módulo**: Envolver `__THEME_TOKENS__` en Módulos y quitar directivas globales asincrónicas afianza por fin un Boot secuencial sin Side-effects por primera vez en la UI.

## What to improve
1. **Tooling Environment**: Surgieron colisiones de versiones y saltos de checkout dentro de la IDE que interfirieron en subidas, para el futuro de E21, es preferible utilizar Worktrees paralelos si se automatiza en concurrencia masiva.
2. **Aesthetic Configurations**: En un futuro, el object literal ES5 del ThemeManager puede ir un paso más y compilarse con Esbuild/JS bundle, pero requeriría mudar la inyección `<?!= ?>`. Lo consideraremos para V5.

## Patterns & Decisions
- H14 (Coupling Direction): Mudar la `_UI_CONFIG` desde el Backend global hacia la raíz del Frontend local previene transferencias de memoria inútiles en RPCs.
- H5 (KISS): Rechazar bundlers complejos como Webpack en favor de Module Patterns preservó la simpleza del despliegue en Google Apps Script. 

## Next Steps
La modernización BaseLine 10 está consolidada. La próxima cruzada estratégica radica en la **[E21] Next-Gen MDM data Layer**.
