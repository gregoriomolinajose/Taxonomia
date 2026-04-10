/**
 * Controller_Lookups.gs
 * 
 * Controlador purificado (SRP) para la generación dinámica de diccionarios (Data Binding).
 * Absorbe las lógicas rígidas de obtención de select-options separándolas del Router.
 */

/**
 * _getCachedLookup(sourceFnName)
 * Implementa CacheService para evitar lecturas repetitivas de Sheets.
 */
function _getCachedLookup(sourceFnName) {
  const cache = CacheService.getScriptCache();
  const cacheKey = `CACHE_LOOKUP_${sourceFnName}`;
  const cached = cache.get(cacheKey);
  
  if (cached) {
    Logger.log(`[Cache] HIT para ${sourceFnName}`);
    return JSON.parse(cached);
  }
  
  Logger.log(`[Cache] MISS para ${sourceFnName}. Leyendo de DB...`);
  let result = this[sourceFnName]();
  // Safe-Parse para estandarizar el IPC Bug Fix donde las funciones devuelven ya Strings
  if (typeof result === 'string') {
      try { result = JSON.parse(result); } catch(e) { }
  }
  cache.put(cacheKey, JSON.stringify(result), 3600); // 1 hora
  return result;
}

// Bloque de Persistencia Dinámicas (Relacional 1:N)

/**
 * getDominioOptions (S8.5)
 * Devuelve opciones enriquecidas con Metadatos Topológicos (nivel_tipo y hasActiveParent)
 * para permitir Filtros 'Dumbness Guards' en el Frontend.
 */
function getDominioOptions() {
  try {
    const rawDominios = Engine_DB.list('Dominio');
    if (!rawDominios || !rawDominios.rows) return [];

    // Cargar mapa referencial de Relaciones Activas para detectar 'Hijos ya adoptados'
    const rawRelaciones = Engine_DB.list('Relacion_Dominios');
    const hasActiveParentMap = {}; // { childId: true }
    
    if (rawRelaciones && rawRelaciones.rows) {
        rawRelaciones.rows.forEach(r => {
            if (r.es_version_actual !== false) {
                hasActiveParentMap[r.id_nodo_hijo] = true;
            }
        });
    }
    
    const options = rawDominios.rows
      .filter(row => row.estado !== 'Eliminado')
      .map(row => ({
        id: row.id_dominio,
        value: row.id_dominio,
        label: `[N${row.nivel_tipo}] ${row.n0_es}`, // UX: Mostrar nivel en el dropdown visualmente
        nivel_tipo: isNaN(Number(row.nivel_tipo)) ? 0 : Number(row.nivel_tipo),
        hasActiveParent: !!hasActiveParentMap[row.id_dominio]
      }));
      
    // OBLIGATORIO: Retornar string nativo para evadir bug de serialización V8 IPC
    return JSON.stringify(options);
  } catch(e) {
    Logger.log("Error en getDominioOptions: " + e.message);
    return [];
  }
}

function getPersonasOptions() {
  try {
    const result = Engine_DB.list('Persona');
    if (!result || !result.rows) return [];
    
    const options = result.rows
      .filter(row => row.estado !== 'Eliminado')
      .map(row => ({
        id: row.id_persona,
        nombre: row.nombre,
        value: row.id_persona,
        label: row.nombre + (row.cargo ? ` (${row.cargo})` : '')
      }));
    // OBLIGATORIO: Retornar string nativo para evadir bug de serialización V8 IPC
    return JSON.stringify(options);
  } catch(e) {
    Logger.log("Error en getPersonasOptions: " + e.message);
    return [];
  }
}

function getGruposProductosOptions() { return getGenericOptions('Grupo_Productos', 'id_grupo_producto', 'nombre'); }

/**
 * getPortafoliosOptions
 * Devuelve [{value: id_portafolio, label: nombre}] desde DB_Portafolio.
 * Usado por el Dependency Resolver de FormEngine para el campo id_portafolio en Grupo_Productos.
 */
function getPortafoliosOptions() { return getGenericOptions('Portafolio', 'id_portafolio', 'nombre'); }

/**
 * getProductosOptions
 * Devuelve [{value: id_producto, label: nombre_producto}] desde DB_Producto.
 * Usado por el Dependency Resolver de FormEngine para el campo productos_asociados.
 */
function getProductosOptions() { return getGenericOptions('Producto', 'id_producto', 'nombre_producto'); }

/**
 * getUnidadesNegocioOptions
 * Devuelve [{value: id_unidad_negocio, label: nombre}] desde DB_Unidad_Negocio.
 */
function getUnidadesNegocioOptions() { return getGenericOptions('Unidad_Negocio', 'id_unidad_negocio', 'nombre'); }

/**
 * getEquiposOptions
 * Devuelve [{value: id_equipo, label: nombre_equipo}] desde DB_Equipo.
 */
function getEquiposOptions() { return getGenericOptions('Equipo', 'id_equipo', 'nombre_equipo'); }

/**
 * getSysRolesOptions
 * Devuelve [{value: id_rol, label: nombre_rol}] desde DB_Sys_Roles.
 * Requerido para Bindings de Seguridad ABAC.
 */
function getSysRolesOptions() { return getGenericOptions('Sys_Roles', 'id_rol', 'nombre_rol'); }

/**
 * getGenericOptions
 * Generador abstracto unificado por la "Regla de 3" (S16.2 Refactor)
 * Extrae colecciones estándar donde el label es meramente un campo string.
 */
function getGenericOptions(entityName, valCol, labelCol) {
  try {
    const result = Engine_DB.list(entityName);
    if (!result || !result.rows) return [];

    // OBLIGATORIO: Transmitir en formato String crudo para evadir el crash del Serializador IPC de GAS
    const options = result.rows.map(row => ({
      value: row[valCol],
      label: row[labelCol]
    })).filter(opt => opt.value !== undefined && opt.value !== null && opt.label);
    return JSON.stringify(options);
  } catch (error) {
    Logger.log(`Error en getGenericOptions para ${entityName}: ` + error.message);
    return [];
  }
}

// Bloque de Protección Híbrida (Jest)
if (typeof module !== 'undefined') {
  module.exports = {
    _getCachedLookup
  };
}
