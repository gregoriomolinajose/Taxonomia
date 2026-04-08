# Epic Design: E27 E2E Relation Resilience (Real Auth E2E)

## Architecture Overview

**Core Focus:**
Bridging the E2E boundary against a black-box Google Apps Script endpoint by bypassing interactive Auth using Playwright's persistent context, while simultaneously resolving a critical Race Condition in the SPA's relation builders.

### Component Map

**1. Playwright Auth Injector (`__tests__/e2e/global-setup.js`)**
- Implementa `playwright.chromium.launchPersistentContext` o usa el almacenamiento de estado `.auth/user.json`.
- Si las cookies no existen, Playwright abre un browser interactivo (no headless) 1 sola vez para que el desarrollador pase por Google SSO/MFA. Luego guarda las cookies.
- Las ejecuciones subsiguientes corren `headless` en Vitest montando ese estado, garantizando bypass directo.

**2. Playwright Stress Actor (`__tests__/e2e/hierarchy.spec.js`)**
- Visita `https://script.google.com/a/macros/coppel.com/s/{SCRIPT_ID}/exec`.
- Ejecuta los clics a velocidades robot, forzando la cola de red de `google.script.run`.

**3. Frontend Optimistic Mutex (`src/UI_SubgridBuilder.client.js` & `src/UI_Component_RelationBuilder.client.js`)**
- Introduce un Lock (`data-syncing="true"`) visual.
- Altera el Buscador de Subgrid: en lugar de repintar vacío cuando se envía un hijo a asociar, inyecta Optimísticamente la pastilla/pill de la Entidad Hijá en la tabla local.
- Descarta broadcasts de EventBus si el Mutex está activo, evitando Repaints ciegos.

## Decisions (ADRs Required?)
- No se requiere ADR formal, pero se documenta que **E2E Cloud Storage será estrictamente local** (el archivo `auth.json` debe ser ignorado en git `/.auth/`) para no exponer sesiones OAuth2 corporativas.
