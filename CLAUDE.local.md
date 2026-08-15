# Contexto Local (Taxonomia Project)

## Estado Actual
- **Fase**: `Session Closed` (Forzada por reinicio)
- **Épica Activa**: E23 - Bulk Delete & Performance
- **Rama Actual**: `story/s70.1-bulk-delete` (WIP guardado)
- **Versión**: v1.0.10+ (Desarrollo en curso)

## Notas de Hand-off (Para nueva conversación)
- **Logros Recientes y Parches Rápidos**:
  - Interrupción de sesión durante el desarrollo de la historia S70.1 (Bulk Delete).
  - El estado de la rama (código y tests) ha sido commiteado de forma segura en `story/s70.1-bulk-delete` con el mensaje `chore: save remaining files before chat deletion`.
- **Estado de Tareas Pendientes**:
  - Continuar con la implementación y resolución de bugs en `story/s70.1-bulk-delete` (Adapter_Sheets.js, API_Universal.js, etc).
  - Validar los tests E2E y unitarios que quedaron pendientes.
- **Siguientes Pasos**:
  - Al abrir la nueva conversación, utiliza el skill `/rai-session-start` para cargar este contexto automáticamente y luego retoma los tests fallidos en la rama `story/s70.1-bulk-delete`.

## Current Focus
- **Epic E70 (Operaciones Masivas)**: En progreso.
- **Story S70.1 (Bulk Delete)**: El working tree quedó sucio (cambios en e2e spec `delete-operations.spec.js`, `debug-frame.html`, y borrado de `test-results`). El usuario va a reiniciar la conversación desde cero. El próximo agente o sesión debe retomar esta rama (`story/s70.1-bulk-delete`) y evaluar si hacer un commit de estos tests E2E en progreso o restaurarlos.

## Patterns

- Use `A-XX` prefix for local patterns.
