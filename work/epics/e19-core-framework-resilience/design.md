# Epic Design: E19 (Core Framework Resilience & Strictness)

## 1. Context & Objective
The SPA Architecture currently allows silent execution failures, floating promises that get lost in the event loop, and "White Screen of Death" (WSOD) when rendering loops fail. The goal of this Epic is to enforce a Zero-Trust approach to the UI thread, adding robust structural error limits, defensive validation, and telemetry to capture anomalous behavior.

## 2. Technical Architecture & Constraints

### 2.1 S19.1: Truthiness & Strict Types
*   **Gemba/Files:** `Generator_UI.js`, `FormEngine_UI.html`, `Validator.js`.
*   **Design Decision:** Move away from standard JavaScript `if (!value)` truthiness checks when evaluating metadata, configurations, or IDs.
*   **Implementation Rule:** Use strict checking (`value === undefined || value === null`) everywhere. A payload ID could theoretically be `0` or `""` or `false` in edge-cases, which JS will evaluate to false in standard if-checks, causing silent skips.

### 2.2 S19.2: Defusing Floating Promises (Ionic Components)
*   **Gemba/Files:** `Governance_Admin_UI.html`, `FormEngine_UI.html`, Modals, Toasts.
*   **Design Decision:** Ionic Framework operates completely asynchronously (`.present()`, `.dismiss()`). Floating promises can silently swallow exceptions.
*   **Implementation Rule:** EVERY Ionic asynchronous call must be prefixed with `await` inside an `async` function and wrapped in `try/catch`, or appended with `.catch(console.error)`.

### 2.3 S19.3: AppEventBus Telemetry system
*   **Gemba/Files:** `EventBus.js` (NEW) or `JS_Core.html`.
*   **Architecture:** Implement a localized `PubSub` Telemetry class: `window.Telemetry`.
*   **Mechanics:**
    *   Modules call `Telemetry.track('ACTION', metadata)`.
    *   Log pushes to an ephemeral queue.
    *   *Optional:* Batch flush every 5 seconds via `google.script.run` (to avoid Network exhaustion), or simply output strictly configured logs to the `console` for debugging without killing the RAM. We will focus initially on Console/Local storage to preserve quota.

### 2.4 S19.4: Global Error Boundaries (Graceful Degradation)
*   **Gemba/Files:** `SPA_Router.html`, `JS_Core.html`.
*   **Design Decision:** Protect the user against catastrophic rendering halts (WSOD).
*   **Implementation:** 
    *   Inject `window.onerror` and `window.addEventListener("unhandledrejection", ...)`.
    *   If a fatal error is caught, clear the screen and inject a friendly fallback UI (e.g., `<ion-icon name="warning"></ion-icon> Ha ocurrido un error...`).

## 3. Interfaces & Contracts
- **Global Error Handler**: `window.TaxonomiaErrorHandler(error, source, lineno, colno)`
- **Telemetry Interface**: `window.Telemetry.log(level, action, payload)`

## 4. Risks & Mitigations
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Catching errors that shouldn't be caught (swallowing errors). | High | High | Ensure `Telemetry.log` prints clearly in red inside the developer console. Do not swallow exceptions in `try/catch` silently. |
| Performance hit with Telemetry batching | Low | Medium | Make telemetry dispatch completely asynchronous and throttled (Debounce/Interval based). |

## 5. Next Steps
Once approved, we will transition to `/rai-epic-plan` to extract these items into atomic executable tasks.
