---
epic_id: E4
title: Motor de Jerarquía de Grado Industrial
status: in-progress
---

# Epic Scope: E4 - Motor de Jerarquía Grado Industrial

**Objetivo:** Blindar el motor jerárquico contra errores humanos que destruyen los árboles de datos. Asumir una filosofía de "Confianza Cero" (Zero-Trust) a nivel de dependencias estructurales.

## In Scope
- **Pilar 1: Prevención de Ciclos (Circular Dependency Guard)**
  - Intercepción UI/Core del selector de "Dominio Padre".
  - Ocultación activa de sub-árboles en modo Edición para evadir parentescos cíclicos.
- **Pilar 2: Mutación en Cascada (Re-Parenting & Path Propagation)**
  - Re-cálculo masivo y actualización en cascada (Path/Path ES) cuando un Dominio es movido hacia otra rama.
- **Pilar 3: Integridad de Eliminación (Safe Block)**
  - Barrera de contención contra Soft-Deletes.
  - El sistema prohibirá frontalmente la eliminación de cualquier dominio que figure como `id_dominio_padre` de activos vivos.

## Out of Scope
- Interfaz gráfica para desplazar dominios estilo "Drag and Drop" (Se mantendrá el Formulario Unificado).
- Restauración granular con propagación inversa en caso de undo (Solo Prevención Avanzada).

## Stories
- **S4.1** | Prevención de Ciclos en UI (Circular Dependency Guard) | Oculta el propio sub-árbol en los menús select de jerarquía. | Size: S | Deps: None
- **S4.2** | Mutación en Cascada (Re-Parenting & Bulk Path Update) | Traslado y serialización O(1) masiva de `orden_path` de toda la rama descendiente. | Size: M | Deps: None
- **S4.3** | Integridad de Eliminación (Safe Block contra orfandad) | Backend aborta Soft-Deletes si la entidad conserva IDs dependientes. | Size: S | Deps: S4.2

## Done Criteria
1. Un padre *jamás* puede declararse hijo de su propia descendencia (Selector UI filtrado).
2. Mover un Nivel 1 hacia un nuevo Padre actualiza a toda su línea de descendencia en BD (Paths intactos).
3. Eliminar "Retail" fallará en BD tirando un Error Controlado si "Retail" cuenta con hijos en su dominio.

---

## Implementation Plan

### Sequencing Rationale
1. **S4.1 (Prevención de Ciclos UI):** *Quick Win & Risk-First (UI).* Abordamos primero la barrera de entrada para frenar la creación de nuevos datos corruptos desde el Front-End de manera inmediata.
2. **S4.2 (Mutación en Cascada Bulk):** *Walking Skeleton (Backend).* Constituye el núcleo algorítmico transaccional de O(1). Representa la mayor carga de riesgo y es prerrequisito para gobernar las jerarquías en memoria.
3. **S4.3 (Safe Block contra orfandad):** *Dependency-driven.* Tarea final que sella y blinda las eliminaciones, apoyándose en la infraestructura de validación in-memory construida en S4.2.

### Milestones & E2E Integration
- **M1: UI Shield (Walking Skeleton)**
  - *Incluye:* S4.1
  - *Criterio de Éxito:* Desaparición visual de los hijos en el menú desplegable `lookupSource` durante la edición.
- **M2: Backend Transaccional (Core MVP)**
  - *Incluye:* S4.2
  - *Criterio de Éxito:* Al mover un Dominio Nivel 1 hacia un nuevo padre, los registros hijos en Google Sheets heredan el nuevo `path_completo`.
- **M3: Epic Complete & E2E Integration (PAT-E-539)**
  - *Incluye:* Tratamiento manual E2E de Edición, Traslado masivo y Eliminaciones (S4.3) testeado directamente contra el servidor App Script en entorno DEV.

### Progress Tracking
| Secuencia | Historia | Rationale / Enfoque | Dependencias | Estado |
| --- | --- | --- | --- | --- |
| 1 | **S4.1** Ciclos UI | Contener creación de data corrupta. | Ninguna | `Pending` |
| 2 | **S4.2** Cascada DB | Motor masivo transaccional O(1). | Ninguna | `Pending` |
| 3 | **S4.3** Safe Block | Interceptador lógico Soft-Delete. | S4.2 | `Pending` |
