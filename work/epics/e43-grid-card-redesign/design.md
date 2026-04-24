# Epic E43: Arquitectura y Diseño Técnico (Grid Card Redesign)

## Componentes Objetivo (Target Components)
- `src/UI_DataGrid.client.js` -> Función `_renderGridView` y helper `_buildEdgeMemo`.
- `src/CSS_DataView.html` -> Base gráfica y composición Flexbox en el grid.

## Key Contracts
1. **Memoization de Relaciones**:
   El contrato dictamina que `_buildEdgeMemo()` devolverá una nueva llave en su objeto `memo.padreToMultiHijos[pKey]` como un array de Strings `[id_hijo1, id_hijo2]` de manera que el Card pueda leer su `.length` eficientemente en memoria (JIT).
2. **Metadata Topológica**:
   Dependeremos estrictamente del esquema dictado en `APP_SCHEMAS[entityName].fields` (isTemporalGraph=true) para renderizar dinámicamente cuántas relaciones "Padre" e "Hijo" tiene cada Entidad e inyectar su respectivo icono base según la metainformación `f.targetEntity.metadata.iconName`.
