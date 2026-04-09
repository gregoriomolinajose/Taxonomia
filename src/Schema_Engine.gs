/**
 * EPT-OMR Project: APP_SCHEMAS Configuration (Server-Side)
 * 
 * This object is the Single Source of Truth for the FormEngine.
 */

const APP_SCHEMAS = {
  Unidad_Negocio: {
    metadata: { showInMenu: true, order:1, iconName:'business-outline', color:'primary', label:'Unidades de Negocio', titleField:'nombre', idField:'id_unidad_negocio', fkField:null },
    primaryKey: "id_unidad_negocio",
    topologyRules: {
      topologyType: "JERARQUICA_ESTRICTA",
      preventCycles: true,
      maxDepth: 6,
      allowOrphanStealing: true,
      deletionStrategy: "ORPHAN",
      siblingCollisionCheck: true,
      scd2Enabled: true
    },
    fields: [
      { name: "id_unidad_negocio", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },

      { name: "separator_0", type: "divider", label: "Datos Generales", width: 12 },
      { name: "nombre", type: "text", label: "Nombre de Unidad", required: true, width: 12 },
      { name: "descripcion", type: "textarea", label: "Descripción", required: false, width: 12 },
      { name: "responsable", type: "text", label: "Responsable", required: false, width: 12 },

      { name: "separator_grafo", type: "divider", label: "Topología (Grafo)", width: 12 },
      { name: "portafolios_vinculados", type: "relation", relationType: "hijo", targetEntity: "Portafolio", graphEntity: "Sys_Graph_Edges", valueField: "id_portafolio", labelField: "nombre", uiBehavior: "subgrid", label: "Portafolios Asociados", isTemporalGraph: true, graphEdgeType: "UNIDAD_NEGOCIO_PORTAFOLIO", topologyCardinality: "1:N", width: 12 }
    ]
  },
  Portafolio: {
    uiConfig: { dashboardCard: true },
    metadata: { showInMenu: true, order:2, iconName:'briefcase-outline', color:'primary', label:'Portafolios', titleField:'nombre', idField:'id_portafolio', fkField:null, maxListAttrs: 8 },
    topological_metadata: {
        ownerFields: ["director_id", "vp_id"],
        parentEntity: null,
        parentField: null
    },
    primaryKey: "id_portafolio",
    topologyRules: {
      topologyType: "JERARQUICA_ESTRICTA",
      preventCycles: true,
      maxDepth: 6,
      allowOrphanStealing: true,
      deletionStrategy: "ORPHAN",
      siblingCollisionCheck: true,
      scd2Enabled: true
    },
    fields: [
      { name: "id_portafolio", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },

      { name: "separator_1", type: "divider", label: "Definición Estratégica", width: 12 },
      { name: "nombre", type: "text", label: "Nombre de Portafolio", required: true, width: 12 },
      
      { name: "separator_grafo", type: "divider", label: "Pertenencia Topológica (Grafo)", width: 12 },
      { name: "unidad_negocio_padre", type: "relation", relationType: "padre", targetEntity: "Unidad_Negocio", graphEntity: "Sys_Graph_Edges", valueField: "id_unidad_negocio", labelField: "nombre", uiComponent: "select_single", label: "Unidad de Negocio (Padre)", isTemporalGraph: true, graphEdgeType: "UNIDAD_NEGOCIO_PORTAFOLIO", topologyCardinality: "1:N", width: 12, showInList: true },
      { name: "grupos_productos_vinculados", type: "relation", relationType: "hijo", targetEntity: "Grupo_Productos", graphEntity: "Sys_Graph_Edges", valueField: "id_grupo_producto", labelField: "nombre", uiBehavior: "subgrid", label: "Grupos de Productos Asociados", isTemporalGraph: true, graphEdgeType: "PORTAFOLIO_GRUPO_PRODUCTO", topologyCardinality: "1:N", width: 12 },

      { name: "separator_4", type: "divider", label: "Gobernanza y Actores", width: 12 },
      { name: "gobierno_liderazgo", type: "textarea", label: "Gobierno y Liderazgo", required: false, width: 6 },
      { name: "stakeholders", type: "textarea", label: "Stakeholders", required: false, width: 6 }
    ]
  },
  Dominio: {
    metadata: { showInMenu: true, order:3, iconName:'globe-outline', color:'secondary', label:'Dominios', titleField:'n0_es', idField:'id_dominio', fkField:null },
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
      { name: "id_registro", type: "text", label: "ID Externo", required: true, width: 12 },
      { name: "nivel_tipo", type: "number", label: "Nivel Tipo", required: true, width: 6 },
      { name: "n0_es", type: "text", label: "Nombre (ES)", required: true, width: 6 },
      { name: "nombre_ingles", type: "text", label: "Nombre (EN)", required: false, width: 6 },
      { name: "abreviacion", type: "text", label: "Abreviación", required: false, width: 6 },
      { name: "definicion", type: "textarea", label: "Definición", required: true, width: 12, showInList: false },
      { width: 12, name: "relaciones_padre", type: "relation", relationType: "padre", targetEntity: "Dominio", graphEntity: "Sys_Graph_Edges", valueField: "id_dominio", labelField: "n0_es", uiBehavior: "subgrid", label: "Dominio Padre (1:1)", isTemporalGraph: true, topologyCardinality: "1:N" },
      { width: 12,name: "relaciones_hijo", type: "relation", relationType: "hijo", targetEntity: "Dominio", graphEntity: "Sys_Graph_Edges", valueField: "id_dominio", labelField: "n0_es", uiBehavior: "subgrid", label: "Dominios Subordinados (1:N)", isTemporalGraph: true, topologyCardinality: "1:N" }
    ]
  },
  Grupo_Productos: {
    metadata: { showInMenu: true, order:4, iconName:'layers-outline', color:'secondary', label:'Grupos de Producto', titleField:'nombre', idField:'id_grupo_producto', fkField:{ key:'id_portafolio', label:'Portafolio' } },
    topological_metadata: {
        ownerFields: ["group_manager_id"],
        parentEntity: "Portafolio",
        parentField: "id_portafolio"
    },
    primaryKey: "id_grupo_producto",
    titleField: "nombre",
    topologyRules: {
      topologyType: "JERARQUICA_ESTRICTA",
      preventCycles: true,
      maxDepth: 6,
      allowOrphanStealing: true,
      deletionStrategy: "ORPHAN",
      siblingCollisionCheck: true,
      scd2Enabled: true
    },
    fields: [
      { name: "separator_1", type: "divider", label: "Datos Generales", width: 12 },
      { width: 12, name: "id_grupo_producto", label: "ID Grupo Producto", type: "text", required: true, readonly: true, primaryKey: true },
      { width: 12, name: "nombre", label: "Nombre", type: "text", required: true },
      { width: 12, name: "descripcion", label: "Descripción", type: "textarea", required: false, showInList: false },
      { name: "separator_grafo", type: "divider", label: "Pertenencia Topológica (Grafo)", width: 12 },
      { width: 12, name: "id_portafolio", type: "relation", relationType: "padre", targetEntity: "Portafolio", graphEntity: "Sys_Graph_Edges", valueField: "id_portafolio", labelField: "nombre", uiComponent: "select_single", label: "Portafolio Padre (Grafo)", isTemporalGraph: true, graphEdgeType: "PORTAFOLIO_GRUPO_PRODUCTO", topologyCardinality: "1:N", required: true },
      { width: 12, name: "productos_vinculados", type: "relation", relationType: "hijo", targetEntity: "Producto", graphEntity: "Sys_Graph_Edges", valueField: "id_producto", labelField: "nombre_producto", uiBehavior: "subgrid", label: "Productos Asociados (1:N)", isTemporalGraph: true, graphEdgeType: "GRUPO_PRODUCTO_PRODUCTO", topologyCardinality: "1:N" },
      { name: "separator_2", type: "divider", label: "Estrategia de Valor", width: 12 },
      { width: 12, name: "naturaleza_valor", label: "Naturaleza de Valor", type: "text", required: false },
      { width: 12, name: "modelo_negocio", label: "Modelo de Negocio", type: "select", required: true, options: ["SaaS", "Marketplace", "B2B", "B2C", "Transaccional"] }
    ]
  },
  Producto: {
    metadata: { showInMenu: true, order:5, iconName:'cube-outline', color:'tertiary', label:'Productos', titleField:'nombre_producto', idField:'id_producto', fkField:{ key:'id_grupo_producto', label:'Grupo' } },
    topological_metadata: {
        ownerFields: ["rte_id", "pm_id", "agile_coach_id"],
        parentEntity: "Grupo_Productos",
        parentField: "id_grupo_producto"
    },
    primaryKey: "id_producto",
    titleField: "nombre_producto",
    topologyRules: {
      topologyType: "JERARQUICA_ESTRICTA",
      preventCycles: true,
      maxDepth: 6,
      allowOrphanStealing: true,
      deletionStrategy: "ORPHAN",
      siblingCollisionCheck: true,
      scd2Enabled: true
    },
    fields: [
      { name: "id_producto", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { name: "separator_1", type: "divider", label: "Datos Generales", width: 12 },
      { width: 12, name: "nombre_producto", label: "Nombre de Producto", type: "text", required: true },
      { width: 12, name: "descripcion", label: "Descripción", type: "textarea", required: false, showInList: false },
      { name: "separator_grafo", type: "divider", label: "Pertenencia Topológica (Grafo)", width: 12 },
      { width: 12, name: "id_grupo_producto", type: "relation", relationType: "padre", targetEntity: "Grupo_Productos", graphEntity: "Sys_Graph_Edges", valueField: "id_grupo_producto", labelField: "nombre", uiComponent: "select_single", label: "Grupo de Producto (Padre)", isTemporalGraph: true, graphEdgeType: "GRUPO_PRODUCTO_PRODUCTO", topologyCardinality: "1:N", required: true }
    ]
  },
  Capacidad: {
    metadata: { showInMenu: true, order:6, iconName:'layers-outline', color:'warning', label:'Capacidades', titleField:'macrocapacidad', idField:'id_capacidad', fkField:null },
    primaryKey: "id_capacidad",
    titleField: "macrocapacidad",
    fields: [
      { name: "id_capacidad", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { name: "id_externo", type: "text", label: "ID Externo", required: false, width: 6 },
      { name: "nivel_tipo", type: "number", label: "Nivel Tipo", required: true, width: 6 },
      { name: "orden_path", type: "text", label: "Orden Path", required: false, width: 12 },
      { name: "macrocapacidad", type: "text", label: "Macrocapacidad", required: true, width: 12 },
      { name: "nombre_ingles", type: "text", label: "Nombre Inglés", required: false, width: 12 },
      { name: "abreviacion", type: "text", label: "Abreviación", required: false, width: 6 },
      { name: "descripcion", type: "textarea", label: "Descripción", required: false, width: 12, showInList: false },
      { name: "contexto_completo_analisis", type: "textarea", label: "Contexto Análisis", required: false, width: 12, showInList: false },
      { name: "path_completo_es", type: "text", label: "Path Completo", required: false, width: 12 }
    ]
  },
  Equipo: {
    uiConfig: { dashboardCard: true },
    metadata: { showInMenu: true, order:7, iconName:'people-outline', color:'dark', label:'Equipos', titleField:'nombre_equipo', idField:'id_equipo', fkField:{ key:'id_producto', label:'Producto' } },
    topological_metadata: {
        ownerFields: ["scrum_master_id", "product_owner_id"],
        parentEntity: "Producto",
        parentField: "id_producto"
    },
    businessRules: [
      { trigger: 'onInput', action: 'sumPrefix', prefix: 'cant_', target: 'total_integrantes' }
    ],
    primaryKey: "id_equipo",
    fields: [
      { name: "id_equipo", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { name: "id_producto", type: "relation", relationType: "hijo", targetEntity: "Producto", label: "Producto", required: true, width: 6 },
      { name: "nombre_equipo", type: "text", label: "Nombre de Equipo", required: true, width: 6 },
      { name: "seudonimo", type: "text", label: "Seudónimo", required: false, width: 6 },
      { name: "metodologia", type: "select", label: "Metodología", required: true, width: 6, options: ["Scrum", "Kanban", "Híbrido"] },
      { name: "proposito", type: "textarea", label: "Propósito", required: false, width: 12 },
      { name: "scrum_master_id", type: "text", label: "Scrum Master", required: false, width: 6 },
      { name: "product_owner_id", type: "text", label: "Product Owner", required: false, width: 6 },
      { name: "cant_team_coach", type: "number", label: "Cant. Team Coach", required: false, width: 6 },
      { name: "total_integrantes", type: "number", label: "Total Integrantes", required: false, width: 6 }
    ]
  },
  Persona: {
    uiConfig: { dashboardCard: true },
    metadata: { showInMenu: true, order:8, iconName:'person-outline', color:'medium', label:'Personas', titleField:'email', idField:'email', fkField:null },
    primaryKey: "email",
    topologyRules: {
      topologyType: "JERARQUICA_ESTRICTA",
      preventCycles: true,
      scd2Enabled: true,
      siblingCollisionCheck: false
    },
    fields: [
      { name: "email", type: "email", primaryKey: true, label: "Correo Corporativo", required: true, width: 12, validators: ["regex:^[a-zA-Z0-9._%+-]+@(coppel\\.com|bancoppel\\.com|kairosds\\.com|nttdata\\.com)$"], triggers_workspace_resolve: true },
      
      { name: "separator_1", type: "divider", label: "Datos Personales y Contacto", width: 12 },
      { name: "avatar", type: "avatar", label: "Fotografía", width: 12, readonly: true },
      { name: "nombre", type: "text", label: "Nombre(s)", required: true, width: 6 },
      { name: "apellidos", type: "text", label: "Apellidos", required: true, width: 6 },
      { name: "telefono", type: "tel", label: "Teléfono", required: false, width: 6 },
      { name: "numero_empleado", type: "number", label: "Número de Empleado", required: true, width: 12, validators: ["regex:^\\d{8}$"] },

      
      { name: "separator_2", type: "divider", label: "Datos Contractuales y Logísticos", width: 12 },
      { name: "unidad_negocio", type: "lookup", lookupTarget: "Unidad_Negocio", label: "Unidad de Negocio", required: true, width: 12 },
      { name: "departamento", type: "text", label: "Departamento", required: true, width: 6 },
      { name: "centro_costo", type: "text", label: "Centro de Costos", required: true, width: 6 },
      { name: "cargo", type: "text", label: "Cargo Oficial", required: true, width: 6 },
      { name: "proveedor", type: "text", label: "Proveedor", required: true, width: 6, dependencies: {"showIf": {"field": "esquema", "value": "Externo"}} },
      { name: "modalidad", type: "select", label: "Modalidad", options: ["Presencial", "Virtual", "Híbrido"], required: true, width: 6 },
      { name: "ubicacion", type: "text", label: "Ubicación Geográfica", required: false, width: 6 },
      { name: "herradura", type: "text", label: "Herradura", required: true, width: 6 },
      { name: "esquema", type: "select", label: "Esquema Laboral", options: ["Interno", "Externo"], required: true, width: 6 },
      
      
      { name: "separator_3", type: "divider", label: "Organización y Agilidad", width: 12 },
      { name: "equipo", type: "lookup", lookupTarget: "Equipas", label: "Equipo Asignado", required: false, width: 12 },
      { name: "rol_agil", type: "select", label: "Rol Ágil Asignado", options: ["Product Manager", "Product Owner", "Team Coach", "RTE", "Developer", "Tech Lead", "Tester", "N/A"], required: true, width: 6 },
      { name: "porcentaje_asignacion", type: "select", label: "Asignación", options: ["Full Time", "Part Time", "Por Proyecto"], width: 6 },
      { name: "separator_4", type: "divider", label: "Grafo de Liderazgo y Accesos", width: 12 },
      { name: "lider_directo", type: "relation", relationType: "padre", targetEntity: "Persona", graphEntity: "Sys_Graph_Edges", valueField: "email", labelField: "email", topologyCardinality: "1:N", isTemporalGraph: true, uiBehavior: "subgrid", label: "Líder Directo", required: false, width: 12 },
      { name: "id_rol", type: "select", label: "Rol de Autorización", required: false, width: 12, lookupSource: "getSysRolesOptions" }
    ]
  },
  Sys_Graph_Edges: {
    metadata: { showInMenu: false, order:9, iconName:'git-network-outline', color:'primary', label:'Grafo Universal Temporal', titleField:'tipo_relacion', idField:'id_relacion', fkField:{ key:'id_nodo_padre', label:'Nodo Padre' } },
    primaryKey: "id_relacion",
    fields: [
      { name: "id_relacion", type: "hidden", primaryKey: true },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { name: "id_nodo_padre", type: "text", required: true, width: 6 },
      { name: "id_nodo_hijo", type: "text", required: true, width: 6 },
      { name: "tipo_relacion", type: "text", required: true, width: 6 },
      { name: "valido_desde", type: "hidden" },
      { name: "valido_hasta", type: "hidden" },
      { name: "es_version_actual", type: "hidden", defaultValue: true }
    ]
  },
  Sys_Roles: {
    metadata: { showInMenu: false, order:90, iconName:'shield-half-outline', color:'danger', label:'Seguridad: Roles', titleField:'nombre_rol', idField:'id_rol', fkField:null },
    primaryKey: "id_rol",
    fields: [
      { name: "id_rol", type: "text", primaryKey: true, readonly: true, label: "ID Rol", width: 12 },
      { name: "nombre_rol", type: "text", label: "Nombre de Rol", required: true, width: 6 },
      { name: "descripcion", type: "textarea", label: "Descripción", required: false, width: 12, showInList: false }
    ]
  },
  Config_Typography: {
    metadata: { showInMenu: false, order:92, iconName:'text-outline', color:'medium', label:'Temas Tipográficos', titleField:'nombre_pack', idField:'id_tipografia', fkField:null },
    primaryKey: "id_tipografia",
    fields: [
      { name: "id_tipografia", type: "text", primaryKey: true, readonly: true, label: "ID Pack", width: 12 },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { name: "nombre_pack", type: "text", label: "Nombre de Pack", required: true, width: 12 },
      { name: "font_display", type: "select", label: "Ultra Título (.text-display)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "El texto con el que representamos frases, conceptos o ideas urgentes o de gran importancia." },
      
      { name: "div_headers", type: "divider", label: "Headers 1, 2, 3", width: 12 },
      { name: "font_h1", type: "select", label: "Título Principal (h1)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "El título más importante de una página o sección." },
      { name: "font_h2", type: "select", label: "Título Secundario (h2)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "Un título de menor importancia que el título principal." },
      { name: "font_h3", type: "select", label: "Título Terciario (h3)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "Un título de menor importancia que el título secundario." },
      
      { name: "div_subs", type: "divider", label: "SubHeaders", width: 12 },
      { name: "font_sub", type: "select", label: "Subtítulos (.text-sub)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "Un texto breve que complementa y expande un título." },
      
      { name: "div_body", type: "divider", label: "Body & Small", width: 12 },
      { name: "font_body", type: "select", label: "Texto Cuerpo (body)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "Párrafos largos, artículos, descripciones." },
      { name: "font_mini", type: "select", label: "Miniaturas (.text-mini)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "Un texto de menor importancia que el texto principal." },
      
      { name: "div_caption", type: "divider", label: "Caption & Action", width: 12 },
      { name: "font_caption", type: "select", label: "Leyendas (.text-caption)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "Un texto breve que describe una imagen, gráfico o tabla." },
      { name: "font_action", type: "select", label: "Acciones (.text-action)", required: true, width: 6, options: ["Poppins, sans-serif", "Playfair Display, serif", "Inter, sans-serif", "Roboto, sans-serif", "Montserrat, sans-serif"], helpText: "Botones, enlaces y llamados a la acción." },
      
      { name: "div_math", type: "divider", label: "Escala y Proporciones", width: 12 },
      
      { name: "base_size", type: "select", label: "Tamaño Base (Body Px)", required: true, width: 6, options: ["12px", "14px", "16px", "18px"], defaultValue: "16px", helpText: "Impacta directamente el tamaño de los párrafos y textos base." },
      { name: "scale_ratio", type: "select", label: "Multiplicador de Escala", required: true, width: 6, options: ["1.125 (Major Second)", "1.200 (Minor Third)", "1.250 (Major Third)", "1.333 (Perfect Fourth)", "1.618 (Golden Ratio)"], defaultValue: "1.250 (Major Third)", helpText: "Define qué tan rápido crecen los títulos en proporción al texto base." },
      { name: "heading_weight", type: "select", label: "Peso de Títulos (Weight)", required: true, width: 6, options: ["400", "500", "600", "700", "800"], defaultValue: "600", helpText: "Controla el grosor global de todos los Títulos y Subtítulos." },
      { name: "heading_transform", type: "select", label: "Mayúsculas/Minúsculas", required: true, width: 6, options: ["none", "uppercase", "capitalize", "lowercase"], defaultValue: "none", helpText: "Transforma automáticamente la capitalización de los títulos." }
    ]
  },
  Sys_Permissions: {
    metadata: { showInMenu: false, order:91, iconName:'key-outline', color:'danger', label:'Seguridad: Permisos ABAC', titleField:'schema_destino', idField:'id_permiso', fkField:{ key:'id_rol', label:'Rol Base' } },
    primaryKey: "id_permiso",
    fields: [
      { name: "id_permiso", type: "text", primaryKey: true, readonly: true, label: "ID Permiso", width: 12 },
      { name: "id_rol", type: "select", label: "Rol Organizacional", required: true, width: 6, lookupSource: "getSysRolesOptions" },
      { name: "schema_destino", type: "select", label: "Entidad del Sistema", required: true, width: 6, options: ["Portafolio", "Dominio", "Grupo_Productos", "Producto", "Capacidad", "Unidad_Negocio", "Equipo", "Persona", "Sys_Graph_Edges", "Sys_Roles", "Sys_Permissions", "Config_Typography", "Config_Workspace"] },
      { name: "nivel_acceso", type: "select", label: "Nivel de Acceso", required: true, width: 12, options: ["ALL (Admin Total)", "OWNER_ONLY (Solo propios)", "MEMBER_ONLY (Siendo Miembro)", "READ_ONLY (Solo lectura)", "NONE (Denegado)"] }
    ]
  },
  Config_Workspace: {
    metadata: { showInMenu: false, order:93, iconName:'business-outline', color:'primary', label:'Seguridad: Workspaces', titleField:'dominio_principal', idField:'id_workspace', fkField:null },
    primaryKey: "id_workspace",
    fields: [
      { name: "id_workspace", type: "text", primaryKey: true, readonly: true, label: "ID Workspace", width: 12 },
      { name: "estado", type: "hidden", defaultValue: "Activo" },
      { name: "dominio_principal", type: "text", label: "Dominio Principal", required: true, width: 6, helpText: "Ejemplo: @coppel.com" },
      { name: "alias_alternativos", type: "text", label: "Alias Soportados (CSV)", required: false, width: 6, helpText: "Ejemplo: @coppelmexico.com,@bancoppel.com" },
      { name: "auth_mode", type: "select", label: "Modo OAuth (M2M)", required: true, width: 12, options: ["USER_DEPLOYING (Global Default)", "SERVICE_ACCOUNT (Explicit)"], defaultValue: "USER_DEPLOYING (Global Default)" },
      { name: "admin_contacto", type: "text", label: "Contacto IT (Email)", required: true, width: 12 }
    ]
  },
  _UI_CONFIG: {
    badgeMap: {
      'activo': 'activo', 'borrador': 'borrador', 'en-revis-n': 'en-revision', 'en-revision': 'en-revision',
      'tier-1-cr-tico': 'tier-1-critico', 'tier-1-critico': 'tier-1-critico',
      'tier-2-alto': 'tier-2-alto', 'tier-3-medio': 'tier-3-medio', 'tier-4-bajo': 'tier-4-bajo',
      'saas': 'saas', 'marketplace': 'marketplace', 'b2b': 'b2b', 'b2c': 'b2c', 'transaccional': 'transaccional',
      'all-admin-total': 'danger', 'owner-only-solo-propios': 'primary', 'member-only-siendo-miembro': 'secondary', 'read-only-solo-lectura': 'medium', 'none-denegado': 'light'
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