# System Context: CorePlatform

> System context diagram — fill with /rai-project-create or /rai-project-onboard

## External Interfaces

| System | Role | Protocol/API | Integration Type |
|--------|------|--------------|------------------|
| Google Sheets | Base de Datos Transaccional (Hot) | Google Apps Script Service | Native Sync |
| Google Drive | Almacenamiento de CVs y Archivos | Google Apps Script Service | Native Sync |
| Google Calendar | Agendamiento de Entrevistas | Google Apps Script Service | Native Sync |
| Gemini API | Procesamiento y Scoring de Perfiles | REST / RPC | REST Client |
| LinkedIn | Fuente de reclutamiento (Bolsa) | REST / OAuth2 | REST Client |
| Google Workspace | Autenticación y Perfiles | Google Apps Script Service | Native Sync |
| Cloud Database | Backup/Cold Storage (Opcional) | JDBC / REST | Async |
