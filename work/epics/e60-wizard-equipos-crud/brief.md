---
id: e60
title: "Wizard Equipos CRUD"
status: IN_PROGRESS
type: EPIC
---

# Wizard Equipos CRUD

## Objetivo
Ampliar el paso 2 del Wizard de Taxonomías ("Importar Equipos") para integrar la misma pantalla CRUD (DataGrid y Toolbar) de Equipos, pero contextualizada a la Taxonomía actual. Esto permite capacidades completas de "Agregar Nuevo", "Vincular Existente" y "Carga Masiva" desde el mismo lugar.

## Justificación
La funcionalidad previa de carga masiva era limitante, ya que obligaba al usuario a abandonar el Wizard para gestionar o crear equipos individuales, y no mantenía una trazabilidad directa de los equipos vinculados a la Taxonomía en borrador. Reutilizar la vista CRUD fomenta la consistencia visual y técnica en la aplicación.

## Resultados Esperados
- Renderizado del CRUD de Equipos embebido en el Paso 2 del Wizard.
- Funcionalidad de vincular equipos existentes mediante la relación `TAXONOMIA_EQUIPO` (M:N).
- Integración funcional de la carga masiva y creación directa sin salir del Wizard.
