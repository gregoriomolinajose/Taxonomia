# System Design: Taxonomia Project

> Component breakdown from discovered modules

## Components

| Component | Kind | Category | Purpose |
|-----------|------|----------|---------|
| **Code.js** | file | entrypoint | Serves as the main GAS HTTP entry point (doGet). |
| **FormEngine_UI.html** | file | ui | Main Ionic UI application renderer. |
| **Engine_DB.js** | file | service | Agnostic persistence router for GAS backend. |
| **API_Auth.js** | file | service | Handles authentication and session management. |
| **Adapter_Sheets.js** | file | adapter | Data adapter for Google Sheets. |
| **Adapter_CloudDB.js** | file | adapter | Data adapter for Cloud Database (e.g. Firebase/Firestore). |
| **JS_Schemas_Config.html** | file | schema | Single source of truth for entity definitions. |
