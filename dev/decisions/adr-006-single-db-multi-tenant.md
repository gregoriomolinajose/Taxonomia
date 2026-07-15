---
# ADR-006: Single-DB Multi-Tenant Architecture

## Status
Accepted

## Date
2026-05-26

## Context
Taxonomía necesita operar en múltiples dominios corporativos (Coppel + Bancoppel) con código aislado por dominio debido a restricciones de red y políticas DLP que impiden:
- WebApps cruzadas (Webhook Bridge - Descartado en S59.5-S59.6)
- OAuth2 delegation cross-domain (Descartado por falta de permisos GCP)

Alternativas evaluadas:
1. **Webhook Bridge** → Bloqueado por políticas DLP del dominio externo.
2. **IMPORTRANGE + JOB de Sync** → Complejidad operativa alta; latencia de datos visible al usuario.
3. **Single-DB Compartida** → Ambos tenants leen/escriben en el mismo Google Sheet. Resuelto nativamente por Google Drive.

## Decision
Adoptar el modelo **Single-DB Multi-Tenant**:
- Cada tenant es un proyecto Apps Script independiente en su dominio.
- Ambos apuntan al mismo `SPREADSHEET_ID_DB` (Google Sheets compartido como "Editor").
- Las configuraciones locales del tenant (SSO, branding, tenant name) viven en el `PropertiesService` local de cada proyecto Apps Script (nunca en la BD compartida).
- Los UUIDs garantizan cero colisiones de IDs entre tenants.
- La Caché en RAM (CacheService) es local a cada proyecto Apps Script, por lo que hay una ventana máxima de 15 minutos de inconsistencia visual entre tenants (aceptable para datos organizacionales).

## Consequences

### Positive
- Cero fricción de red (Google Drive maneja el acceso cross-domain si está permitido por políticas).
- Cero sincronización de datos (fuente única de verdad real).
- Relaciones cruzadas entre personas de distintos dominios funcionan nativamente.
- Escalabilidad inmediata a nuevos tenants: solo requiere un nuevo proyecto Apps Script + compartir el Sheet.

### Negative
- Requiere que el administrador del Sheet principal conceda acceso "Editor" al correo de servicio del tenant secundario.
- Si el Sheet principal (Coppel) se corrompe o elimina, ambos tenants pierden acceso a datos.
- Las políticas DLP del tenant secundario deben permitir acceder a Drives externos (confirmado por el usuario).
