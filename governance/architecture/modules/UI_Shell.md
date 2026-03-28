---
type: module
name: UI_Shell
purpose: "Application bootstrap shell. Provides AuthManager, ThemeManager, SPA router (navigateTo), and the 3-state responsive sidebar. The entry point that wires every other UI module together."
status: active
depends_on: [GAS_Server]
depended_by: [DataView_Engine, Form_Engine, Dashboard_UI]
components:
  - Index.html (DOM shell, scriptlet injector)
  - JS_Core.html (AuthManager, ThemeManager, navigateTo, sidebar logic)
  - CSS_DesignSystem.html (design token system)
  - CSS_App.html (component overrides, responsive rules)
  - Global_Config.js (version, spreadsheet IDs)
---

## Purpose

This module is the **launch pad** of the SPA. It exists because all other UI modules need a common execution context: authentication state, navigation primitives, theme tokens, and a mounted DOM. Without this module, the app could not bootstrap.

## Architecture

**Index.html:**
Uses GAS Template Engine (`createTemplateFromFile + evaluate()`) with `<?!= include('ModuleName') ?>` scriptlets to inline all CSS/JS at page render time. This means the entire SPA ships as a single HTML payload — no additional HTTP requests.

**AuthManager (JS_Core.html):**
1. Shows ion-loading spinner
2. Calls `google.script.run.getUserIdentity()` → validates email domain
3. On success: restores dashboard DOM, runs `runAppBootstrap()` to trigger the Global Prefetch
4. On reject: renders ion-card with "Acceso Denegado"

**Global Prefetch:**
`runAppBootstrap()` calls `getAppBootstrapPayload()`, which bulk-loads **all entities** in a single RPC call and populates `window.__APP_CACHE__`. All subsequent UI operations are zero-latency (memory-only reads).

**SPA Router: `navigateTo(viewType, entityKey)`**
- `'dashboard'` → restores original DOM + renders dashboard cards
- `'dataview', entityKey` → calls `DataViewEngine.render(entityKey)`
- `'designkit'` → clones design kit template into the app container

**3-State Sidebar (`ion-split-pane`):**
- State 0 (Full): full sidebar with labels
- State 1 (Mini): icon-only sidebar (`.shell-mini` CSS class)
- State 2 (Hidden): `when="false"` attribute removes sidebar entirely
- State persisted to `localStorage('sidebar_state')`

## Key Files

| File | Role |
|------|------|
| `Index.html` | HTML shell. Injects all modules via GAS scriptlets. |
| `JS_Core.html` | Auth, routing, sidebar, theme. DOMContentLoaded bootstrap. |
| `CSS_DesignSystem.html` | Design tokens: `--spacing-*`, `--color-*`, typography. |
| `CSS_App.html` | Shadow DOM overrides, responsive layout, animation rules. |
| `Global_Config.js` | Version string, SPREADSHEET_ID_DB, allowed email domains. |

## Conventions

- **Regla UI §14:** All JS lives in modular HTML files, never inline in Index.html
- **Mobile-First:** All layout rules start with mobile, override at `@media (min-width: 992px)`
- **Theme via CSS Variables:** Theme switching swaps body classes, never touches inline styles
