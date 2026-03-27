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
      { section: "Datos Generales", width: 12, name: "id_grupo_producto", label: "ID Grupo Producto", type: "text", required: true, readonly: true, primaryKey: true },
      { section: "Datos Generales", width: 12, name: "nombre", label: "Nombre", type: "text", required: true },
      { section: "Datos Generales", width: 12, name: "descripcion", label: "Descripción", type: "textarea", required: false },
      { section: "Datos Generales", width: 12, name: "id_portafolio", label: "Portafolio Padre", type: "select", required: true, options: [], lookupSource: "getPortafoliosOptions" },
      { section: "Estrategia de Negocio", width: 12, name: "naturaleza_valor", label: "Naturaleza de Valor", type: "text", required: false },
      { section: "Estrategia de Negocio", width: 12, name: "modelo_negocio", label: "Modelo de Negocio", type: "select", required: true, options: ["SaaS", "Marketplace", "B2B", "B2C", "Transaccional"] }
    ]
  },
  Portafolio: {
    primaryKey: "id_portafolio",
    titleField: "nombre",
    fields: [
      { name: "id_portafolio", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { section: "Identidad", width: 12, name: "nombre", type: "text", label: "Nombre del Portafolio", required: true },
      { section: "Identidad", width: 12, name: "proposito", type: "textarea", label: "Propósito del Portafolio", required: true },
      { section: "Estrategia", width: 12, name: "objetivos_negocio", type: "textarea", label: "Objetivos de Negocio (Lista)", required: true },
      { section: "Estrategia", width: 12, name: "kpis_metricas", type: "textarea", label: "OKRs y KPIs del Portafolio", required: true },
      { section: "Capacidad", width: 4, name: "capacidad_continuidad", type: "number", label: "% Continuidad Operativa" },
      { section: "Capacidad", width: 4, name: "capacidad_fundacional", type: "number", label: "% Fundacionales" },
      { section: "Capacidad", width: 4, name: "capacidad_transformacion", type: "number", label: "% Evolución y Transform." },
      { section: "Capacidad", width: 12, name: "flujos_valor", type: "textarea", label: "Value Streams / Flujos de Valor" },
      { section: "Presupuesto", width: 4, name: "presupuesto_bau", type: "number", label: "Presupuesto BAU ($)" },
      { section: "Presupuesto", width: 4, name: "presupuesto_transformacion", type: "number", label: "Presupuesto Transformación ($)" },
      { section: "Presupuesto", width: 4, name: "presupuesto_estrategico", type: "number", label: "Presupuesto Estratégico ($)" },
      { section: "Gobernanza", width: 12, name: "gobierno_liderazgo", type: "textarea", label: "Gobierno (Roles y Nombres)" },
      { section: "Gobernanza", width: 12, name: "stakeholders", type: "textarea", label: "Stakeholders y Sponsors" },
      { section: "Gobernanza", width: 12, name: "producto_dominio", type: "textarea", label: "Producto / Dominio (OMS, WMS, etc.)" },
      { section: "Relaciones", width: 12, name: "grupos_hijos", type: "relation", relationType: "1:N", targetEntity: "Grupo_Productos", foreignKey: "id_portafolio", uiBehavior: "subgrid", label: "Grupos de Producto" }
    ]
  },
  Dominio: {
    primaryKey: "id_dominio",
    titleField: "n0_es",
    fields: [
      { name: "id_dominio", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { section: "Datos Generales", name: "id_registro", type: "text", label: "ID TDE (Registro)", required: true, width: 12 },
      { section: "Datos Generales", name: "nivel_tipo", type: "number", label: "Nivel Tipo", required: true, width: 6, triggers_refresh_of: ["id_dominio_padre"] },
      { section: "Datos Generales", name: "id_dominio_padre", type: "select", label: "Dominio Padre", required: false, width: 12, lookupSource: "getDominiosPadreOptions" },
      { section: "Datos Generales", name: "orden_path", type: "text", label: "Orden Path", required: true, width: 6 },
      { section: "Datos Generales", name: "n0_es", type: "text", label: "Nombre (ES)", required: true, width: 6 },
      { section: "Datos Generales", name: "nombre_ingles", type: "text", label: "Nombre (EN)", required: false, width: 6 },
      { section: "Datos Generales", name: "abreviacion", type: "text", label: "Abreviación", required: false, width: 6 },
      { section: "Datos Generales", name: "path_completo_es", type: "text", label: "Path Completo (ES)", required: true, width: 12 },
      { section: "Datos Generales", name: "definicion", type: "textarea", label: "Definición", required: true, width: 12 }
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
    primaryKey: "id_equipo",
    titleField: "nombre_equipo",
    fields: [
      // Sistema e IDs
      { name: "id_equipo", label: "ID Sistema", type: "text", required: true, readonly: true, primaryKey: true, width: 4 },
      { name: "id_externo", label: "ID Equipo (Externo/Nómina)", type: "text", width: 4 },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      
      // Sección 1: Identidad
      { section: "Identidad", name: "nombre_equipo", label: "Nombre Oficial", type: "text", required: true, width: 4 },
      { section: "Identidad", name: "seudonimo", label: "Seudónimo / Alias", type: "text", width: 4 },
      { section: "Identidad", name: "tipo_equipo", label: "Topología (Team Topologies)", type: "select", options: ["Stream-aligned", "Platform", "Enabling", "Complicated-subsystem"], required: true, width: 4 },
      { section: "Identidad", name: "proposito", label: "Propósito / Misión", type: "textarea", width: 12 },
      
      // Sección 2: Gobernanza
      { section: "Gobernanza", name: "id_unidad_negocio", label: "Unidad de Negocio", type: "select", lookupSource: "getUnidadesNegocioOptions", required: true, width: 6 },
      { section: "Gobernanza", name: "id_portafolio", label: "Portafolio (Financiamiento)", type: "select", lookupSource: "getPortafoliosOptions", width: 6 },
      { section: "Gobernanza", name: "id_producto", label: "Producto Padre", type: "select", lookupSource: "getProductosOptions", width: 12 },
      
      // Sección 3: Integrantes y Roles (Dynamic List)
      { 
        section: "Plantilla de Integrantes", 
        name: "integrantes_json", 
        label: "Integrantes y Roles", 
        type: "dynamic_list", 
        width: 12,
        subFields: [
          { name: "id_persona", label: "Seleccionar Persona", type: "select", lookupSource: "getPersonasOptions", width: 7 },
          { name: "rol_asignado", label: "Rol en esta Célula", type: "text", width: 4 }
        ]
      },
      
      // Sección 4: Capacidad y Especialidad (Grid Numérico Compacto)
      { section: "Capacidad", name: "cant_dev_back", label: "Dev Back", type: "number", width: 2 },
      { section: "Capacidad", name: "cant_dev_front", label: "Dev Front", type: "number", width: 2 },
      { section: "Capacidad", name: "cant_fullstack", label: "Fullstack", type: "number", width: 2 },
      { section: "Capacidad", name: "cant_testers", label: "Testers (QA)", type: "number", width: 2 },
      { section: "Capacidad", name: "cant_tech_lead", label: "Tech Leads", type: "number", width: 2 },
      { section: "Capacidad", name: "cant_team_coach", label: "Team Coach", type: "number", width: 2 },
      { section: "Capacidad", name: "cant_po", label: "PO / PM", type: "number", width: 2 },
      { section: "Capacidad", name: "cant_otros", label: "Otros", type: "number", width: 2 },
      { section: "Capacidad", name: "roles_otros", label: "¿Qué rol tienen? (Otros)", type: "text", width: 4 },
      { section: "Capacidad", name: "total_integrantes", label: "Total Suma", type: "number", readonly: true, width: 4 }, // Campo Calculado
      
      // Sección 5: Operativa
      { section: "Operativa", name: "metodologia", label: "Metodología", type: "select", options: ["Scrum", "Kanban", "Híbrida"], width: 4 },
      { section: "Operativa", name: "herramienta_tracker", label: "Herramienta de Gestión", type: "select", options: ["Jira", "Azure DevOps"], width: 4 },
      { section: "Operativa", name: "url_tablero", label: "URL del Tablero", type: "url", width: 4 }
    ]
  },
  Producto: {
    primaryKey: "id_producto",
    titleField: "nombre_producto",
    fields: [
      { section: "Datos Generales", width: 12, name: "id_producto", label: "ID Producto", type: "text", required: true, readonly: true, primaryKey: true },
      { section: "Datos Generales", width: 12, name: "nombre_producto", label: "Nombre del Producto", type: "text", required: true },
      { section: "Datos Generales", width: 6, name: "nivel_criticalidad", label: "Nivel de Criticalidad", type: "select", required: true, options: ["Tier 1 (Crítico)", "Tier 2 (Alto)", "Tier 3 (Medio)", "Tier 4 (Bajo)"] },
      { section: "Datos Generales", width: 6, name: "slo_objetivo", label: "SLO Objetivo (%)", type: "number", required: false },
      { section: "Datos Generales", width: 12, name: "id_grupo_producto", label: "Grupo de Productos", type: "select", required: true, options: [], lookupSource: "getGruposProductosOptions" }
    ]
  },
  Unidad_Negocio: {
    primaryKey: "id_unidad_negocio",
    titleField: "nombre",
    fields: [
      { name: "id_unidad_negocio", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { section: "Datos Generales", name: "nombre", type: "text", label: "Nombre de la Unidad", required: true, width: 12 },
      { section: "Datos Generales", name: "codigo_interno", type: "text", label: "Código Interno / Centro de Costos", required: true, width: 6 },
      { section: "Datos Generales", name: "director", type: "text", label: "Director Responsable", required: true, width: 6 },
      { section: "Datos Generales", name: "descripcion", type: "textarea", label: "Descripción Estratégica", width: 12 }
    ]
  },
  Persona: {
    primaryKey: "id_persona",
    titleField: "nombre",
    fields: [
      // Sistema (Ocultos / Readonly)
      { name: "id_persona", label: "ID Persona", type: "text", required: true, readonly: true, primaryKey: true, width: 4 },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      
      // Sección 1: Datos Personales
      { section: "Datos Personales", name: "nombre", label: "Nombre Apellido", type: "text", required: true, width: 6 },
      { section: "Datos Personales", name: "email", label: "Correo", type: "email", required: true, width: 6 },
      { section: "Datos Personales", name: "fecha_nacimiento", label: "Fecha de Nacimiento", type: "date", width: 6 },
      { section: "Datos Personales", name: "telefono", label: "Nro de Teléfono", type: "tel", width: 6 },
      
      // Sección 2: Ubicación
      { section: "Ubicación", name: "pais", label: "País", type: "text", width: 4 },
      { section: "Ubicación", name: "estado_ubicacion", label: "Estado", type: "text", width: 4 },
      { section: "Ubicación", name: "ciudad", label: "Ciudad", type: "text", width: 4 },
      { section: "Ubicación", name: "cp", label: "Código Postal", type: "text", width: 4 },
      { section: "Ubicación", name: "colonia", label: "Colonia", type: "text", width: 8 },
      { section: "Ubicación", name: "calle", label: "Calle", type: "text", width: 12 },
      
      // Sección 3: Corporativo
      { section: "Corporativo", name: "nro_empleado", label: "Nro Empleado", type: "text", required: true, width: 6 },
      { section: "Corporativo", name: "empresa", label: "Empresa", type: "text", width: 6 },
      { section: "Corporativo", name: "contrato", label: "Contrato", type: "text", width: 6 },
      { section: "Corporativo", name: "modalidad", label: "Modalidad de trabajo", type: "select", options: ["Presencial", "Híbrido", "Remoto"], width: 6 },
      { section: "Corporativo", name: "oficina", label: "Oficina/Lugar", type: "text", width: 6 },
      { section: "Corporativo", name: "centro_costo", label: "Centro de Costo", type: "text", width: 6 },
      { section: "Corporativo", name: "nombre_centro", label: "Nombre del Centro", type: "text", width: 6 },
      { section: "Corporativo", name: "fecha_inicio_vigencia", label: "Inicio de Vigencia", type: "date", width: 6 },
      { section: "Corporativo", name: "fecha_cierre", label: "Fecha de Cierre", type: "date", width: 6 },
      { section: "Corporativo", name: "fecha_ingreso", label: "Fecha de Ingreso", type: "date", width: 6 },
      { section: "Corporativo", name: "cargo", label: "Cargo", type: "text", width: 6 },
      { section: "Corporativo", name: "estado_contratacion", label: "Estado Contratación", type: "select", options: ["Activo", "Inactivo", "Permiso", "Suspendido"], width: 6 },
      { section: "Corporativo", name: "empleador_legal", label: "Empleador Legal", type: "text", width: 12 },
      
      // Sección 4: Operativa
      { section: "Operativa", name: "id_unidad_negocio", label: "Unidad de Negocio", type: "select", options: [], lookupSource: "getUnidadesNegocioOptions", width: 6 },
      { section: "Operativa", name: "id_equipo", label: "Equipo", type: "select", options: [], lookupSource: "getEquiposOptions", width: 6 },
      { section: "Operativa", name: "rol", label: "Rol Operativo", type: "text", width: 6 },
      { section: "Operativa", name: "tiempo_rol", label: "Tiempo en el rol", type: "text", width: 6 },
      { section: "Operativa", name: "fecha_entrada_posicion", label: "Ingreso a Posición", type: "date", width: 6 },
      { section: "Operativa", name: "iniciativa", label: "Iniciativa Actual", type: "text", width: 6 },
      { section: "Operativa", name: "email_manager", label: "Correo del Líder", type: "email", width: 6 },
      { section: "Operativa", name: "nro_manager", label: "Número del Manager", type: "text", width: 6 },
      { section: "Operativa", name: "nombre_manager", label: "Nombre del Manager", type: "text", width: 12 }
    ]
  }
};

function getAppSchema(entityName) {
  return entityName ? APP_SCHEMAS[entityName] : APP_SCHEMAS;
}

if (typeof module !== 'undefined') {
  module.exports = { APP_SCHEMAS, getAppSchema };
}