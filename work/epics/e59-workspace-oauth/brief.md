# Epic E59: Federated Workspace OAuth & Domain Cleanup — Brief

## Hypothesis
Si unificamos el modelo de datos bajo `Config_Workspace` y habilitamos un flujo OAuth 2.0 por dominio con validación `.trim()`, entonces aseguraremos una arquitectura limpia libre de redundancias y permitiremos integraciones transparentes multitenant sin exponer tokens duros para administradores secundarios, medido por cero fallos de autorización por dominios válidos y el exitoso guardado de tokens.

## Success Metrics
- 0 caídas de login en dominios alternos legítimos.
- Desaparición del campo redundante en Global Settings UI.
- Logro de conexión de token vía `initCodeClient`.

## Boundaries
- In: Fix de espacios, purga de variables en Config_Global, UI de Workspace OAuth.
- Out: Flujos de abac cruzado (ya cubierto en E18).
