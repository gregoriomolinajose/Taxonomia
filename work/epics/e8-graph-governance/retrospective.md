# Epic Retrospective: E8 - Graph Governance & Business Rules Engine

## Metadatos
- **Fecha de Cierre:** 2026-03-30
- **Versión de Entrega:** `v1.2.6-stable`
- **Tallas Totales Procesadas:** S (4), M (3), L (1), XS (1)

## 1. Evaluación General de la Épica
El nacimiento de **Epic E8** consolidó la transición arquitectónica más importante del proyecto Taxonomia a la fecha: La mutación desde un CRUD tabular genérico hacia una estructura de Gestión de Datos Maestros (MDM) basada fundamentalmente en Grafos Dirigidos Acíclicos Temporales (Temporal DAG / SCD Type-2). Se instalaron las leyes termodinámicas y topológicas (Ciclos, Orfandad, Sibling Collision, Strict Level Jumps) directamente sobre el motor algorítmico, independizando por completo al esquema JSON de la lógica operacional. 

**Logros Clave:**
1. **Zero-Touch Configuration:** El Backend ahora detecta recursivamente restricciones estructurales vía `topologyCardinality` y `isTemporalGraph` sin necesidad de reescribirse el código fuente ante el nacimiento de un nuevo Nódulo de Negocio.
2. **Hermetic Strategies $O(1)$:** Protección universal de transacciones contra fallos lógicos externos mediante conjuntos estáticos, salvaguardando I/O contra el Implicit Trust Bug.
3. **Modal Stack (In-Line Data Entry):** Posibilidad de apilar infinitos formularios MDM sin recargar la instancia, multiplicando exponencialmente la Productividad (Velocity) del Operador.

## 2. Métricas y Estimaciones (Velocity Tracking)
- **Desviación Positiva (Aceleradores):** Las validaciones topológicas `(Engine_Graph)` estimadas en M resultaron ser veloces gracias a los Tests de Integración tempranos (Jest).
- **Desviación Negativa (Fricciones):** Las estrategias SCD-2 de clausura en cascada (Cascade, Orphan, Grandparent) devoraron casi el triple del esfuerzo proyectado (0.8 Velocity) ante la complejidad de manejar arreglos en memoria sin sobrepasar cuotas de Google Sheets.
- Las intervenciones UI ($O(1)$) terminaron exigiéndonos sub-historias urgentes de refactorización visual (S8.7.2-6).

## 3. Patrones Consolidados (Golden Path)
- **`PAT-G-003:` Soft Reset Global (Isomorfismo)**
- **`PAT-G-011:` Hermetic Payload Scopes**
- **`PAT-G-014/015:` Flux y Modal Stack Recursion (Context Flushing UI)**

## 4. Deudas y Traspaso a Epic E9 (Parking Lot)
Las resoluciones incompletas o descubrimientos paralelos fueron migrados a `dev/parking-lot.md` sumando 9 tareas fundacionales para dar inicio a E9:
- Migración al Controller Isomórfico (`SubgridState.js` centralizando `isNewRecord`, `Modal Stack` y Validadores).
- Aplicación de Linters de UI para purgas de Hardcoding (Themes & Colors).
- Adopción de un API nativa (Native vs. JS ThemeManager) para Dark Mode multi-capa.
- Subrutinas de Renderizado DRY (Purga de inyecciones repetitivas en UI).
- Integración de QA Profiling eze (Garbage Collection).
