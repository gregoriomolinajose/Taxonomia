# Epic Brief: E58 Asignación de Roles por Entidad

## Hypothesis
Permitir la asignación de roles a nivel de cada una de las entidades principales (Unidad de Negocio, Value Stream, Portafolio, Grupo de Producto, Equipo) mejorará la gobernanza, el control de accesos (ABAC) y la claridad en las responsabilidades operativas dentro del modelo jerárquico.

## Success Metrics
- Capacidad de asignar uno o múltiples roles específicos a las entidades jerárquicas desde la interfaz de usuario.
- Los metadatos de roles asociados se guardan correctamente en las relaciones del grafo o en las propiedades de las entidades.
- Las consultas de contexto devuelven correctamente los roles asociados a cada nivel.

## Appetite
- **Time:** 1-2 semanas
- **Team:** 1 Developer

## Rabbit Holes
- No modificar el modelo de Control de Acceso Basado en Atributos (ABAC) general sin justificación, la épica se centra en la *asignación* a nivel de datos y UI.
- Evitar crear esquemas nuevos si se pueden usar relaciones estandarizadas de grafo (`Sys_Graph_Edges`) para asociar personas/roles a las entidades.
