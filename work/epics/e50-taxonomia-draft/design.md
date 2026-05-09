# Epic Design: E50 Taxonomía Draft & Role Architecture

## Architecture Overview
La épica introduce el patrón de "Event Sourcing / Draft Payload" en la entidad `Taxonomía`. En lugar de insertar relaciones directamente al motor global (`Sys_Graph_Edges`) durante la navegación del Wizard, las selecciones de roles y asociaciones M:N se serializan y se guardan como un gran objeto JSON en la columna `aristas_borrador` del registro de la Taxonomía.

El ciclo de vida del Borrador es:
1. **Edición:** El FormStepper lee y escribe localmente (JSON Payload). Los `TXSearchable` se alimentan de esta memoria virtual.
2. **Aprobación:** Un administrador autoriza la Taxonomía. Un proceso ETL ("Approval Hook") extrae las relaciones del JSON y las inyecta como registros atómicos en `Sys_Graph_Edges`.
3. **Consolidación:** El JSON puede ser purgado (o archivado), y el sistema pasa a leer el grafo activo global con el contexto `Taxonomia_Id`.

## Technical Contracts & Interfaces

### 1. Rol Entity Extension
En `Schema_Engine.js`:
Entidad `Sys_Roles` (o similar): Agregar el campo de clasificación.
```javascript
{ name: "especialidad", type: "select", options: ["TI", "Negocio", "Producto", "Agilidad"], label: "Área de Gestión / Especialidad", width: 6 }
```

### 2. Taxonomía Payload Schema
La entidad `Taxonomía` necesita un campo de texto/JSON para guardar el borrador:
```javascript
{ name: "aristas_borrador", type: "textarea", uiBehavior: "hidden", validators: ["json"] }
```

El formato interno del JSON propuesto sería:
```json
{
  "versiones_relaciones": [
    { "origen": "ID_PERSONA", "destino": "ID_TAXONOMIA", "tipo_relacion": "ID_ROL_HEAD_TI" },
    { "origen": "ID_UNIDAD", "destino": "ID_PORTAFOLIO", "tipo_relacion": "UNIDAD_PORTAFOLIO" }
  ]
}
```

### 3. Modificación del TXSearchable
El componente `UI_Component_TXSearchable.client.js` deberá recibir una prop `mockGraphPayload` o `draftMode = true` para que, al calcular el método `_resolveSubtitle` y el listado de elementos pre-seleccionados, busque en el objeto de estado de React/FormStepper local en lugar de consultar a `window.Graph_Utils`.

### 4. Flujo de Aprobación (ETL Hook)
El botón de aprobar ejecutará algo similar a:
```javascript
function aprobarBorradorTaxonomia(taxonomiaId, draftJson) {
  // 1. Limpiar aristas viejas (Opcional, si estamos sobreescribiendo)
  // 2. Por cada arista en draftJson:
  //      Validar que nodos origen y destino existan
  //      Insertar en Sys_Graph_Edges
  // 3. Limpiar campo aristas_borrador en BD
}
```

## Gemba & Known Constraints
- **Fuga de abstracción del Datastore**: Al reescribir la capa de persistencia del Wizard, debemos tener cuidado de no afectar el componente estándar `SubgridBuilder` que asume que todo lee del Datastore.
- La aprobación masiva requiere manejo de Batch (o varias llamadas síncronas/transaccionales) para evitar latencia extrema.
