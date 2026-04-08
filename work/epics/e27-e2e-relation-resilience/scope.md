# Epic Scope: E27 E2E Relation Resilience (Real Auth E2E)

## Objective
Sanitizar la Capa Asíncrona del Frontend para garantizar la persistencia visual absoluta de Grafos (Subgrid y Single-Selects) sin importar la latencia del Backend bajo cargas máximas, y verificarlo mediante **Pruebas E2E puras contra el entorno Dev Real** burlando las barreras de Auth de Google mediante inyección de credenciales/cookies.

## In Scope
- Refactorización de Caché Mutex u Optimistic de las mutaciones Subgrid y Select (Capa Frontend / DataAPI).
- Creación de Suite Playwright externa capaz de arrancar utilizando Playwright Global Setup para inyectar un estado de sesión (`auth.json` con cookies) hacia la URL real de Apps Script en `dev`.
- Simulaciones Top-Down (Unidad de Negocio -> Portafolio -> Grupo -> Producto) controlando el DOM remoto.

## Out Scope
- Mocks de UI o interceptores JSDOM (se descartaron a favor del E2E real).
- Ejecución en CI/CD Cloud automática (por el momento, el Auth State generado se utilizará mediante ejecución local de desarrollador, dado que Google bloquea logins IP-Cloud).

## Planned Stories
- **S27.1 Optimistic Frontend Hydration:** Implementar bloqueo Mutex / Event Collation en subgrids para evitar escrituras volátiles que corrompen el DOM.
- **S27.2 E2E Auth State Setup:** Crear un script de inicialización de Playwright que recolecte, encripte o reuse cookies de sesión de desarrollador para evadir el Login interactivo de Apps Script.
- **S27.3 Top-Down Hierarchy Stress Test:** Escribir el Spec en Vitest/Playwright que abre el entorno DEV cloud, crea 1 Unidad, 5 Portafolios, 10 Grupos y comprueba que las relaciones en el frontend persistan a las rápidas interacciones de Playwright.

## Definition of Done
- Los subgrids de la cadena organizativa retienen sus registros visuales al insertar concurrentemente.
- E2E Playwright corre verde pegando a la URL REAL de Apps Script DEV.
- Cero interacciones manuales requeridas durante la prueba (salvo la primera inyección de sesión si expiró expiró).
