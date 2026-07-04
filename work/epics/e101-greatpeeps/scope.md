# Scope: GreatPeeps MVP (E101)

## Objective
Construir y desplegar el módulo de reclutamiento "GreatPeeps", integrando la gestión del ciclo de vida de vacantes, filtrado inteligente de CVs (Gemini) y agendamiento de entrevistas.

## In Scope
- Diseño e implementación de esquemas de datos: Empresa/Cliente, Vacantes, Postulantes, Entrevistas.
- Módulo UI para publicación y listado de vacantes (Integración Web Components).
- Hub de integración bidireccional (LinkedIn básico, Workspace Drive, Calendar).
- Pipeline ETL/IA para lectura y scoring de CVs usando Gemini.

## Out of Scope
- Nómina y compensaciones.
- Gestión de desempeño de empleados (Eso vive en Taxonomía u otro módulo futuro).
- Onboarding (Queda para v2).

## Planned Stories
- **S101.1:** Diseño de esquemas de datos y vistas base (Vacantes).
- **S101.2:** Integración Calendar y Hub IA (Filtro Gemini).
- **S101.3:** Portal Frontend de Reclutamiento.

## Done Criteria
- [ ] Formularios de Vacantes operando en producción (dual-write).
- [ ] Flujo de CV -> Drive -> Gemini -> Score operativo.
- [ ] Arquitectura desplegada en GAS y aprobada mediante Architecture Review.
