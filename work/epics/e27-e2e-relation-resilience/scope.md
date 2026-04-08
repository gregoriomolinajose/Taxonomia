# Epic Scope: E27 E2E Relation Resilience

## Objective
Sanitizar la Capa Asíncrona del Frontend para garantizar la persistencia visual absoluta de Grafos (Subgrid y Single-Selects) sin importar la latencia del Backend bajo cargas máximas. Dotar al proyecto de Suites Automáticas E2E para comprobación de Stress Limit para Top-Down jerárquico.

## In Scope
- Refactorización de Caché Mutex u Optimistic de las mutaciones Subgrid y Select (Capa Frontend / DataAPI).
- Creación de Backend Seeder para automatizar inyecciones de estrés a la persistencia en Google Apps Script. 
- Integración de Testing E2E (Unit/Integration sobre UI Virtual) vía Vitest-Playwright para probar Race Conditions forzadas enviando colisiones masivas en la UI simulada.

## Out Scope
- Reescritura del Engine_DB o Engine_Graph (ya comprobados).
- Intervenciones directas por Auth API de Google con Playwright en entorno Cloud (se probará en entonos controlados/simulados o usando el Backend Script nativo `Install_Seeder` directamente).

## Planned Stories
- **S27.1 Optimistic Frontend Hydration:** Implementar bloqueo Mutex / Event Collation en subgrids para evitar escrituras volátiles (desaparición).
- **S27.2 Backend Stress Seeder:** Programar y certificar `Install_Seeder.gs` para generar un flujo robusto TopDown/BottomUp sin límite de tiempo (manejo manual de triggers si requiere sortear Timeout 6m).
- **S27.3 E2E Race Condition Test:** Diseñar test automatizado (Vitest UI SPA) forzando latencias aleatorias en DataAPI interceptado para comprobar tolerancia visual a retrasos de red y clicks paralelos.

## Definition of Done
- Los subgrids de 'Unidad de Negocio' hasta 'Producto' retienen sus registros visuales al insertar concurrentemente.
- Suite Test de Regresión UI pasa con 0 Race conditions visuales demostrables bajo latencia forzada (Mocks 2000ms delay).
- Seeder Cloud puede reventar la BDD con 100+ registros y la UI los lee sanamente.
