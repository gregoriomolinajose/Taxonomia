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
- [ ] S4.1 (Prevención de Ciclos en UI)
- [ ] S4.2 (Actualización de Cascada / Re-parenting)
- [ ] S4.3 (Barrera de Soft-Delete contra orfandad)

## Done Criteria
1. Un padre *jamás* puede declararse hijo de su propia descendencia (Selector UI filtrado).
2. Mover un Nivel 1 hacia un nuevo Padre actualiza a toda su línea de descendencia en BD (Paths intactos).
3. Eliminar "Retail" fallará en BD tirando un Error Controlado si "Retail" cuenta con hijos en su dominio.
