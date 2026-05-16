# Epic E56: Wizard Bulk Import (Equipos & Personas)

## Objective
Integrate bulk import capabilities directly into the Taxonomía Wizard to streamline the onboarding of large numbers of teams (Equipos) and people (Personas). This involves expanding the wizard with two new steps, embedding the existing bulk import UI inline (removing the modal constraint), and adding Google Sheets inspection functionality.

## Boundaries (In/Out of Scope)
### In Scope
- Expanding the Taxonomía wizard steps: Step 2 (Importar Equipos), Step 3 (Importar Personas), and shifting the Taxonomía Canvas to Step 4.
- Rendering the bulk import UI (Google Sheets/CSV selector, URL input) inline within the wizard steps, rather than as a standalone modal.
- Adding functionality to inspect/validate Google Sheets files (via URL or ID) before executing the import.
- Reusing existing ETL mechanisms to execute the bulk import for Equipos and Personas.

### Out of Scope
- Creating new ETL backend logic (the existing ETL engine should be reused).
- Modifying the Canvas (Step 4) functionality itself.
- Supporting new data sources other than Google Sheets and CSV.

## Planned Stories
- [x] S56.1 - Reestructuración del Wizard ✓: Modificar la configuración del stepper para insertar el Paso 2 (Equipos) y Paso 3 (Personas), desplazando el Canvas al Paso 4.
- [x] S56.2 - UI de Importación Embebida (Inline) ✓: Adaptar el diseño actual del modal de carga masiva para que se renderice directamente en el contenido del paso del wizard, sin usar un modal.
- [x] S56.3 - Inspección de Archivos Google Sheets ✓: Implementar la lógica para leer, validar o extraer metadatos de un Google Sheet a partir de su URL o ID antes de la importación.
- **S56.4 - Integración de Ejecución ETL:** Conectar el botón "Cargar Registros" del paso del wizard con el motor ETL existente para procesar la importación de Equipos y Personas en sus respectivos pasos.

## Done Criteria
- The Taxonomía Wizard has 4 steps: Configuración General, Importar Equipos, Importar Personas, Taxonomía Canvas.
- Users can paste a Google Sheets URL in Step 2 and Step 3 and the system can inspect it.
- Users can execute a bulk import directly from the wizard steps without opening a modal.
- Imported entities are correctly associated with the current Taxonomía context.

## Implementation Plan

### Story Sequence & Rationale
1. **S56.1 - Reestructuración del Wizard** (Foundation): Creates the necessary DOM containers and step navigation to house the new features without breaking existing logic.
2. **S56.2 - UI de Importación Embebida (Inline)** (UI Definition): Migrates the visual layout from the modal to the inline container, ensuring the UX matches the provided reference image.
3. **S56.3 - Inspección de Archivos Google Sheets** (Risk-First): Implementing the actual Google Sheets inspection via GAS can be tricky. Doing this before final integration mitigates technical risk.
4. **S56.4 - Integración de Ejecución ETL** (E2E Integration): The final wire-up that connects the UI, the parsed sheet data, and the backend ETL engine, enforcing context linkage (Borrador).

### Milestones
- **M1: Wizard Skeleton (S56.1, S56.2):** The stepper has 4 steps, and the new UI is visible inline without functionality. (Proves UI architecture).
- **M2: Sheet Inspection MVP (S56.3):** The system can read a pasted Google Sheets URL and extract metadata.
- **M3: E2E Integration (S56.4):** Real records can be imported using the new inline wizard step, successfully flowing through the ETL and persisting as drafts.
- **M4: Epic Complete:** All done criteria met.

### Top Risks
1. **Event Bubbling & Form Validation:** Putting complex inputs inside a stepper might trigger validation issues or accidental form submissions. *Mitigation:* Ensure `UI_FormStepper` gracefully handles the `UI_BulkImporter` inputs.
2. **ETL Context Linking:** Ensuring the bulk imported records correctly receive the Taxonomía `_contexto_arista` to prevent graph leakage. *Mitigation:* S56.4 will rigorously test the payload injection before the `API_Universal` call.
3. **Google API Quotas / URL Parsing:** Various formats of Google Sheets URLs might fail to parse. *Mitigation:* Robust Regex in S56.3 for URL extraction.

### Progress Tracking

| Story | Size | Status | Actual | Velocity | Notes |
|-------|------|--------|--------|----------|-------|
| S56.1 | S | Done | ~1h | Fast | Foundation |
| S56.2 | M | Done | ~2h | Fast | UI shell & refactoring |
| S56.3 | M | Done | ~1h | Fast | Google API integration & Backend UI hooks |
| S56.4 | L | To Do | - | - | Backend ETL orchestration |
