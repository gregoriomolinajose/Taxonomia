/**
 * EPT-OMR Project: APP_SCHEMAS Configuration (Server-Side)
 * 
 * This object is the Single Source of Truth for the FormEngine.
 */

const APP_SCHEMAS = {
  Grupo_Productos: {
    steps: ["Datos Generales", "Estrategia de Negocio"],
    fields: [
      { name: "id_grupo_producto", label: "ID Grupo Producto", type: "text", required: true, readonly: true, step: "Datos Generales" },
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
  Equipo: {
    fields: [
      { name: "id_equipo", label: "ID del Equipo", type: "text", required: true, readonly: true },
      { name: "nombre_equipo", label: "Nombre del Equipo", type: "text", required: true },
      { name: "scrum_master", label: "Scrum Master", type: "lookup", required: true, lookupTarget: "Persona", width: 6 },
      { name: "product_owner", label: "Product Owner", type: "lookup", required: true, lookupTarget: "Persona", width: 6 },
      { name: "id_producto", label: "Producto o Canal Asignado", type: "lookup", required: true, lookupTarget: "Producto" }
    ]
  },
  Producto: {
    fields: [
      { name: "id_producto", label: "ID Producto", type: "text", required: true, readonly: true },
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
  }
};

function getAppSchema(entityName) {
  return entityName ? APP_SCHEMAS[entityName] : APP_SCHEMAS;
}

if (typeof module !== 'undefined') {
  module.exports = { APP_SCHEMAS, getAppSchema };
}