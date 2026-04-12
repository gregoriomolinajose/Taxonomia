# Epic E33: Ghost Stealing Resilience Bug Bash

## Goal
Resolver la desvinculación fantasma que sufrían los Portafolios (Subgrids de 1:N jerárquico SCD2) cuando se editaban sin re-hidratar dinámicamente las relaciones parentales y empaquetar `id_registro` al backend.

## Stories
- [x] S33.1: JIT Relational Pre-fill interceptor in FormRenderer_UI.client.js.
- [x] S33.2: Patch mapping in Engine_DB.js to interpret scalar select_single wrappers as `id_registro`.
- [x] S33.3: Playwright regression test (ghost-stealing.spec.js) ensuring integrity against regression.
