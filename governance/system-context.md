# System Context: Taxonomia Project

> Define actors and external systems

## External Interfaces

| Actor/System | Integration Type | Description |
|--------------|------------------|-------------|
| **Google Identity Workspace** | Auth | Capa de autenticación nativa para validar identidad y gestionar permisos sin gestor de terceros. |
| **Google Apps Script** | Serverless API / Facade | Motor de enrutamiento y lógica de negocio. |
| **Google Sheets Data Store** | Persistence Layer | Base de datos relacional híbrida operando bajo un patrón de adaptador agnóstico (Adapter_Sheets). |
| **Ionic Framework** | UI Components | Sistema externo de diseño consumido vía CDN para garantizar una interfaz Mobile-First estandarizada. |
