function clearProjectCache() {
  const cache = CacheService.getScriptCache();
  const vHash = typeof _getAppVersionHash === 'function' ? _getAppVersionHash() : 'V0';

  const entities = ['Portafolio', 'Grupo_Productos', 'Producto', 'Unidad_Negocio', 'Equipo', 'Persona', 'Sys_Permissions'];
  entities.forEach(ent => {
    cache.remove('CACHE_LIST_' + ent);
    cache.remove(`CACHE_LIST_${vHash}_${ent}`);
    const lookupMap = {
      'Portafolio': 'getPortafoliosOptions',
      'Grupo_Productos': 'getGruposProductosOptions',
      'Producto': 'getProductosOptions',
      'Unidad_Negocio': 'getUnidadesNegocioOptions',
      'Equipo': 'getEquiposOptions',
      'Persona': 'getPersonasOptions'
    };
    if (lookupMap[ent]) cache.remove('CACHE_LOOKUP_' + lookupMap[ent]);
  });
  Logger.log('Caché del proyecto limpiada correctamente.');
}
