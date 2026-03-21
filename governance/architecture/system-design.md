---
type: architecture_design
project: "Taxonomia Project"
status: draft
layers:
  - name: "Frontend (Ionic)"
  - name: "Backend API (GAS)"
  - name: "Persistence Adapters"
---

# System Design: Taxonomia Project

> C4 Level 2 — Container/component decomposition
> Fill with /rai-project-create or /rai-project-onboard

## Architecture Overview

El diseño se compone de una arquitectura agnóstica donde el frontend UI (Web Components Ionic) interactúa mediante APIs expuestas en Google Apps Script (doGet). El backend (`Engine_DB.gs`) funciona de enrutador hacia los adaptadores correspondientes de persistencia en modo Dual-Write (Sheets y Cloud DB).

## Components

| Component | Responsibility | Technology |
|-----------|---------------|------------|
| FormEngine_UI.html | UI desacoplado interactivo mediante Wizards | Ionic Web Components |
| JS_Schemas_Config.html | Definición universal de entidades y contratos | HTML/JS |
| API_Auth.js | Control resolutivo, RBAC y sesión | GAS / JS |
| Engine_DB.js | Enrutador agnóstico de persistencia y feature flags | GAS |
| Adapter_Sheets.js | Manejo de lecturas/escrituras en Google Sheets con Upsert | GAS |
| Adapter_CloudDB.js | Manejo de peticiones paralelas a la DB en la Nube | GAS |

## Key Decisions

Dual-Write es obligatorio para evitar puntos únicos de fallo durante la fase de prueba. El frontend debe estar fuertemente guiado por ESQUEMAS estandarizados sin CSS hardcore.
