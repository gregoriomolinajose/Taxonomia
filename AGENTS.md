# Taxonomia Project

> RaiSE-governed project. Invoke the `rai-session-start` skill from your IDE to load full context.

## Active Agents

- antigravity

## Process

This project follows the RaiSE methodology. See `.raise/` for governance artifacts and `rai --help` for CLI.

## Reglas Obligatorias (AI Agent)

1. **Secuencia de Despliegue y Validación**: Cuando sea necesario probar un cambio en el entorno integrado, el agente TIENE la obligación de encargarse primero de la subida del código ejecutando el comando correspondiente (ej. `npm run deploy:dev:auto`). Solamente **después** de que el despliegue en CLI declare éxito, el agente se detendrá por completo y le solicitará explícitamente al USUARIO que realice la actualización/recarga manual en Google Apps Script. Ningún test E2E ni validación post-despliegue puede ejecutarse hasta que el usuario confirme haber completado su parte.
