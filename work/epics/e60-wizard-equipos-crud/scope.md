---
id: e60
title: "Wizard Equipos CRUD"
status: IN_PROGRESS
type: EPIC
---

# Alcance

## Dentro de Alcance
- Creación de un componente contenedor `UI_Component_EmbeddedDataView` aislado para renderizar una tabla y barra de herramientas.
- Integración de la vista completa de `UI_DataGrid` en el paso 2 del Wizard para la entidad `Equipo`.
- Funcionalidad de "Vincular Equipos" a través de un Modal/Drawer usando selección múltiple (`TXSelect`).
- Implementación de la arista relacional `TAXONOMIA_EQUIPO` (cardinalidad M:N) en el grafo temporal (`Sys_Graph_Edges`).
- Persistencia del esquema para el campo `equipos_vinculados` en `Taxonomia`.

## Fuera de Alcance
- Modificaciones al DataGrid global del sistema.
- Cambios en las validaciones de negocio u otras entidades del Wizard.
