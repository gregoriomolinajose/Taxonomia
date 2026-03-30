# Scope: E8 - Graph Governance & Business Rules Engine

**Objective:** Implementar un motor de reglas topológico mediante configuración JSON en `Schema_Engine.gs` para prevenir ciclos (DAG), violaciones de profundidad y manejar historización SCD-2.

## Stories

1. **S8.1: Schema Extension & Governance Model** - Configuración base y getEntityTopologyRules() global fallback.
2. **S8.2: Backend Enforcer (Engine_Graph.js)** - Defensas matemáticas (Ciclos, Max Depth, Sibling Collision).
3. **- [x] S8.3: Re-parenting & Temporal State (SCD-2) ✓** - Robo de nodos y expiraciones temporales correctas.
4. **- [x] S8.4: Deletion Strategies Execution ✓** - Orphan vs Cascade vs Grandparent implementations.
5. **- [x] S8.5: UI Dumbness & Form Validation Guards ✓** - Exenciones de raíz, exclusiones de orfandad y Filtros de Nivel.
6. **- [x] S8.6: Relational Proximity Rules ✓** - Restricciones asimétricas en dropdowns (Strict vs Lax Level jumps).
7. **- [x] S8.7: In-line UX & Branch Shifting ✓** - UX compleja para creación in-line y re-emplazamiento de ramas enteras.

## ### Progress Tracking

| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|--------|----------|-------|
| 1 | S8.1 — Schema Extension & Governance | S | Done | 1.0 | 1 | Fallbacks injected and verified |
| 2 | S8.2 — Backend Enforcer (Engine_Graph.js) | M | Done | 1.5 | 1 | DAG + Tests + Integration Done |
| 3 | S8.3 — Re-parenting & Temporal SCD-2 | M | Done | 1.5 | 1.33 | Refactored M:N DFS via Fast-Follows |
| 4 | S8.4 — Deletion Strategies Execution | M | Done | 3.0 | 0.8 | Garbage Collector logic implemented via Unit of Work |
| 5 | S8.5 — UI Dumbness Guards | S | Done | 1.5 | 0.67 | S8.5.1 Fast Follow for H9 included |
| 6 | S8.6 — Relational Proximity Rules | S | Done | 1.0 | 0.5 | Strict and Lax mode validated mathematically |
| 7 | S8.7 — In-line UX & Branch Shifting | L | Done | 3.0 | 0.75 | Modal Stack y Branch Shifting Interceptor |
