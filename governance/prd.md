# PRD: Taxonomia Project

> Product Requirements Document — fill with /rai-project-create or /rai-project-onboard

---

## Problem

La estrategia de negocio a menudo se desincroniza de la ejecución tecnológica, resultando en datos obsoletos y una trazabilidad pobre en portafolios y capacidades. Se necesita una forma eficiente para gestionar recursos, alineación y flujos de aprobación.

## Goals

Establecer una Única Fuente de Verdad interactiva que conecte entidades de valor (Portafolios, Dominios) con entidades operativas (Equipos, Roles) bajo un estricto framework de aprobación jerárquica.

---

## Requirements

### RF-01: Gestión de Jerarquía de Valor y Operativa

El sistema debe permitir gestionar Unidades de Negocio, Portafolios, Dominios, Productos y Capacidades, y entrelazarlos visualmente con el bloque operativo (Personas, Roles y Equipos).

### RF-02: Enrutador Agnóstico Backend con Dual-Write

El backend debe procesar peticiones mediante el intermediario Engine_DB y escribirlas en paralelo hacia Google Sheets y Cloud Database, implementando lógica UPSERT obligatoria.

### RF-03: Formularios con Progressive Disclosure

La interfaz gráfica debe desacoplarse como una aplicación basada en Web Components de Ionic, utilizando Wizards interactivos (ion-stepper) guiados estrictamente por JS_Schemas_Config.

### RF-04: Control Resolutivo y Acceso (RBAC)

Todo acceso debe autenticarse usando la cuenta de Google Workspace conectada, obligando a los usuarios "Padres" a aprobar flujos de componentes de nivel "Hijo".
