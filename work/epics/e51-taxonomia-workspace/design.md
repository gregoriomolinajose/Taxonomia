# Epic 51: Diseño de Arquitectura (Workspace Mode)

## 1. System Context
Esta épica introduce el concepto de relaciones "Tripartitas" o "Workspace Mode" dentro del ecosistema de UI de la Taxonomía. Impacta al Frontend (renderización de formularios y guardado) pero mantiene intacto el Backend (la estructura de `Sys_Graph_Edges` y las APIs genéricas), simplemente usando las columnas existentes (`id_nodo_padre`, `id_nodo_hijo`, `contexto_id`) de una forma nueva.

## 2. Key Components Changed

### `Schema_Engine.js`
*   **Modificación:** Se permitirá declarar en los campos de tipo `relation` dos nuevas propiedades opcionales:
    *   `workspaceMode: true` (activa la lógica tripartita).
    *   `fixedParentId: "ROLE-16"` (el ID absoluto del Nodo Padre verdadero, que el usuario no elige, sino que está implícito en el campo).

### `UI_FormSubmitter.client.js`
*   **Modificación:** En el recolector de payload (cuando detecta un campo `searchable_multi` / grafo temporal), verificará si el esquema de ese campo tiene `workspaceMode: true`.
    *   Si es normal: `id_nodo_padre` = `[ID_TAXONOMIA]`, `contexto_id` = `[ID_TAXONOMIA]`.
    *   Si es workspaceMode: `id_nodo_padre` = `fixedParentId`, `contexto_id` = `[ID_TAXONOMIA]`.

### `UI_Component_RelationBuilder.client.js` (y constructores relacionados)
*   **Modificación:** Durante la pre-hidratación (cuando se lee `DataStore.get(graphEntity)` para pintar los elementos seleccionados al abrir el modal):
    *   Si es normal: filtra por `id_nodo_padre === currentPK` (Taxonomía).
    *   Si es workspaceMode: filtra por `id_nodo_padre === fixedParentId` **AND** `contexto_id === currentPK` (Taxonomía).

## 3. Data Contracts
No cambian las firmas de los endpoints de `API_Universal`. El payload JSON generado por el cliente simplemente enviará el `id_nodo_padre` alterado:

```json
{
  "module": "Sys_Graph_Edges",
  "action": "create",
  "data": {
    "id_nodo_padre": "ROLE-16",
    "id_nodo_hijo": "PERS-1",
    "tipo_relacion": "PERSONA_ROL",
    "estado": "Borrador",
    "contexto_id": "TAX-123"
  }
}
```

## 4. Gemba (Developer Execution Notes)
1. **Comprobar `UI_SubgridBuilder.client.js`:** Las sub-grillas de momento no usan `workspaceMode`, pero vale la pena verificar que la hidratación no se rompa por no declarar explícitamente el flag.
2. **Backward Compatibility:** Si `workspaceMode` no está definido en un campo, el sistema debe funcionar exactamente como lo hacía en la E50.
3. **El campo de la BD `contexto_id`:** Ya fue aprovisionado en la Epic 50, por lo que no requerimos scripts de base de datos.
