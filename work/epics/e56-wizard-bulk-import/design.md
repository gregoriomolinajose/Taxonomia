# E56 Design: Wizard Bulk Import (Equipos & Personas)

## 1. Architectural Changes
To integrate the bulk import feature natively into the Taxonomía Wizard without relying on modals, the wizard's underlying DOM structure and sequence must be updated:
- The `UI_FormStepper.client.js` configuration inside `Taxonomia` schema needs to be expanded. Currently it's `['Configuración General', 'Taxonomía Canvas']`. It will become `['Configuración General', 'Importar Equipos', 'Importar Personas', 'Taxonomía Canvas']`.
- The existing Bulk Import UI components (currently rendering as a modal, likely from `UI_DataView_ETL` or similar) will be adapted so they can be injected as standard `div` fragments within the `stepContainers` of `UI_FormStepper`.
- The API call `API_Universal_Router` or Google Drive integration used for the bulk import will need to associate the imported records automatically with the current Taxonomía draft (workspace).

## 2. Component Design: Inline Bulk Importer
- **Target Component:** A new or adapted `UI_BulkImporter.client.js` component.
- **Responsibilities:**
  - Render the data source selector (Google Sheets vs CSV).
  - Render the Google Sheets template generation link.
  - Render the input for the Google Sheets URL/ID.
  - Add an "Inspector" functionality to extract metadata (sheet name, row count) before hitting "Load Records".
- **State Management:**
  - The step must be able to signal to the stepper whether it's valid to continue (e.g. at least one file loaded, or optional skip).
  - If skipped, it just advances. If loaded, it waits for the ETL engine to finish.

## 3. Data Flow
1. **User Pastes URL:** An `onblur` or `oninput` event with debounce triggers an `inspectSheet(url)` function to GAS.
2. **GAS Responds:** Returns sheet names and row count. The UI updates to show "Ready to import X rows".
3. **Execution:** User clicks "Cargar Registros". The existing `API_Universal.etl` or equivalent is called.
4. **Context Linking:** The payload must include `_estado_arista: 'Borrador'` and `_contexto_arista: taxonomía_id` so that imported Equipos and Personas are immediately attached to the draft, similarly to how `UI_FormSubmitter` does it.
