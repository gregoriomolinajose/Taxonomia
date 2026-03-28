# Domain Model — Taxonomia Project

## Bounded Contexts

### 1. Portfolio Management Context
Entities: `Portafolio`, `Grupo_Productos`
- A `Portafolio` is the strategic container. It owns many `Grupo_Productos` (1:N, FK `id_portafolio`).
- Decisions at the Portfolio level set budget envelopes and value stream definitions.

### 2. Taxonomy / Hierarchy Context
Entities: `Dominio`, (future: `Capacidad`, `Unidad_Negocio`)
- A `Dominio` can have a parent `Dominio` via `id_dominio_padre` (self-referential Adjacency List FK).
- `orden_path` (Materialized Path, e.g. `02.01.03`) is a **calculated, read-only** field derived from the FK tree — it is never user-editable.
- The hierarchy engine (`getGenericOrdenPath`) is generic: it operates on any entity that declares `calcParams` in its schema.

### 3. Team / Org Context
Entities: `Equipo`, `Persona`, `Unidad_Negocio` (planned)
- Teams own members (`Persona` via subgrid relation).
- Business Units own Teams.

## Context Map

```
[ Portfolio Management Context ]
   Portafolio 1──N Grupo_Productos

[ Taxonomy Context ]
   Dominio ──(parent_FK)──> Dominio   (self-referential tree)

[ Team/Org Context ]
   Unidad_Negocio 1──N Equipo 1──N Persona
```

## Key Aggregates

| Aggregate Root | Children | FK |
|---------------|----------|----|
| `Portafolio` | `Grupo_Productos` | `id_portafolio` |
| `Dominio` | `Dominio` (self) | `id_dominio_padre` |
| `Equipo` | `Persona` | `id_equipo` |

## Lifecycle States

All entities follow the state machine:
```
Activo → [soft-delete] → Eliminado
```
`deleted_at` timestamp is set; records are never physically removed.
