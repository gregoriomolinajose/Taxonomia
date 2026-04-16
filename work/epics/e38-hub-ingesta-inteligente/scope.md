# Epic E38: Hub de Ingesta Inteligente y Sincronización Workspace

## Objetivo
Transicionar el sistema de importaciones planas CSV hacia un flujo integral (Modal Híbrido) capaz de:
1. Generar dinámicamente hojas de cálculo estructuradas a modo de plantilla.
2. Extraer datos directamente bajo demanda proporcionando una URL de Google Sheets.
3. Rechazar lógicamente entidades duplicadas (ej: Persona) sin corromper el documento original ni lanzar fallos.
4. Complementar la data persistente cruzándola con la información más reciente de Google Workspace en tiempo real.

## Dentro del Alcance (In Scope)
- Modal ETL visual en UI.
- Botón y sub-rutina de automatización Drive (Plantillas de Schema).
- Lector Backend (`SpreadsheetApp`) puro que retorna matrices al Frontend.
- Chunker Asincrónico JS Frontend (División de la sabana en arreglos limitados).
- DB Batch Hook para ignorar pasivamente copias basándose en PK's lógicas (`email` o `numero_empleado`).
- Mecanismo visual de retrolimentación "Rojo" para registros duplicados (Directo en el Google Sheet vinculado, o devolviendo un archivo de retorno).

## Fuera de Alcance (Out of Scope)
- Validación de fórmulas del Excel. Los valores brutos obtenidos (`getValues()`) son la base.

## Historias Planificadas
- **S38.1**: [x] Construcción del Componente Modal Híbrido ETL.
- **S38.2**: [x] Endpoint y Permisos para Auto-Generación de Plantillas en Drive.
- **S38.3**: [x] Extracción Segura (Reader Pipeline) de la matriz de Google Sheets al Frontend.
- **S38.4**: [x] Tolerancia e Ignorado de Inconsistencias (Omitir Cabeceras de Auditoría).
- **S38.5**: [x] Hardening de DB Batch y Re-hidratación Automática para `Persona` (Workspace Lookup).
- **S38.6**: [x] Cobertura de Pruebas Integrales (Unitarias, Integración y E2E) para Hub Ingesta.

## Integraciones y Mejoras Transversales
- **Error Categorization (S38.6)**: Se implementó un mapeo semántico de códigos de error dentro del `API_Universal`, de modo que el Front-End consuma un `errorType` estandarizado (`BAD_REQUEST`, `UNAUTHORIZED`, `CONCURRENCY`, `GENERAL`) en lugar de fallos nativos no-manejables de Google Apps Script. Esto permite mostrar Retroalimentación visual proactiva en Toasts.
## Criterios de Finalización (Done)
- Todas las UI tests corren sin lanzar Console Errors.
- Si un usuario alimenta 800 personas, el modal de carga fraccionada no muere antes del 100%.
- Un registro existente de Persona no se clona, ni crashea, simplemente se salta.
