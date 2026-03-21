function clearProjectCache() {
  const cache = CacheService.getScriptCache();
  const entities = ['Portafolio', 'Grupo_Productos', 'Producto', 'Unidad_Negocio'];
  entities.forEach(ent => {
    cache.remove('CACHE_LIST_' + ent);
    const lookupMap = {
      'Portafolio': 'getPortafoliosOptions',
      'Grupo_Productos': 'getGruposProductosOptions',
      'Producto': 'getProductosOptions'
    };
    if (lookupMap[ent]) cache.remove('CACHE_LOOKUP_' + lookupMap[ent]);
  });
  Logger.log('Caché del proyecto limpiada correctamente.');
}
