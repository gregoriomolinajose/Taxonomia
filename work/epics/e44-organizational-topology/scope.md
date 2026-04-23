# Epic E44: Visibilidad y Control de Topología Organizacional — Scope

> **Status:** IN PROGRESS
> **Release:** REL-4 (Visibilidad Operativa)
> **Created:** 2026-04-21

## Objective

Otorgar visibilidad centralizada sobre la composición de equipos, la ocupación (capacidad) detallada de las personas y los roles que fungen, extendiendo la arquitectura del grafo relacional e interfaces sin sobre-ingeniería.

**Value:** Erradicar el tiempo consumido en hojas de cálculo aisladas. Dotar al liderazgo tecnológico de la habilidad visual de entender quién está sobrecargado (>100%) y qué células tienen roles críticos descubiertos (sin SM / vacío).

## Stories 

| ID | Story | Size | Status | Description |
|----|-------|:----:|:------:|-------------|
| S44.1 | Entidad Rol | S | Done | Crear entidad genérica Rol en Schema_Engine empleando prefijo ROLE e ícono de construcción. |
| S44.2 | Extensión Grafo | M | Done | Extender Sys_Graph_Edges con metadata para guardar capacidad dedicada (%) sin corromper SCD-2. |
| S44.3 | Mutación DataStore | S | Done | Fusionar Nombre+Apellido desde la Ingesta OnLoad para todas las vistas visuales de la aplicación. |
| S44.4 | Shielding ABAC | M | Done | Implementar lógica de Field-Level Security para Rol y candado Workspace usando Engine_ABAC. |
| S44.5 | Alertas Capacity Map | L | Done | Refactor de UI_View_CapacityMap para pintar alarmas rojas en base a sumas topológicas (>100% y sin Roles). |
| S44.6 | Refactor UX Búsqueda Inline | S | Done | Unificar el comportamiento Inline en TXSearchable para Single Select en lugar del popover flotante viejo. |
| S44.7 | Reorganización Estructural Persona | S | Done | Dividir en bloques lógicos y asignar layouts en Schema_Engine para la entidad Persona. |
| S44.8 | Entidad Cargo (Diccionario Vivo) | S | Done | Extraer cargo a nueva entidad resolviendo conflicto de workspace sync con schemas. |
| S44.9 | Mapeo Automático Ingesta | M | Done | Implementar Workspace Interceptor para autoprovisionar o enlazar ID interno de Cargo mediante diccionarios en cache O(1). |
| S44.10 | Migración Masiva Lógica Roles | M | In Progress | Migración Masiva CSV del viejo select rol_agil hacia los nuevos Pointers topológicos de Rol. |
| S44.11 | Sincronización On-Demand (Workspace Sync) | M | Done | Implementar endpoint on-demand ligado a UI_Admin para rescate de Workspace data. |
**Total:** 9 stories

## Scope

**In scope (MUST):**
- Entidad de Roles dinámica.
- Refactor estructural y lógico de la UI de la Persona (agrupada en Datos Empresariales, Agil, etc).
- Soporte porcentual de tiempo de asignación en grafo universal.
- Validaciones matemáticas rojas contra escases / saturación.

**In scope (SHOULD):**
- Tokens semánticos en `Config_Typography` o Custom Vars CSS para distinguir color de los Roles.

**Out of scope:**
- Script de migración automática de datos hardcodeados viejos a topológicos (se hará un bulk import post-épica).
- Entidad `Asignacion` aislada (Cancelado en AR).

## Done Criteria

**Per story:**
- [x] Code with type annotations
- [x] Tests passing
- [x] Quality checks pass (ruff/eslint, playwright)

**Epic complete:**
- [x] S44.1 completado
- [x] S44.2 completado
- [x] S44.3 completado
- [x] S44.4 completado
- [x] S44.5 completado
- [x] S44.6 completado
- [x] S44.7 completado
- [x] S44.8 completado
- [x] S44.9 completado
- [ ] S44.10 completado
- [x] S44.11 completado
- [x] Los líderes pueden entrar al Capacity Map y detectar equipos sin SM y gente saturada.
- [ ] Epic retrospective done
- [ ] Merged to `main`

## Dependencies

```
S44.1 ──┐
        ↓
S44.2 ──┼── S44.5
        ↓
S44.3 ──┘
        
S44.4 (parallel)
S44.7 (UI Layer)
```

**External:** Confirmación de campos Workspace con TI o Mockup de carga (Ninguno bloqueante crítico).

## Architecture

| Decision | ADR | Summary |
|----------|-----|---------|
| Extensión Metadata Grafo | ADR-44.1 | Evitar tabla transversal `Asignacion` guardando carga (%) directo en la arista. |
| Fusión en Ingesta Front | ADR-44.2 | Destruir Nombre y Apellido visualmente solo a partir de Ingesta DataStore. |

> Problem Brief: `work/problem-briefs/organizational-topology-2026-04-21.md`

## Risks

| Risk | L/I | Mitigation |
|------|:---:|------------|
| Rendimiento al sumar pesos en Grafo | M/M | Cache_Utils interceptará arrays mapeados on-demand para evitar freeze. |
| Conflictos Workspace Schema | L/H | Prevenir mutación física de bd; solo mutar estado. |

## Parking Lot

- Migración Masiva CSV del viejo select `rol_agil` hacia los nuevos Pointers topológicos de `Rol`.
