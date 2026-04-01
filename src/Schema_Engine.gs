/**
 * EPT-OMR Project: APP_SCHEMAS Configuration (Server-Side)
 * 
 * This object is the Single Source of Truth for the FormEngine.
 */

const APP_SCHEMAS = {
  _UI_CONFIG: {
    badgeMap: {
      'activo': 'activo', 'borrador': 'borrador', 'en-revis-n': 'en-revision', 'en-revision': 'en-revision',
      'tier-1-cr-tico': 'tier-1-critico', 'tier-1-critico': 'tier-1-critico',
      'tier-2-alto': 'tier-2-alto', 'tier-3-medio': 'tier-3-medio', 'tier-4-bajo': 'tier-4-bajo',
      'saas': 'saas', 'marketplace': 'marketplace', 'b2b': 'b2b', 'b2c': 'b2c', 'transaccional': 'transaccional'
    }
  },
  Dominio: {
    primaryKey: "id_dominio",
    titleField: "n0_es",
    topologyRules: {
      topologyType: "JERARQUICA_ESTRICTA",
      levelFiltering: true,
      strictLevelJumps: true,
      rootRequiresNoParent: true,
      allowOrphanStealing: true,
      maxDepth: 5,
      deletionStrategy: "ORPHAN",
      siblingCollisionCheck: true,
      scd2Enabled: true,
      preventCycles: true
    },
    fields: [
      { name: "id_dominio", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { section: "Datos Generales", name: "id_registro", type: "text", label: "ID Externo", required: true, width: 12 },
      { section: "Datos Generales", name: "nivel_tipo", type: "number", label: "Nivel Tipo", required: true, width: 6 },
      { section: "Datos Generales", name: "n0_es", type: "text", label: "Nombre (ES)", required: true, width: 6 },
      { section: "Datos Generales", name: "nombre_ingles", type: "text", label: "Nombre (EN)", required: false, width: 6 },
      { section: "Datos Generales", name: "abreviacion", type: "text", label: "Abreviación", required: false, width: 6 },
      { section: "Datos Generales", name: "definicion", type: "textarea", label: "Definición", required: true, width: 12 },
      { section: "Topología (Grafo)", width: 12, name: "relaciones_padre", type: "relation", relationType: "padre", targetEntity: "Dominio", graphEntity: "Relacion_Dominios", valueField: "id_dominio", labelField: "n0_es", uiComponent: "select_single", uiBehavior: "subgrid", label: "Dominio Padre (1:1)", isTemporalGraph: true, topologyCardinality: "1:N" },
      { section: "Topología (Grafo)", width: 12,name: "relaciones_hijo", type: "relation", relationType: "hijo", targetEntity: "Dominio", graphEntity: "Relacion_Dominios", valueField: "id_dominio", labelField: "n0_es", uiComponent: "searchable_multi", uiBehavior: "subgrid", label: "Dominios Subordinados (1:N)", isTemporalGraph: true, topologyCardinality: "1:N" }
    ]
  },
  Capacidad: {
    primaryKey: "id_capacidad",
    titleField: "macrocapacidad",
    fields: [
      { name: "id_capacidad", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { section: "Datos Generales", name: "id_externo", type: "text", label: "ID Externo", required: false, width: 6 },
      { section: "Datos Generales", name: "nivel_tipo", type: "number", label: "Nivel Tipo", required: true, width: 6 },
      { section: "Datos Generales", name: "orden_path", type: "text", label: "Orden Path", required: false, width: 12 },
      { section: "Datos Generales", name: "macrocapacidad", type: "text", label: "Macrocapacidad", required: true, width: 12 },
      { section: "Datos Generales", name: "nombre_ingles", type: "text", label: "Nombre Inglés", required: false, width: 12 },
      { section: "Datos Generales", name: "abreviacion", type: "text", label: "Abreviación", required: false, width: 6 },
      { section: "Datos Generales", name: "descripcion", type: "textarea", label: "Descripción", required: false, width: 12 },
      { section: "Datos Generales", name: "contexto_completo_analisis", type: "textarea", label: "Contexto Análisis", required: false, width: 12 },
      { section: "Datos Generales", name: "path_completo_es", type: "text", label: "Path Completo", required: false, width: 12 }
    ]
  },
  Equipo: {
    businessRules: [
      { trigger: 'onInput', action: 'sumPrefix', prefix: 'cant_', target: 'total_integrantes' }
    ],
    fields: [] // Fallback structure for schema logic
  }
};

function getAppSchema(entityName) {
  return entityName ? APP_SCHEMAS[entityName] : APP_SCHEMAS;
}

/**
 * Epic E8: Safe getter for topology rules. Returns the configured rules
 * for the entity if available, otherwise returns a safe default (FLAT).
 * Prevents downstream failures for legacy entities.
 */
function getEntityTopologyRules(entityName) {
  const schema = getAppSchema(entityName);
  if (schema && schema.topologyRules) {
    return schema.topologyRules;
  }
  // Safe Fallback defaults
  return {
    topologyType: "FLAT",
    levelFiltering: false,
    strictLevelJumps: false,
    rootRequiresNoParent: false,
    allowOrphanStealing: false,
    maxDepth: 0,
    deletionStrategy: "ORPHAN", // Always default to a safe setting (no cascading)
    siblingCollisionCheck: false,
    scd2Enabled: false,
    preventCycles: false
  };
}

if (typeof module !== 'undefined') {
  module.exports = { APP_SCHEMAS, getAppSchema, getEntityTopologyRules };
}