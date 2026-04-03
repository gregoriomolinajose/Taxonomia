# Epic Design: E21 Next-Gen MDM data Layer

## 1. What & Why
- **Problem**: La plataforma SPA actualmente es vulnerable a *Race Conditions* o "Last Writer Wins" si dos usuarios modifican la misma entidad al mismo tiempo. Adicionalmente, consultas largas o pesadas pueden congelar la interfaz al teclear (sin Typeahead/Debounce).
- **Value**: Concurrencia segura. Usuarios pueden colaborar en los diccionarios taxonómicos sin temor a mutacion asimétrica. Búsquedas rápidas y responsivas, e integridad topológica (nada se borra permanentemente rompiendo links foráneos).

## 2. Approach

### A. Optimistic Locking ($O(1)$ Hash)
- **Mecanismo**: Añadir un campo `_version` numérico oculto o hash en metadata a cada entidad cuando se entrega al Frontend.
- **Flujo**: Al momento de `Engine_DB.updateData()`, el Backend corrobora que la versión entrante coincide con la almacenada. Si difiere = `409 Conflict`.
- **Frontend**: El `FormEngine` debe atrapar `OptimisticLockError` y detener el cierre del SlideOverlay, ofertando un refresco de base.

### B. Asynchronous Typeahead (Debouncing)
- **Mecanismo**: Añadir `window.AppEventBus.debounce(identifier, delay, callback)` o similar, asegurando que cuando el usuario escriba en el buscador principal (`UI_DataGrid`), las llamadas asíncronas no saturen la RAM.
- **Inyección**: En `DataGrid.html` y Componentes `subgrid-multiselect`.

### C. Soft-Delete
- **Mecanismo**: Las llamadas a `Engine_DB.deleteData()` en lugar de remover la llave `obj` del cache de Cloud, establecerán un `metadata.isDeleted = true`.
- **Filtros**: El `Engine_DB.listData()` aplicará por defecto un exclude en `isDeleted`, excepto si el Front pide flag de `includeDeleted=true`.

### D. QA Refactoring
- **Mecanismo**: Buscar de forma iterativa todas las uniones literales `"Cadena " + obj.param + "..."` cambiándolas a `` `Cadena ${obj.param}...` ``. Refinar los tests del pipeline que no tienen aserciones comprobatorias reales.

## 3. Architecture Context
- **Affected Domain**: Capa Backend en `Engine_DB.gs` y Capa UI en `UI_DataGrid.html` / `FormEngine_UI.html`.
- **Dependencies**: La UI depende estructuralmente de `Engine_DB`, el cambio del Lock debe ser Backward Compatible. Entidades antiguas sin `_version` deben recibir un `1` predeterminado al primer update.

## 4. Acceptance Criteria
1. Backend bloquea y lanza throw especifico cuando las versiones no coinciden.
2. Interfaz gráfica (`FormSubmitter`) pinta mensaje amigable de colisión y frena.
3. El buscador central y subgrids tienen un retardo de ~300ms inteligente antes de re-paginar.
4. Topología preservada: Entidades "eliminadas" solo se marcan inactivas en la base de datos subyacente.
