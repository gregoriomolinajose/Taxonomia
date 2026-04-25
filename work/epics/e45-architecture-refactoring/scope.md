# Epic 45: Architecture Refactoring & Tech Debt

## Objetivos
- Refactorización de componentes estructurales y pago de deuda técnica acumulada en la épica 44.

## Deuda Técnica / Backlog
- [ ] **S45.1 - Normalización de Contratos API (StandardResponse)**: El backend devuelve estructuras variables (`Array` o `{ status, details }`) dependiendo del endpoint, provocando que la capa de red del frontend (ej. `DataEngine_ETL.client.js`) deba aplicar técnicas de validación defensiva y forcejeo de campos múltiples. Homogeneizar todas las respuestas del Controlador a un contrato unificado global para robustecer la previsibilidad del cliente.
- [x] **S45.2 - Refactorización de Cargo Auto-Provisioning**: Extraer lógica de auto-creación de Cargos desde `Engine_ETL` hacia `Schema_Engine` (Middleware) para respetar la arquitectura de separación de responsabilidades y evitar cuellos de botella con la caché en sincronizaciones (Deuda técnica identificada en E44).
