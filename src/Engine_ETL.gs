/**
 * Engine_ETL.gs
 * Subsistema especializado en operaciones de Extracción, Transformación y Carga masiva.
 * Aisla la lógica de SpreadsheetApp y generación de Drive de los adaptadores de base de datos generales.
 */

var Engine_ETL = (function() {

  /**
   * Genera una hoja de cálculo en Drive basada en el schema de la entidad.
   * Excluye metadata del sistema para proveer un archivo limpio.
   * 
   * @param {string} entityName 
   * @returns {string} URL de la Hoja de Google Sheets
   */
  function generateDriveTemplate(entityName) {
    if (typeof getAppSchema !== 'function') throw new Error("No se encuentra Schema_Engine en este contexto.");
    const schema = getAppSchema(entityName);
    if (!schema) throw new Error("No existe esquema para la entidad " + entityName);

    // 1. Filtrar campos que no pertenecen a la Ingesta de forma dinámica (H10 resuelto)
    let excludedFields = [];
    if (typeof FIELD_TEMPLATES !== 'undefined') {
      const technicalTemplates = [
        ...(FIELD_TEMPLATES.SYSTEM_FIELDS ? FIELD_TEMPLATES.SYSTEM_FIELDS() : []),
        ...(FIELD_TEMPLATES.ESTADO_FIELD ? FIELD_TEMPLATES.ESTADO_FIELD() : []),
        ...(FIELD_TEMPLATES.AUDIT_FIELDS ? FIELD_TEMPLATES.AUDIT_FIELDS() : []),
        ...(FIELD_TEMPLATES.VERSION_FIELD ? FIELD_TEMPLATES.VERSION_FIELD() : [])
      ];
      excludedFields = technicalTemplates.map(f => f.name);
    } else {
      // Fallback estricto
      excludedFields = [
        'created_at', 'created_by', 'updated_at', 'updated_by', 
        'deleted_at', 'deleted_by', 'estado', '_version', 'lexical_id'
      ];
    }
    
    const headers = [];
    schema.fields.forEach(f => {
      if (f.type === 'divider' || f.type === 'title') return;
      if (f.type === 'hidden') return;  // Omitir ocultos por defecto
      if (f.primaryKey === true) return; // El Motor DB genera los UUID de PK solos, no se piden al usuario
      if (f.type === 'relation' || f.isTemporalGraph || f.isEdge) return; // Las topologías Padre-Hijo no se inyectan en cargas planas
      if (excludedFields.includes(f.name)) return;
      headers.push(f.name);
    });

    if (headers.length === 0) {
      throw new Error("El esquema no tiene campos editables.");
    }

    // 2. Crear Sheet en la raíz del Drive
    const humanName = schema.labelPlural || entityName;
    const ssName = "Plantilla Carga Masiva - " + humanName;
    const ss = SpreadsheetApp.create(ssName);
    
    // 3. Formatear la Hoja Principal
    const sheet = ss.getActiveSheet();
    sheet.setName(humanName);
    
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setValues([headers]);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#E8EAF6"); // Color Corporativo Suave
    sheet.setFrozenRows(1);

    // Opcional: auto-ajustar columnas
    sheet.autoResizeColumns(1, headers.length);

    // 4. Retornar link
    return ss.getUrl();
  }

  // --- Public API ---
  return {
    generateDriveTemplate: generateDriveTemplate
  };

})();
