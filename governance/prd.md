# PRD: CorePlatform (Taxonomia & GreatPeeps)

> Product Requirements Document — fill with /rai-project-create or /rai-project-onboard

---

## Problem

La estrategia de negocio (Portafolios) y el embudo de crecimiento de talento (Reclutamiento) sufren de desconexión sistémica. El uso de plataformas aisladas para publicar vacantes, agendar entrevistas, filtrar candidatos y gestionar capacidades organizacionales genera latencia, datos desincronizados y retrabajo manual.

## Goals

Establecer una Suite Integrada (CorePlatform) donde un Motor Agnóstico provea UI interactiva, Base de Datos en tiempo real, ABAC y Formularios a soluciones especializadas como Taxonomía (Go-to-Market y Capacidades) y GreatPeeps (Reclutamiento).

---

## Requirements

### RF-01: Gestión de Jerarquía de Valor y Operativa (Taxonomía)
El sistema debe permitir gestionar Portafolios, Dominios, Productos y Capacidades, y entrelazarlos visualmente con el bloque operativo.

### RF-02: Gestión del Ciclo de Vida de Vacantes (GreatPeeps)
Permitir a los reclutadores y clientes internos crear, aprobar, iterar y cerrar vacantes en la plataforma.

### RF-03: Hub de Integraciones de Reclutamiento (GreatPeeps)
Conectarse de forma bidireccional con LinkedIn y otras plataformas para publicar vacantes e importar automáticamente a los postulados.

### RF-04: IA para Filtrado y Scoring de CVs (GreatPeeps)
Integración nativa con Gemini API para leer currículums, categorizar perfiles y otorgar una calificación de idoneidad (score) para el puesto.

### RF-05: Agendamiento y Resumen de Entrevistas (GreatPeeps)
Sincronización con Google Calendar para el contacto y agendamiento, además de proveer resúmenes accionables de entrevistas (Descartar/Avanzar) mediante IA y Google Drive.

### RF-06: Motor Agnóstico Backend con Dual-Write (Core)
El backend debe procesar peticiones hacia Google Sheets y Cloud Database, implementando lógica UPSERT.

### RF-07: Formularios con Progressive Disclosure (Core)
Interfaces construidas en Ionic Web Components con Wizards (ion-stepper) guiados estrictamente por metadatos (JS_Schemas_Config).

### RF-08: Control Resolutivo y Acceso RBAC/ABAC (Core)
Autenticación vía Google Workspace, con flujos de aprobación jerárquica para mutaciones.
