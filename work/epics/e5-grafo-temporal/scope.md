---
epic_id: E5
title: Grafo Temporal Multi-Estructural
status: in-progress
---

# Epic Scope: E5 - Grafo Temporal Multi-Estructural

**Objetivo:** Evolucionar la arquitectura de relaciones hacia un Grafo Dirigido Temporal (DAG) soportando SCD-2 y relaciones de N dimensiones (Militar, Matricial, Colaborativa) con resolución autónoma de Orfandad (Cascade Flattening).

## In Scope
- Creación de Tabla Puente `Relacion_Dominios`.
- Depreciación lógica de `Dominio.id_dominio_padre`.
- Ejecución única de la Migración ETL (Árbol N-Ario plano a Grafo N:M Histórico).
- Reversión del Safe Block (S4.3) hacia "Cascade Flattening" (Auto-asignación al Abuelo tras Soft Delete del Padre).
- Modificación del motor `Treemap` actual para filtrar Nodos bajo restricción `tipo_relacion=Militar_Directa` y `es_version_actual=true`.

## Out of Scope
- Implementación del nuevo gráfico ECharts Force-Directed Graph (Esto se enviará a una Epic posterior. Solo el backend soportará la N-dimensionalidad por ahora).

## Stories
- **S5.1** | Diseño e Inserción de Metadatos Puente (Esquema `Relacion_Dominios`). | Size: S | Deps: None | ✓
- **S5.2** | Script ETL de Migración Estructural Transaccional (O(1)). | Size: M | Deps: S5.1 | ✓
- **S5.3** | Ingeniería Backend: Creación del Motor Setter DAG e Inserciones SCD-2 (Orquestador Re-Parenting). | Size: L | Deps: S5.2 | ✓
- **S5.4** | Ingeniería Backend: Algoritmo de Cascade Flattening (Soft Delete con Reasignación de Abuelo). | Size: L | Deps: S5.3
- **S5.5** | Refactor Frontend: Interceptor Treemap para inyección de Filtro "Militar_Directa & Current". | Size: M | Deps: S5.4
