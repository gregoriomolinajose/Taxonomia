# Epic Brief: E27 E2E Relation Resilience

## Hypothesis
Si refactorizamos el despachador de eventos asíncronos en los módulos relacionales (Subgrid y Selectores) introduciendo bloqueo UI concurrente (Optimistic/Mutex state), y respaldamos esta estabilidad con pruebas masivas E2E (Siembra Jerárquica + Playwright/Vitest), entonces las intermitencias ("relaciones que desaparecen") se extinguirán por completo bajo cargas pesadas, logrando 100% de confiabilidad visual sobre un backend ya comprobado.

## Success Metrics
- 0% de pérdidas visuales ("pestañeos" o desvanecimientos vacíos) luego de modificaciones multi-registro.
- Ejecución limpia y determinista de tests simulando +100 nodos interconectados (Top-Down hierarchal mapping).
- `DataAPI` previene Race Conditions bloqueando guardados solapados o gestionando una cola Local (Queue).

## Appetite
1-2 Sesiones estandarizadas.

## Rabbit Holes
- Empantanarse intentando resolver el Auth-Login interactivo (MFA/2FA) de Google corporativo con Playwright puro. Para evitarlo: Depender de Mocks controlados locales (Vitest SPA Server) para probar la lógica de Race Condition E2E o usar scripts de Seeder puros al lado del backend (Apps Script).
