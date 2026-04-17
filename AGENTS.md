# Taxonomia Project

> RaiSE-governed project. Invoke the `rai-session-start` skill from your IDE to load full context.

## Active Agents

- antigravity

## Process

This project follows the RaiSE methodology. See `.raise/` for governance artifacts and `rai --help` for CLI.

## Reglas Obligatorias (AI Agent)

1. **Pausa de Despliegue**: Inmediatamente después de ejecutar un comando de despliegue (ej. `npm run deploy:dev:auto`, `clasp push`, etc.), el agente TIENE la obligación ineludible de **detener su ejecución y pedir explícitamente al USUARIO que realice un release o recarga manual** en Google Apps Script para que el nuevo código tome efecto en la sesión de pruebas. Ningún test E2E ni validación post-despliegue puede ejecutarse hasta que el usuario confirme haber completado este paso.
