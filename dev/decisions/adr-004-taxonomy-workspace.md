# ADR-004: Taxonomía como Contexto de Trabajo (Workspace)

## Contexto
Históricamente, el `FormRenderer_UI` y el `UI_FormSubmitter` asumen que cualquier relación (arista) configurada en el `Schema_Engine` tiene al registro actual (ej. la Taxonomía) como el nodo Padre o el nodo Hijo.
Sin embargo, el negocio requiere que la Taxonomía no sea parte de la arquitectura del organigrama, sino un *espacio de trabajo* (lente) donde se estructuren relaciones puras (ej. `Rol` -> `Persona`, `Equipo` -> `Persona`).

## Decisión
Convertiremos la entidad `Taxonomia` en un **Bounded Context** (Workspace) topológico. 
1. Se añadirá soporte en el `Schema_Engine` para definir relaciones tripartitas en el UI usando las propiedades `workspaceMode: true` y `fixedParentId` (ej. el ID estático del Rol).
2. Cuando el `UI_FormSubmitter` detecte `workspaceMode`, guardará la arista asignando `id_nodo_padre` al `fixedParentId`, `id_nodo_hijo` al registro seleccionado, y la `Taxonomia` será empujada **exclusivamente al campo `contexto_id`**.
3. Los componentes de lectura (`TXSearchable`, `RelationBuilder`, `SubgridBuilder`) deberán modificarse para que, si el esquema es `workspaceMode`, filtren las aristas usando `contexto_id` y `fixedParentId`, en lugar de asumir que la `Taxonomia` es el padre.

## Consecuencias
*   **Positivas:** Permite la reutilización limpia de nodos maestros (Roles, Equipos) en múltiples Taxonomías simultáneas sin contaminar el grafo universal ni crear hiper-aristas complejas. La Taxonomía se convierte en un verdadero proyecto/escenario.
*   **Negativas:** Aumenta la complejidad del motor de UI y de los constructores de consultas del cliente, ya que ahora deben manejar dos paradigmas de renderizado de aristas (Bipartito clásico vs Tripartito/Workspace).
