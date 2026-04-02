# Epic 20: Pipeline Evolution & Native Tooling

> **Status:** 🚧 To Do
> **Origen:** Consolidación de Deuda Técnica (Post-Epic 18)

## 📌 Contexto
La carga estructural en `deploy.js` es inostenible mediante abstracciones basadas en RegExp caseras. Esta épica debe independizar radicalmente el flujo de CI/CD delegando la minificación a bundlers oficiales.

## 🎯 Objetivos
- Migración parcial de Regex Minification pura a parseo oficial (Rollup / Esbuild).
- Traslado orgánico de responsabilidades de `ThemeManager` a ES6.

## 📦 Scope / Historias Candidatas

1. **[ ] S20.1: Integración de Bundlers (Node.js)**
   - Reemplazar regex en `deploy.js` por transpiladores estándar para el minificado CSS.
   - Separar el código nativo CSS del index de Gas.

2. **[ ] S20.2: Arquitecturización de Asset Management**
   - Delegar control de exclusiones `.build/assets` directamente a `.claspignore`.
   - Mover la configuración `_UI_CONFIG` a repositorios localizados frontend.

3. **[ ] S20.3: ES6 ThemeManager Evolution**
   - Mutar el comportamiento procedural en `hydrateThemeConfig()` hacia un módulo orquestado.
