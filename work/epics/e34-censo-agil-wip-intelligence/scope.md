# Epic E34: Censo Ágil & WIP Intelligence

**Fecha:** 2026-04-12
**Problem Brief:** `work/problem-briefs/capacidad-operativa-equipos-agiles-2026-04-12.md`
**Estado:** Diseño
**Gap Analysis:** 6 defectos críticos confirmados (ver sección Gemba)

---

## Objetivo

Establecer Taxonomia como el source of truth del censo operativo de equipos ágiles, permitiendo al liderazgo calcular capacidad y WIP en tiempo real sin reportes manuales — incluyendo un **Mapa de Capacidad visual** en swimlanes por nivel jerárquico (Portafolio → Grupos → Equipos).

**Valor desbloqueado:** El liderazgo pasa de calcular WIP en horas/días (vía Excel manual) a consultarlo en < 1 min con un mapa visual interactivo que muestra la estructura real del portafolio con headcount por nodo.

---

## Diagnóstico Técnico (Gemba — confirmado por gap analysis)

| # | Síntoma | Causa raíz | Severidad |
|---|---|---|---|
| GAP-1 | `Persona.equipo` no renderiza | `type: "lookup"` sin handler en FormBuilder + typo `"Equipas"` | 🔴 Crítico |
| GAP-2 | No existe relación grafo `PERSONA_EQUIPO` | Cero aristas del tipo en `Sys_Graph_Edges` | 🔴 Crítico |
| GAP-3 | Dashboard donut chart siempre vacío | Filtra `section === 'Capacidad'` pero ningún campo lo tiene | 🔴 Crítico |
| GAP-4 | `total_integrantes` es manual falso | `businessRules.sumPrefix` declarado pero sin implementar | 🟠 Alto |
| GAP-5 | `Equipo.id_producto` con `relationType` invertido | Debería ser `"padre"`, no `"hijo"` | 🟠 Alto |
| GAP-6 | Tests de Equipo casi todos en `test.skip` | Sin cobertura de contrato | 🟡 Medio |

---

## Scope

### MUST (No Negociable)

- Fix GAP-1: `Persona.equipo` cambiar de `lookup` muerto → `relation` temporal `PERSONA_EQUIPO` con `isTemporalGraph: true`
- Fix GAP-1: Resolver typo `"Equipas"` → `"Equipo"` en schema
- Fix GAP-5: Corregir Nivel de Jerarquía: Cambiar relación de `Equipo` de `id_producto` a `id_grupo_producto` como `relationType: "padre"` + `isTemporalGraph: true` + `graphEdgeType: "GRUPO_PRODUCTO_EQUIPO"`
- Separación de Estructura: Asignar explícitamente `graphEdgeType: "PERSONA_LIDER_DIRECTO"` en la entidad `Persona` para su dependencia recursiva organizacional para evitar colisiones con el grafo Ágil.
- Fix GAP-2: Agregar campo hijo en `Equipo` → subgrid de `Personas`
- Fix GAP-4: `total_integrantes` readonly y computado dinámicamente desde conteo de aristas `PERSONA_EQUIPO` activas
- Fix GAP-4: Eliminar `businessRules.sumPrefix` stale de Equipo
- Fix GAP-3: Reemplazar filtro `section === 'Capacidad'` en Dashboard por fuente de datos real desde grafo
- **Mapa de Capacidad en Swimlanes**: nueva vista con jerarquía Portafolio → Grupo → Equipo en tarjetas con # Personas

### SHOULD (Importante, pero diferible si hay riesgo)

- Fix GAP-6: Reactivar y actualizar tests de `Equipo_CRUD_Fix.test.js`
- Filtros en el Mapa por Portafolio y Metodología
- Indicador visual de over-capacity (equipo > 9 → alerta en tarjeta)

### OUT OF SCOPE

| Item | Razón | Destino |
|---|---|---|
| Importación masiva desde RRHH/AD | Requiere integración externa y ADR propio | E35 |
| Multi-team membership (M:N) | Cambia topología completa | E35 |
| % de asignación por persona-equipo | Depende de multi-team | E35 |
| Roles ágiles per-equipo granulares | No bloquea WIP | Backlog |

---

## Stories

| ID | Nombre | Descripción | Tamaño | Depende de |
|---|---|---|---|---|
| S34.1 | Schema: Relación Persona↔Equipo | Fix GAP-1/2/5: `Persona.equipo` → `relation` temporal `PERSONA_EQUIPO`, corregir `relationType` invertido en `Equipo.id_producto`, agregar subgrid hijo Personas en Equipo. Reactivar tests (GAP-6). | L | — |
| S34.2 | Backend: Headcount dinámico | Fix GAP-4: endpoint que cuente aristas `PERSONA_EQUIPO` activas por equipo. Hacer `total_integrantes` readonly+computed. Eliminar `businessRules.sumPrefix`. | M | S34.1 |
| S34.3 | UI: Subgrid de Personas en Equipo | Renderizar subgrid de personas en la pantalla de Equipo con rol ágil y estado. *Tech Debt: Refactorizar `Engine_DB` usando `precalculatedGraphContext` para no hacer `list('Sys_Graph_Edges')` completo y abaratar I/O.* | S | S34.1 |
| S34.4 | Dashboard: Fix chart vacío + WIP roll-up | Fix GAP-3: reemplazar filtro `section === 'Capacidad'` por fuente real desde grafo. Roll-up de headcount por Portafolio. | M | S34.2 |
| S34.5 | Mapa de Capacidad Swimlane | Nueva vista dedicada: renderer custom HTML/CSS Grid con swimlanes jerarquizados (Portafolio → Grupo → Equipos). Tarjetas con nombre, responsable, # Personas. Color coding por nivel. | L | S34.2 |
| Spike | QA: Estabilización de E2E en DEV | Analizar e implementar timeouts dinámicos (`expect.toPass`) en `cardinality-resilience`, `dashboard-counters`, `ghost-stealing` y `topology-strict` debido a fallos de latencia (Drawer, NetState) en la nube. | M | — |

---

## Decisión de Tecnología: Graficador para el Mapa de Capacidad

**ApexCharts no es apto** para esta visualización (solo series/categorías, no jerarquías de tarjetas).

**Decisión: Renderer custom HTML/CSS Grid** dentro del mismo SPA:
- Swimlanes como filas con label lateral rotado (igual que en la referencia adjunta)
- Tarjetas con color coding por nivel jerárquico:
  - 🟡 **Portafolio** → borde/fondo amarillo
  - 🟠 **Grupos de Producto** → fondo naranja
  - 🔵 **Equipos** → fondo azul
- Datos hidratados desde `window.DataStore` (sin calls adicionales al backend)
- Filtro por Portafolio via `ion-select` reutilizando el existente del dashboard

**Alternativa rechazada:** D3.js / ECharts / vis.js → overhead de dependencia externa en GAS webapp no justificado cuando el layout es fundamentalmente una CSS Grid con tarjetas.

---

## Definition of Done

- [ ] Todas las stories completadas y cerradas
- [ ] `Persona.equipo` persiste como arista `PERSONA_EQUIPO` en `Sys_Graph_Edges`
- [ ] `Equipo.id_producto` persiste como arista `PRODUCTO_EQUIPO` correctamente orientada
- [ ] `total_integrantes` refleja conteo real de aristas `PERSONA_EQUIPO` activas
- [ ] Subgrid de personas visible en la vista de Equipo
- [ ] Mapa de Capacidad renderiza swimlanes con datos reales por Portafolio
- [ ] Dashboard charts leen headcount desde grafo (no campo manual)
- [ ] Playwright e2e: persona asignada → headcount se incrementa en Mapa y Dashboard
- [ ] Tests de Equipo reactivados y en verde
- [ ] Retrospectiva completada

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Migración de `Persona.equipo` (datos pre-existentes en campo muerto) | Baja | Alto | Validar pre-cutover: query `DB_Persona WHERE equipo != ""`. Si hay datos → script one-shot |
| Ghost Stealing en `PERSONA_EQUIPO` (patrón E33) | Media | Medio | Aplicar JIT pre-fill desde S34.1; ya tenemos patrón y fixture Playwright |
| Fix de `relationType` invertido en Equipo tiene side-effects en `orchestrateNestedSave` | Alta | Alto | Testear exhaustivamente en S34.1 antes de merge; agregar test de integración |
| Swimlane con muchos equipos → scroll horizontal no intuitivo | Media | Bajo | Colapsar grupos en breakpoints pequeños; scroll horizontal explícito con indicador |

---

## Parking Lot → `dev/parking-lot.md`

- Multi-team membership (E35)
- Importación AD/RRHH (E35)
- % asignación por persona-equipo (E35)
- Alertas de over-capacity por equipo (Backlog)
- Mapa de Capacidad exportable a PDF/PNG (Backlog)
- Refactor topológico: Migrar lógica de escaneo crudo de aristas en `Engine_DB.js` hacia un método estandarizado `getEdgeCount()` dentro de `Engine_Graph.js` para su re-utilización (Tech Debt, próximo sprint).

---

## Implementation Plan

### 1. Sequencing & Rationale

| Pos | Story | Strategy | Rationale | Enabling |
|---|---|---|---|---|
| 1 | **S34.1** (Schema) | Risk-first | Establecer los cimientos topológicos de BD es crítico. Aborda el relationType padre/hijo invertido y corrige el schema con subgrids y aristas temporales reales. | Permite a S34.2 hacer consultas sobre datos veraces. |
| 2 | **S34.2** (Backend) | Dependency-driven | El headcount dinámico expuesto por el backend unifica el contrato de estado. Hace que el Dashboard y el front rendericen valores reales. | Permite pintar métricas correctas en S34.4 y S34.5 |
| 3 | **S34.3** (UI Subgrid) | Quick win | Agrega el subgrid en la vista individual. Flujos UI separados. Paralelizable tras S34.1. | Valida la interacción usuaria y llenado SCD-2 inicial. |
| 4 | **S34.4** (Dashboard) | Quick win | Soluciona la pre-existente gráfica vacía del Donut Chart utilizando el `total_integrantes` real del Store. | Restaura funcionalidad dañada en producción inmediatamente. |
| 5 | **S34.5** (Mapa) | MVP Core | Requisito principal, visualización Swimlane por jerarquías usando recursos CSS Grid y Datos desde el Frontend (DataStore). | Concreta la vista deseada según Mockups. |

**Parallel opportunities:**
Tras S34.2, se desbloquean S34.3, S34.4 y S34.5. Diferentes desarrolladores pueden hacer la S34.4 (Dashboard) y la S34.5 (Renderización Angular / DOM custom de Mapa) en paralelo.

### 2. Milestones

- [ ] **M1: Backing de Datos & Relaciones (S34.1 + S34.2)**
  *Purpose:* Demostrar vinculación 1:N SCD-2 Persona↔Equipo y cómputo backend sin bugs topológicos.
  *Success Criteria:* Tests de CRUD corriendo limpios, Aristas en DB verificadas.
- [ ] **M2: Integraciones Visuales Pre-existentes (S34.3 + S34.4)**
  *Purpose:* Mostrar la visibilidad de portafolio reparada en la interfaz del SPA.
  *Success Criteria:* Dashboard pinta contadores precisos; panel lateral del Equipo lista Personas asociadas.
- [ ] **M3: Mapa de Capacidad E2E (S34.5)**
  *Purpose:* Renderizar Grid interactivo As-Is Portafolio completo.
  *Success Criteria:* Mapa de swimlanes cargado sin fetchs adicionales (reusando DataStore) y adaptado a móviles.
- [ ] **M4: Epic E34 Complete**
  *Purpose:* Cierre productivo formal verificando DoD y Pipeline E2E.

### 3. Sequencing Risks

| Riesgo de Secuencia | Impacto | Mitigación |
|---|---|---|
| Regresión en orchestrateNestedSave en S34.1 | Alto | Ejecutar pipeline con E2E y pruebas en motor antes de declarar M1 completo, es el cuello de botella. |
| Over-fetching para agrupar Portafolio->Grupos | Medio | Reutilizar la jerarquía ya descargada a Memoria/Store del frontend para M3 (S34.5) |

### 4. Progress Tracking

| Story | Status  | T-Size | Par |
|---|---|---|---|
| S34.1 | DONE  | L | No |
| S34.2 | DONE  | M | No |
| S34.3 | TODO  | S | Si |
| S34.4 | TODO  | M | Si |
| S34.5 | TODO  | L | Si |
