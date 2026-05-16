# Epic Design: E50 Taxonomía Draft & Role Architecture

## Architecture Overview
La épica introduce el patrón de "Contextual Graph Versioning". En lugar de aislar los borradores en un payload JSON cerrado, utilizamos el motor global `Sys_Graph_Edges` pero agregamos semántica de versionamiento mediante dos atributos: `estado` y `contexto_id`.

El ciclo de vida del Borrador es:
1. **Edición:** El FormStepper lee y escribe directamente a la Base de Datos. Cada arista creada en el Wizard inyecta `estado = 'Borrador'` y `contexto_id = ID_TAXONOMIA`.
2. **Aislamiento Nativo:** `JS_GraphUtils` (el singleton de memoria introducido en E49) filtra por defecto cualquier arista que tenga `estado = 'Borrador'`. Por ende, el resto de la empresa (módulos de Agilidad, Portafolios) nunca ve este borrador.
3. **Aprobación:** Un administrador autoriza la Taxonomía. Un proceso simple ejecuta un `UPDATE Sys_Graph_Edges SET estado = 'Activo' WHERE contexto_id = ID_TAXONOMIA`. Instantáneamente, la estructura organizacional entra en vigencia en toda la empresa.

## Technical Contracts & Interfaces

### 1. Extensión de Entidades
En `Schema_Engine.js`:
**Sys_Roles:**
```javascript
{ name: "especialidad", type: "select", options: ["TI", "Negocio", "Producto", "Agilidad"], label: "Área de Gestión / Especialidad", width: 6 }
```

**Sys_Graph_Edges:**
```javascript
{ name: "contexto_id", type: "text", required: false, label: "ID Contexto/Borrador", showInList: false }
```

### 2. Modificación de JS_GraphUtils
El motor O(1) de resolución de relaciones (`resolveAllLinkedIds`) debe excluir silenciosamente los borradores:
```javascript
// Si status === 'Borrador', no se inyecta en byDestino/byOrigen.
// Excepto si se le pasa un flag explícito includeDraftsContext = 'TAX-1'
```

### 3. Modificación del Wizard y TXSearchable
En los interceptores del Wizard o en `SubgridState.js`, al invocar la creación de la arista, se inyectarán los defaults:
```json
{
  "estado": "Borrador",
  "contexto_id": "TAX-123"
}
```
Y para la hidratación visual, `TXSearchable` pasará el flag de contexto a `GraphUtils`.

### 4. Geometría de Roles
Para evitar el problema de "Persona -> Rol" descontextualizado, las aristas en el Wizard se crearán con apuntado específico al objeto gobernado:
- **Caso Directorios Generales:** Padre: `Persona`, Hijo: `Taxonomía`
- **Caso Nodos Específicos (Ej. Product Manager):** Padre: `Persona`, Hijo: `Grupo_Producto` o `Dominio`.
- En todos los casos se inyecta:
  - Tipo de Relación: `ID_ROL` (Ej: `ROLE-4`)
  - Estado: `Borrador`
  - Contexto: `TAX-123`

## Ventajas
- No hay límites de tamaño (soporta taxonomías de 10,000 nodos).
- Concurrencia segura: Dos usuarios pueden agregar aristas simultáneamente.
- Simplicidad: Aprovecha el motor `Graph_Utils` ya construido, evitando escribir un motor de hidratación JSON paralelo.
