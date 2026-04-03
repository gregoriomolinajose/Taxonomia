# Epic 24 Scope: Frontend God Objects Decomposition

## Objective
Descomponer estructuralmente los 4 grandes God Files del frontend (archivos que superan las 600 líneas de código y monopolizan operaciones mixtas). Aislar responsabilidades gráficas de control y de estado hacia un patrón de diseño atómico.

## In Scope
- Refactorización / Desacoplamiento de **`DataView_UI.html`** (763 LOC) separando Toolbar, DataGrid DOM Engine y Data State Manager.
- Refactorización de **`app.css`** (829 LOC) a arquitecturas escalables.
- Split de **`FormRenderer_UI.html`** (697 LOC) extrayendo evaluación de Dependencias de la lógica pura de ionic DOM iteration.
- Desprendimiento del factorizador **`FormBuilder_Inputs.html`** (617 LOC).

## Out of Scope
- Reescritura del Engine backend o reestructuración de la base de datos (ya saneados).
- Adición de nuevas funcionalidades *core* de interfaz no existentes previamente.

## Planned Stories (S24.x)
1. **[x] S24.1:** DataView UI MVP Refactor (Split State/Toolbar/Grid).
2. **[x] S24.2:** FormRenderer Dependency & Node Extraction.
3. **[x] S24.3:** FormBuilder_Inputs Factory Atomization.
4. **[ ] S24.4:** `app.css` Deprecation & Atomic Stylesheets.
5. **[ ] S24.5:** Event Delegation Migration (Migrar inyecciones de literales `window.Module` a manejadores nativos como `AppEventBus` o listeners delegados en constructores).
6. **[ ] S24.6:** DataAPI Consolidation (Consolidar Resolvers y Fetches asíncronos en megaobjeto `DataAPI` para aislar el Event Loop del Global Scope).
7. **[ ] S24.7:** UI Components Hardening (Añadir bloques defensivos try/catch en el parseo JSON del `initialSelection` dentro de `SearchableMulti` como recomendación del QR).

## Done Criteria
Todos los archivos del frontend están dentro de tolerancias arquitecturales sanas (150-400 LOC). Los 4 God files dejan de existir bajo su nomenclatura monolítica. Los tests E2E y el renderizado reacciona idénticamente (Regression Tested).
