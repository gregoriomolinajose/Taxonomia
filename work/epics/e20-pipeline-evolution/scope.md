# Epic 20: Pipeline Evolution & Native Tooling

> **Status:** 🚧 In Progress
> **Origen:** Consolidación de Deuda Técnica (Post-Epic 18)

## 📌 Contexto
La carga estructural en `deploy.js` es inostenible mediante abstracciones basadas en RegExp caseras. Esta épica debe independizar radicalmente el flujo de CI/CD delegando la minificación a bundlers oficiales.

## 🎯 Objetivos
- Migración parcial de Regex Minification pura a parseo oficial (Rollup / Esbuild).
- Traslado orgánico de responsabilidades de `ThemeManager` a ES6.

## 📦 Scope / Historias Candidatas

1. **[x] S20.1: Integración de Bundlers (Node.js)**
   - Reemplazar regex en `deploy.js` por transpiladores estándar para el minificado CSS.
   - Separar el código nativo CSS del index de Gas.

2. **[x] S20.2: Arquitecturización de Asset Management**
   - Delegar control de exclusiones `.build/assets` directamente a `.claspignore`.
   - Mover la configuración `_UI_CONFIG` a repositorios localizados frontend.

3. **[ ] S20.3: ES6 ThemeManager Evolution**
   - Mutar el comportamiento procedural en `hydrateThemeConfig()` hacia un módulo orquestado.

## Implementation Plan

### Story Sequence

| Seq | Story | Rationale | Dependencies |
|-----|-------|-----------|--------------|
| 1 | S20.1: Integración de Bundlers (Node.js) | Risk-first. Cambiar el pipeline de deployment es la fundación de la estructura. | Ninguna |
| 2 | S20.2: Arquitectura de Asset Management  | Dependency-driven. Depende del nuevo flujo de bundles para gestionar el \`.claspignore\`. | S20.1 |
| 3 | S20.3: ES6 ThemeManager Evolution | Refactor táctico final sobre el nuevo ecosistema ES6 habilitado por el bundler. | S20.1, S20.2 |

### Milestones

- **M1: Build Pipeline Migration** (S20.1): Reemplazo funcional del parser Regex por Esbuild/Rollup, produciendo minificados válidos en GAS sin romper el renderizado VDOM.
- **M2: Asset Governance** (S20.2): Estructurización local pura. \`clasp push\` respeta \`.claspignore\` pasivamente y el \`UI_CONFIG\` deja Google Apps Script.
- **M3: Epic Complete** (S20.3): \`ThemeManager\` importado modularmente, sin scripts globales. Todo corre nativo bajo ESM.

### Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|:----:|--------|--------|----------|-------|
| S20.1 | S | Done | S | 100% | Esbuild integrated locally safely |
| S20.2 | S | Done | S | 100% | UI_CONFIG moved locally, claspignore controls css |
| S20.3 |  | Pending|  |  | |
