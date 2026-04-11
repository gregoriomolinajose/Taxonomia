# Epic E31: Schema Engine Governance Layer — Design

> **Status:** DRAFT
> **Epic:** E31
> **Brief:** `work/problem-briefs/schema-engine-constraint-governance-2026-04-10.md`

## Gemba — Estado Actual

El archivo `Schema_Engine.gs` (391 líneas actualmente) contiene el patrón de acoplamiento siguiente:

```js
// Mismo bloque topologyRules repetido en CADA entidad ↓
topologyRules: {
  topologyType: "JERARQUICA_ESTRICTA",
  preventCycles: true,
  maxDepth: 6,
  allowOrphanStealing: true,
  deletionStrategy: "ORPHAN",
  siblingCollisionCheck: true,
  scd2Enabled: true
},

// Mismo campo declarado verbatim en CADA entidad ↓
{ name: "lexical_id", type: "text", label: "Ticket ID", uiBehavior: "badge", readonly: true },
{ name: "estado", type: "hidden", defaultValue: "Activo" },
{ name: "separator_grafo", type: "divider", label: "Topología (Grafo)", width: 12 },
```

**Resultado:** Cada nueva entidad agrega ~15–20 líneas de duplicación pura. El riesgo de inconsistencia silenciosa crece con cada adición.

## Arquitectura Target

### Capa de Gobernanza del Schema

```
Schema_Engine.gs
├── TOPOLOGY_PRESETS         ← Catálogo de reglas topológicas nombradas
│   ├── "JERARQUICA_ESTRICTA_GRAPH_STD"  → { preventCycles, maxDepth:6, ... }
│   ├── "JERARQUICA_ESTRICTA_DOMAIN"     → { strictLevelJumps, levelFiltering, ... }
│   └── "FLAT"                            → { topologyType: "PLANA" }
│
├── FIELD_TEMPLATES          ← Plantillas de campos comunes inmutables
│   ├── SYSTEM_FIELDS()      → [lexical_id, estado]  (función de composición)
│   └── SEPARATOR(label)     → { type: "divider", label, width:12 }
│
└── APP_SCHEMAS              ← Solo declara lo ÚNICO por entidad
    └── Portafolio: {
          primaryKey: "id_portafolio",
          topologyRules: TOPOLOGY_PRESETS["JERARQUICA_ESTRICTA_GRAPH_STD"],  // referencia
          fields: [
            ...FIELD_TEMPLATES.SYSTEM_FIELDS(),  // composición
            { name: "nombre", type: "text", label: "Nombre de Portafolio", required: true }
          ]
        }
```

### Resolvedor Transparente

Los consumidores actuales (`FormEngine`, `Engine_DB`, `DataView_Engine`) acceden a `APP_SCHEMAS.Entity.topologyRules` — esta referencia seguirá funcionando como objeto normal gracias a la expansión en el punto de construcción. **Zero cambios en consumidores.**

### Config Studio UI (S31.5–S31.6)

**Punto de entrada:** Icono de perfil (esquina superior) → sección **"Sistema"** (nueva) → opción "Configuración de Schema".

**Restricción de acceso:** Exclusivo para el perfil **`SUPER_ADMIN`** vía ABAC. La sección "Sistema" en el menú de perfil debe ser invisible para cualquier otro rol.

```
SPA Taxonomia
└── ProfileMenu (icono de perfil)
    └── Sección: Sistema  ← NUEVA (visible solo para SUPER_ADMIN)
        └── Configuración de Schema  →  /admin/schema-config
            ├── Panel: Catálogo de Presets (lista TOPOLOGY_PRESETS + FIELD_TEMPLATES)
            ├── Panel: Mapa Entidad→Regla (qué preset usa cada entidad/campo)
            └── Panel: Editor de Regla por Campo (binding preset↔campo↔entidad)
```

## Componentes Afectados

| Componente | Tipo de Cambio | Riesgo |
|-----------|---------------|--------|
| `Schema_Engine.gs` | Refactor profundo — separación en 3 capas | Alto (SSOT del sistema) |
| `FormEngine` | Sin cambio de contrato — lectura transparente | Bajo |
| `Engine_DB.js` | Sin cambio de contrato — lectura transparente | Bajo |
| `DataView_Engine` | Sin cambio de contrato — lectura transparente | Bajo |
| `API_Universal.gs` | Sin cambio de contrato | Bajo |
| SPA (nueva ruta /admin) | Nuevo componente Config Studio | Medio |

## ADRs Requeridos

### ADR-E31-001: Estrategia de Referencia de Presets

**Decisión:** ¿Los presets se resuelven en tiempo de definición (expansión estática) o en tiempo de lectura (lazy resolution)?

- **Opción A (Expansión estática):** `topologyRules: TOPOLOGY_PRESETS["JERARQUICA_ESTRICTA_STD"]` — el objeto se copia por valor al definir `APP_SCHEMAS`. Simple, sin overhead en runtime.
- **Opción B (Lazy resolution):** `topologyRules: "JERARQUICA_ESTRICTA_STD"` — los consumidores llaman a `schemaResolver.getTopologyRules(entity)`. Más flexible pero requiere cambios en todos los consumidores.

**Recomendación:** Opción A para S31.2–S31.4. Opción B evaluable en E32 si se persiste el catálogo en Sheets.

### ADR-E31-002: Ubicación del Config Studio

**Decisión:** ¿El Config Studio es una ruta nueva del SPA o un panel separado?

- **Opción A:** Ruta `/admin/schema-config` dentro del SPA existente, protegida por ABAC.
- **Opción B:** Herramienta de desarrollo separada (script CLI o Google Sheets sidebar).

**Recomendación:** Opción A — coherente con la arquitectura SPA existente y aprovecha el ABAC ya implementado.

## Riesgos

| Riesgo | P | I | Mitigación |
|--------|---|---|------------|
| La expansión estática de presets genera referencias compartidas mutables (aliasing bug) | M | H | Usar `Object.freeze()` en todos los presets. Verificar con test de inmutabilidad. |
| Romper el contrato de `topologyRules` en `Engine_DB` durante migración S31.4 | M | H | Ejecutar suite completa de tests después de cada entidad migrada, no en batch final. |
| Config Studio UI expone configuración sensible | L | M | Ruta `/admin/schema-config` y la sección "Sistema" del menú de perfil son visibles **únicamente** para `SUPER_ADMIN` vía ABAC. Sin excepción. |
