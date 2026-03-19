---
type: architecture_context
project: "Taxonomia Project"
status: draft
tech_stack: { "frontend": "Ionic", "backend": "Google Apps Script" }
external_dependencies: ["Google Workspace", "Google Sheets", "Cloud Database"]
users: ["PMs", "POs", "SMs", "Devs"]
governed_by: ["SAFe 6.0"]
---

# System Context: Taxonomia Project

> C4 Level 1 — System Context diagram and description
> Fill with /rai-project-create or /rai-project-onboard

## Overview

Taxonomia Project is a SAFe 6.0 portfolio tracking tool. It connects business strategy (Portfolios, Domains, Products) to execution (Teams, Roles) acting as a Single Source of Truth. The backend operates in Google Apps Script exposing services to an Ionic decoupled frontend.

## Context Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  Users   │──────►│  Taxonomia   │──────►│ Google Sheets│
│(PM, Dev) │       │   Project    │       └──────────────┘
└──────────┘       │              │       ┌──────────────┐
                   │              │───────► Cloud DB     │
                   └──────────────┘       └──────────────┘
```

## External Interfaces

| System | Direction | Protocol | Description |
|--------|-----------|----------|-------------|
| Google Workspace | Inbound | OAuth/GAS | Autenticación y controles RBAC. |
| Google Sheets | Outbound | GAS API | Almacenamiento primario y backup en Dual-Write. |
| Cloud Database | Outbound | HTTP/REST | Base de datos en la nube (ej. Firestore) sincronizada vía Dual-Write. |
