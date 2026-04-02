/**
 * EPT-OMR Project: APP_SCHEMAS Configuration (Server-Side)
 * 
 * This object is the Single Source of Truth for the FormEngine.
 */

const APP_SCHEMAS = {
  Unidad_Negocio: {
    metadata: { showInMenu: true, showInDashboard: false, order:1, iconName:'business-outline', color:'primary', label:'Unidades de Negocio', titleField:'nombre', idField:'id_unidad_negocio', fkField:null },
    fields: []
  },
  Portafolio: {
    metadata: { showInMenu: true, showInDashboard: false, order:2, iconName:'briefcase-outline', color:'primary', label:'Portafolios', titleField:'nombre', idField:'id_portafolio', fkField:null },
    fields: []
  },
  Dominio: {
    metadata: { showInMenu: true, showInDashboard: false, order:3, iconName:'globe-outline', color:'secondary', label:'Dominios', titleField:'n0_es', idField:'id_dominio', fkField:null },
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
      { section: "Datos Generales", name: "definicion", type: "textarea", label: "Definición", required: true, width: 12, showInList: false },
      { section: "Topología (Grafo)", width: 12, name: "relaciones_padre", type: "relation", relationType: "padre", targetEntity: "Dominio", graphEntity: "Relacion_Dominios", valueField: "id_dominio", labelField: "n0_es", uiBehavior: "subgrid", label: "Dominio Padre (1:1)", isTemporalGraph: true, topologyCardinality: "1:N" },
      { section: "Topología (Grafo)", width: 12,name: "relaciones_hijo", type: "relation", relationType: "hijo", targetEntity: "Dominio", graphEntity: "Relacion_Dominios", valueField: "id_dominio", labelField: "n0_es", uiBehavior: "subgrid", label: "Dominios Subordinados (1:N)", isTemporalGraph: true, topologyCardinality: "1:N" }
    ]
  },
  Grupo_Productos: {
    metadata: { showInMenu: true, showInDashboard: false, order:4, iconName:'layers-outline', color:'secondary', label:'Grupos de Producto', titleField:'nombre', idField:'id_grupo_producto', fkField:{ key:'id_portafolio', label:'Portafolio' } },
    steps: ["Datos Generales", "Estrategia de Negocio"],
    primaryKey: "id_grupo_producto",
    titleField: "nombre",
    fields: [
      { section: "Datos Generales", width: 12, name: "id_grupo_producto", label: "ID Grupo Producto", type: "text", required: true, readonly: true, primaryKey: true },
      { section: "Datos Generales", width: 12, name: "nombre", label: "Nombre", type: "text", required: true },
      { section: "Datos Generales", width: 12, name: "descripcion", label: "Descripción", type: "textarea", required: false, showInList: false },
      { section: "Datos Generales", width: 12, name: "id_portafolio", label: "Portafolio Padre", type: "select", required: true, options: [], lookupSource: "getPortafoliosOptions" },
      { section: "Estrategia de Negocio", width: 12, name: "naturaleza_valor", label: "Naturaleza de Valor", type: "text", required: false },
      { section: "Estrategia de Negocio", width: 12, name: "modelo_negocio", label: "Modelo de Negocio", type: "select", required: true, options: ["SaaS", "Marketplace", "B2B", "B2C", "Transaccional"] }
    ]
  },
  Producto: {
    metadata: { showInMenu: true, showInDashboard: false, order:5, iconName:'cube-outline', color:'tertiary', label:'Productos', titleField:'nombre_producto', idField:'id_producto', fkField:{ key:'id_grupo_producto', label:'Grupo' } },
    fields: []
  },
  Capacidad: {
    metadata: { showInMenu: true, showInDashboard: false, order:6, iconName:'layers-outline', color:'warning', label:'Capacidades', titleField:'macrocapacidad', idField:'id_capacidad', fkField:null },
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
      { section: "Datos Generales", name: "descripcion", type: "textarea", label: "Descripción", required: false, width: 12, showInList: false },
      { section: "Datos Generales", name: "contexto_completo_analisis", type: "textarea", label: "Contexto Análisis", required: false, width: 12, showInList: false },
      { section: "Datos Generales", name: "path_completo_es", type: "text", label: "Path Completo", required: false, width: 12 }
    ]
  },
  Equipo: {
    metadata: { showInMenu: true, showInDashboard: false, order:7, iconName:'people-outline', color:'dark', label:'Equipos', titleField:'nombre_equipo', idField:'id_equipo', fkField:{ key:'id_producto', label:'Producto' } },
    businessRules: [
      { trigger: 'onInput', action: 'sumPrefix', prefix: 'cant_', target: 'total_integrantes' }
    ],
    fields: []
  },
  Persona: {
    metadata: { showInMenu: true, showInDashboard: false, order:8, iconName:'person-outline', color:'medium', label:'Personas', titleField:'nombre_completo', idField:'id_persona', fkField:null },
    primaryKey: "id_persona",
    fields: [
      { name: "id_persona", type: "text", primaryKey: true, readonly: true, label: "ID Persona", width: 6 },
      { name: "nombre_completo", type: "text", label: "Nombre Completo", required: true, width: 6 },
      { name: "correo", type: "text", label: "Correo Corporativo", required: true, width: 6 },
      { name: "id_rol", type: "select", label: "Rol de Autorización (ABAC)", required: false, width: 6, lookupSource: "getSysRolesOptions" }
    ]
  },
  Relacion_Dominios: {
    metadata: { order:9, iconName:'git-network-outline', color:'primary', label:'Conexiones Topológicas', titleField:'tipo_relacion', idField:'id_relacion', fkField:{ key:'id_nodo_padre', label:'Dominio' } },
    fields: []
  },
  Sys_Roles: {
    metadata: { showInMenu: true, showInDashboard: false, order:90, iconName:'shield-half-outline', color:'danger', label:'Seguridad: Roles', titleField:'nombre_rol', idField:'id_rol', fkField:null },
    primaryKey: "id_rol",
    fields: [
      { name: "id_rol", type: "text", primaryKey: true, readonly: true, label: "ID Rol", width: 12 },
      { name: "nombre_rol", type: "text", label: "Nombre de Rol", required: true, width: 6 },
      { name: "descripcion", type: "textarea", label: "Descripción", required: false, width: 12, showInList: false }
    ]
  },
  Sys_Permissions: {
    metadata: { showInMenu: true, showInDashboard: false, order:91, iconName:'key-outline', color:'danger', label:'Seguridad: Permisos ABAC', titleField:'schema_destino', idField:'id_permiso', fkField:{ key:'id_rol', label:'Rol Base' } },
    primaryKey: "id_permiso",
    fields: [
      { name: "id_permiso", type: "text", primaryKey: true, readonly: true, label: "ID Permiso", width: 12 },
      { name: "id_rol", type: "select", label: "Rol Organizacional", required: true, width: 6, lookupSource: "getSysRolesOptions" },
      { name: "schema_destino", type: "select", label: "Entidad del Sistema", required: true, width: 6, options: ["Portafolio", "Dominio", "Grupo_Productos", "Producto", "Capacidad", "Equipo", "Persona", "Relacion_Dominios", "Sys_Roles", "Sys_Permissions"] },
      { name: "nivel_acceso", type: "select", label: "Nivel de Acceso", required: true, width: 12, options: ["ALL (Admin Total)", "OWNER_ONLY (Solo propios)", "MEMBER_ONLY (Siendo Miembro)", "READ_ONLY (Solo lectura)", "NONE (Denegado)"] }
    ]
  },
  _UI_CONFIG: {
    badgeMap: {
      'activo': 'activo', 'borrador': 'borrador', 'en-revis-n': 'en-revision', 'en-revision': 'en-revision',
      'tier-1-cr-tico': 'tier-1-critico', 'tier-1-critico': 'tier-1-critico',
      'tier-2-alto': 'tier-2-alto', 'tier-3-medio': 'tier-3-medio', 'tier-4-bajo': 'tier-4-bajo',
      'saas': 'saas', 'marketplace': 'marketplace', 'b2b': 'b2b', 'b2c': 'b2c', 'transaccional': 'transaccional'
    }
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