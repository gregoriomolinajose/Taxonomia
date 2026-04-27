# Epic 45: Architecture Refactoring & Tech Debt

# Epic 45: Architecture Refactoring & Tech Debt

## Objetivos
- Refactorización de componentes estructurales y pago de deuda técnica acumulada en la épica 44.

## Deuda Técnica / Backlog
- [x] ~~**S45.1 - Normalización de Contratos API (StandardResponse)**~~: (Descoped) El backend devuelve estructuras variables (`Array` o `{ status, details }`) dependiendo del endpoint, provocando que la capa de red del frontend (ej. `DataEngine_ETL.client.js`) deba aplicar técnicas de validación defensiva y forcejeo de campos múltiples. Homogeneizar todas las respuestas del Controlador a un contrato unificado global para robustecer la previsibilidad del cliente.
- [x] **S45.2 - Refactorización de Cargo Auto-Provisioning**: Extraer lógica de auto-creación de Cargos desde `Engine_ETL` hacia `Schema_Engine` (Middleware) para respetar la arquitectura de separación de responsabilidades y evitar cuellos de botella con la caché en sincronizaciones (Deuda técnica identificada en E44).
- [x] **S45.4 - Modernización de UX en Carga Masiva (ETL)**: Integración de patrones de Ionic 7 (floating labels nativos y helper-text), validaciones en tiempo real para URLs de GSheets, y saneamiento de Ghost Locks provocados por orfandad en el DOM.
- [x] **S45.5 - Optimización de Feedback Visual en Carga Masiva (ETL) E2E**: Refactorizar el modal de carga para proporcionar un spinner con progreso continuo (0% a 100%) y descripciones paso a paso del flujo de sincronización, reemplazando los contadores estáticos de lotes para una mejor experiencia de usuario.
- [x] **S45.6 - Validación Estricta de Correo en Carga Masiva**: Implementar un filtro en `DataEngine_ETL` para rechazar filas vacías o con correos fuera de los dominios autorizados en las variables de entorno, devolviendo un error claro en el archivo CSV de feedback.
- [x] **S45.7 - Endurecimiento de Reglas ETL y Priorización de Workspace**: Implementación de Fast-Fail para estructura de columnas, insensibilidad a mayúsculas/minúsculas, captura de excepciones 200 HTTP, y establecimiento de Google Workspace como Source of Truth en sincronizaciones.
