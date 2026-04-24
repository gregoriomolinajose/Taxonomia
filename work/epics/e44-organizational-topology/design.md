---
epic_id: "E44"
grounded_in: "Gemba of [Schema_Engine.js, UI_View_CapacityMap.html]"
---

# Epic Design: Visibilidad y Control de Topología Organizacional

## Affected Surface (Gemba)

| Module/File | Current State | Changes |
|-------------|---------------|---------|
| `src/Schema_Engine.js` | Personas con strings fijos para "rol_agil" y relaciones 1:N sin porcentaje de peso estipulado. | Se agrega nodo "Rol". Se añade propiedad custom de capacidad al "Sys_Graph_Edges". |
| `src/UI_View_CapacityMap.html` | Conteo genérico: "X Personas Totales" bloque a bloque. Sin visualización de alertas internas de capacidad. | Se añade cálculo DOM iterativo sobre las nuevas aristas con pesos, lanzando banderas rojas de "Falta PO/SM" y "%". |
| `src/Engine_ABAC.js` | Bloqueadores basados en nodos CRUD genéricos. | Extensión a "Field-level security" para denegar renderización del ID_ROL si usuario no tiene nivel Admin. |
| `src/DataAPI.client.js` / DataStore | Carga CRUD lineal en JSON puro sin intersección. | Intercepción global `DataStore.subscribe` OnLoad para unir "nombre + apellidos" como un solo key transaccional in-memory. |
| `src/UI_Component_DashboardCardCont.client.js` | UI Cards básicas sin estampa rica de personas (avatar/lexical). | Maquetado HTML CSS Grid adaptado para avatar, correo e ícono, referenciando el nuevo string unido. |

## Target Components

| Component | Responsibility | Key Interface |
|-----------|---------------|---------------|
| `Asynchronous Event_Bus/DataStore` | Fusión visual O(1) de Atributos Crudos | `<event trigger on dataset hydration>` |
| `Sys_Graph_Edges` Schema | Mantener topologías relacionales M:N | `capacidad_asignada` numérico en payload. |
| `UI_View_CapacityMap.html` | Tablero Liderazgo | DOM Render function cross-referenciando Edges + Nodos de Rol. |

## Key Contracts
```javascript
// Nuevo Payload Extension en Sys_Graph_Edges (No intrusivo)
// Se aprovechan propiedades implícitas de SchemaEngine para edges
{
  "id_relacion": "R-1029",
  "id_nodo_padre": "EQP-0012",     // Equipo
  "id_nodo_hijo": "PERS-003",      // Persona
  "tipo_relacion": "PERSONA_EQUIPO",
  "metadata_peso": 80,             // 80% del tiempo de esa persona
  "metadata_rol": "ROLE-001"       // Carga unificada del nodo hijo con el rol
}

// Alternativamente: múltiples ramas
// PERSONA -> EQUIPO (Peso 50%)
// PERSONA -> ROL (TechLead)
```

## Migration Path
Los esquemas existentes no sufren destrucción física ("Apellidos" permanece). 
El listado `rol_agil` de Persona bajará de jerarquía visual (deprecated) hasta la gran migración posterior.
