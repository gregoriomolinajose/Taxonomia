# E43: Data Grid Card UI Redesign

**Objective:** Mejorar el diseño de las "cards" en el layout grid, para representar de un vistazo los datos lexicológicos, topológicos (grafos padre/hijos) y botones de acción rápida.

### In Scope
- Implementación de un **badge circular** principal, con el icono variable de cada entidad.
- Presentar el ID ("Lexical ID") y el el **Nombre** del registro estructurados en 2 líneas al lado del badge.
- Si hay un grafo **Single Select Padre**, añadir icono y nombre del registro asociado (Ej: Icono + "Cobranza").
- Si hay un grafo **Multi Select Hijos**, agregar icono, nombre de la entidad y total de registros relacionados (Ej: Icono + "5 Productos").
- Agregar el menú de 3 puntos en la esquina superior derecha con la opción "Eliminar" conectada al ciclo de vida existente.

### Out of Scope
- Alteración de la carga en base de datos o el motor core.
- Alteraciones en la "Vista Tabla" ni el formulario interior del registro, esto ataca estrictamente al Grid Layout.

### Planned Stories
- [x] **S43.1**: Refactorización de UX en Dataview Cuadrícula: Eliminar paginador, lazy load, botón basura (Ex-S42.2).
- [x] **S43.2**: Refinamiento Premium UX Grid: Nuevo Flex Header nativo, Back-to-Top, y Tokens de CSS Puro (Ex-S42.3).
- [ ] **S43.3**: Solución a desbordamientos de contenido en las tarjetas (Nombres largos, insignias de Lider/Cargo y textos descriptivos).

### Done Criteria
- [x] La UI concuerda con las especificaciones de diseño dadas por el requerimiento (Badge, 2-line title, 3 dot menu).
- [x] Los grafos tipo "padre" y tipo "hijos" se muestran acorde a su metadata jerárquica con los respectivos nombres e íconos.
- [x] El menú de opciones permite eliminar el registro expuesto sin necesidad de abrir el form.
