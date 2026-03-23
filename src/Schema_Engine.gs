/**
 * EPT-OMR Project: APP_SCHEMAS Configuration (Server-Side)
 * 
 * This object is the Single Source of Truth for the FormEngine.
 */

const APP_SCHEMAS = {
  Grupo_Productos: {
    steps: ["Datos Generales", "Estrategia de Negocio"],
    primaryKey: "id_grupo_producto",
    titleField: "nombre",
    fields: [
      { name: "id_grupo_producto", label: "ID Grupo Producto", type: "text", required: true, readonly: true, primaryKey: true, step: "Datos Generales" },
      { name: "nombre", label: "Nombre", type: "text", required: true, step: "Datos Generales" },
      { name: "descripcion", label: "Descripción", type: "textarea", required: false, step: "Datos Generales" },
      { name: "id_portafolio", label: "Portafolio Padre", type: "select", required: true, step: "Datos Generales", options: [], lookupSource: "getPortafoliosOptions" },
      { name: "naturaleza_valor", label: "Naturaleza de Valor", type: "text", required: false, step: "Estrategia de Negocio" },
      { name: "modelo_negocio", label: "Modelo de Negocio", type: "select", required: true, options: ["SaaS", "Marketplace", "B2B", "B2C", "Transaccional"], step: "Estrategia de Negocio" }
    ]
  },
  Portafolio: {
    "id_portafolio": { "type": "hidden", "primaryKey": true },
    "estado": { "type": "hidden", "defaultValue": "Activo" },
    "nombre": { "type": "text", "label": "Nombre del Portafolio", "required": true, "group": "Identidad" },
    "proposito": { "type": "textarea", "label": "Propósito del Portafolio", "required": true, "group": "Identidad" },
    "objetivos_negocio": { "type": "textarea", "label": "Objetivos de Negocio (Lista)", "required": true, "group": "Estrategia" },
    "kpis_metricas": { "type": "textarea", "label": "OKRs y KPIs del Portafolio", "required": true, "group": "Estrategia" },
    "capacidad_continuidad": { "type": "number", "label": "% Continuidad Operativa", "group": "Capacidad" },
    "capacidad_fundacional": { "type": "number", "label": "% Fundacionales", "group": "Capacidad" },
    "capacidad_transformacion": { "type": "number", "label": "% Evolución y Transform.", "group": "Capacidad" },
    "flujos_valor": { "type": "textarea", "label": "Value Streams / Flujos de Valor", "group": "Capacidad" },
    "presupuesto_bau": { "type": "number", "label": "Presupuesto BAU ($)", "group": "Presupuesto" },
    "presupuesto_transformacion": { "type": "number", "label": "Presupuesto Transformación ($)", "group": "Presupuesto" },
    "presupuesto_estrategico": { "type": "number", "label": "Presupuesto Estratégico ($)", "group": "Presupuesto" },
    "gobierno_liderazgo": { "type": "textarea", "label": "Gobierno (Roles y Nombres)", "group": "Gobernanza" },
    "stakeholders": { "type": "textarea", "label": "Stakeholders y Sponsors", "group": "Gobernanza" },
    "producto_dominio": { "type": "textarea", "label": "Producto / Dominio (OMS, WMS, etc.)", "group": "Gobernanza" },
    "grupos_hijos": { 
      "type": "relation", 
      "relationType": "1:N", 
      "targetEntity": "Grupo_Productos", 
      "foreignKey": "id_portafolio", 
      "uiBehavior": "subgrid", 
      "label": "Grupos de Producto",
      "group": "Relaciones" 
    }
  },
  Dominio: {
    "id_dominio": { "type": "hidden", "primaryKey": true },
    "estado": { "type": "hidden", "defaultValue": "Activo" },
    "id_registro": { "type": "text", "label": "ID TDE (Registro)", "required": true, "width": "12" },
    "nivel_tipo": { "type": "number", "label": "Nivel Tipo", "required": true, "width": "6" },
    "orden_path": { "type": "text", "label": "Orden Path", "required": true, "width": "6" },
    "n0_es": { "type": "text", "label": "Nombre (ES)", "required": true, "width": "6" },
    "nombre_ingles": { "type": "text", "label": "Nombre (EN)", "required": false, "width": "6" },
    "abreviacion": { "type": "text", "label": "Abreviación", "required": false, "width": "6" },
    "path_completo_es": { "type": "text", "label": "Path Completo (ES)", "required": true, "width": "12" },
    "definicion": { "type": "textarea", "label": "Definición", "required": true, "width": "12" }
  },
  Capacidad: {
    "id_capacidad": { "type": "hidden", "primaryKey": true },
    "estado": { "type": "hidden", "defaultValue": "Activo" },
    "id_externo": { "type": "text", "label": "ID Externo", "required": false, "width": "6" },
    "nivel_tipo": { "type": "number", "label": "Nivel Tipo", "required": true, "width": "6" },
    "orden_path": { "type": "text", "label": "Orden Path", "required": false, "width": "12" },
    "macrocapacidad": { "type": "text", "label": "Macrocapacidad", "required": true, "width": "12" },
    "nombre_ingles": { "type": "text", "label": "Nombre Inglés", "required": false, "width": "12" },
    "abreviacion": { "type": "text", "label": "Abreviación", "required": false, "width": "6" },
    "descripcion": { "type": "textarea", "label": "Descripción", "required": false, "width": "12" },
    "contexto_completo_analisis": { "type": "textarea", "label": "Contexto Análisis", "required": false, "width": "12" },
    "path_completo_es": { "type": "text", "label": "Path Completo", "required": false, "width": "12" }
  },
  Equipo: {
    primaryKey: "id_equipo",
    titleField: "nombre_equipo",
    fields: [
      { name: "id_equipo", label: "ID del Equipo", type: "text", required: true, readonly: true, primaryKey: true },
      { name: "nombre_equipo", label: "Nombre del Equipo", type: "text", required: true },
      { name: "scrum_master", label: "Scrum Master", type: "select", required: true, options: [], lookupSource: "getPersonasOptions", width: 6 },
      { name: "product_owner", label: "Product Owner", type: "select", required: true, options: [], lookupSource: "getPersonasOptions", width: 6 },
      { name: "id_producto", label: "Producto o Canal Asignado", type: "select", required: true, options: [], lookupSource: "getProductosOptions" },
      { name: "estado", type: "hidden", defaultValue: "Activo" }
    ]
  },
  Producto: {
    primaryKey: "id_producto",
    titleField: "nombre_producto",
    fields: [
      { name: "id_producto", label: "ID Producto", type: "text", required: true, readonly: true, primaryKey: true },
      { name: "nombre_producto", label: "Nombre del Producto", type: "text", required: true },
      { name: "nivel_criticalidad", label: "Nivel de Criticalidad", type: "select", required: true, options: ["Tier 1 (Crítico)", "Tier 2 (Alto)", "Tier 3 (Medio)", "Tier 4 (Bajo)"] },
      { name: "slo_objetivo", label: "SLO Objetivo (%)", type: "number", required: false },
      { name: "id_grupo_producto", label: "Grupo de Productos", type: "select", required: true, options: [], lookupSource: "getGruposProductosOptions" }
    ]
  },
  Unidad_Negocio: {
    "id_unidad_negocio": { "type": "hidden", "primaryKey": true },
    "estado": { "type": "hidden", "defaultValue": "Activo" },
    "nombre": { "type": "text", "label": "Nombre de la Unidad", "required": true, "width": "12" },
    "codigo_interno": { "type": "text", "label": "Código Interno / Centro de Costos", "required": true, "width": "6" },
    "director": { "type": "text", "label": "Director Responsable", "required": true, "width": "6" },
    "descripcion": { "type": "textarea", "label": "Descripción Estratégica", "width": "12" }
  },
  Persona: {
    primaryKey: "id_persona",
    titleField: "nombre_completo",
    fields: [
      { name: "id_persona", label: "ID Persona", type: "text", required: true, readonly: true, primaryKey: true, width: 4 },
      { name: "nombre_completo", label: "Nombre Completo", type: "text", required: true, width: 8 },
      { name: "email", label: "Correo Electrónico", type: "email", required: true, width: 6 },
      { name: "rol_organizacional", label: "Rol Organizacional", type: "select", required: true, width: 6, options: ["Director", "Scrum Master", "Product Owner", "Arquitecto", "Desarrollador", "Business Analyst"] },
      { name: "estado", type: "hidden", defaultValue: "Activo" }
    ]
  }
};

function getAppSchema(entityName) {
  return entityName ? APP_SCHEMAS[entityName] : APP_SCHEMAS;
}

if (typeof module !== 'undefined') {
  module.exports = { APP_SCHEMAS, getAppSchema };
}