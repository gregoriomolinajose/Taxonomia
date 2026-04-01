# Epic 15: Topological Tech Debt Design

This document details the architectural implementation approach to tackle the technical debt outlined in Epic 15.

## Proposed Changes

### CI/CD Pipeline (Validation Step)
#### [MODIFY] [deploy.js](file:///c:/Users/grego/Antigravity/Taxonomia%20Project/deploy.js)
- Import `acorn` and parse the raw `<script>` contents from HTML files being processed.
- Throw an error and explicitly `process.exit(1)` before returning the payload if syntax errors are found (this blocks `clasp push`).

### Core UI Index (Error Boundaries)
#### [MODIFY] [Index.html](file:///c:/Users/grego/Antigravity/Taxonomia%20Project/src/Index.html)
- Add a specific `window.onerror` fallback that renders a red full-screen UI with the error block natively, discarding broken HTML.

### Input Submission Normalization
#### [MODIFY] [UI_FormSubmitter.html](file:///c:/Users/grego/Antigravity/Taxonomia%20Project/src/UI_FormSubmitter.html)
- Change logic replacing falsy validation with strict trimming: `const cleanVal = String(rawVal).trim(); if (cleanVal === "") { ... }`

### Garbage Collection & Modal Flashes
#### [MODIFY] [UI_ModalManager.html](file:///c:/Users/grego/Antigravity/Taxonomia%20Project/src/UI_ModalManager.html)
- In the `dismissTopModal()` function, change the hardcoded `setTimeout(..., 300)` logic to hook onto the Ionic `ionModalDidDismiss` promise/event.

### Delegating FormRenderer Generics
#### [MODIFY] [FormRenderer_UI.html](file:///c:/Users/grego/Antigravity/Taxonomia%20Project/src/FormRenderer_UI.html)
- Decouple the monolithic `switch(field.type)` mapping into a clean delegated call: `return window.UI_Factory.buildInput(field, context)`
#### [MODIFY] [UI_Factory.html](file:///c:/Users/grego/Antigravity/Taxonomia%20Project/src/UI_Factory.html)
- Create `buildInput(field, context)` to receive the abstract logic.

### V8 Scope Purging
#### [MODIFY] [UI_FormUtils.html](file:///c:/Users/grego/Antigravity/Taxonomia%20Project/src/UI_FormUtils.html)
- Remove `window.getDominiosPadreOptions = getDominiosPadreOptions`.
- Convert the utility bindings to avoid mutating `window` uncontrollably.
