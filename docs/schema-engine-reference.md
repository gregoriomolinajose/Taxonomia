# Referencia del Schema Engine (APP_SCHEMAS)

El objeto `APP_SCHEMAS` (ubicado en `src/Schema_Engine.gs`) es la **Única Fuente de Verdad (Single Source of Truth, SSoT)** de Taxonomía. Define cómo se comportan las entidades a nivel de UI, backend, base de datos (ETL) y Gobernanza (ABAC/Grafos).

A continuación, se detalla la estructura completa de configuración de una entidad:

---

## 1. Configuración de Raíz (Root Entity Configuration)

Al definir una nueva entidad (Ej. `Dominio`), estas son las propiedades globales configurables en la raíz de su objeto:

*   **`primaryKey`** _(string)_: El nombre del campo que actúa como llave primaria (`"id_dominio"`).
*   **`titleField`** _(string)_: El nombre del campo cuyo valor representa humanamente el registro (Ej. `"nombre_completo"` o `"n0_es"`). Se usa ampliamente en títulos, breadcrumbs y selects.
*   **`steps`** _(array de strings) (opcional)_: Si se define, el Modal de Creación/Edición en la UI se convertirá en un **Form Stepper (Wizard)** en lugar de un listado plano de secciones. Cada string dentro del arreglo corresponde estrictamente a un atributo `section` en los `fields`.

---

## 2. Bloque `metadata` (Comportamiento Base y UI)

Dicta cómo se representa la entidad de forma general visualizada a lo largo del sistema.

*   **`showInMenu`** _(boolean)_: `true` para hacer que aparezca en la barra de navegación lateral.
*   **`showInDashboard`** _(boolean)_: `true` para añadir un widget/tarjeta de acceso rápido en el Dashboard inicial.
*   **`order`** _(number)_: Orden de prioridad para la lista y el menú.
*   **`iconName`** _(string)_: Identificador del icono para Ionic (Ej. `"cube-outline"`, `"globe-outline"`).
*   **`color`** _(string)_: Token semántico de Ionic para colorear íconos o badges asociados (`"primary"`, `"secondary"`, `"tertiary"`, `"danger"`, `"warning"`, `"medium"`, `"dark"`).
*   **`label`** _(string)_: Nombre en plural amigable para la interfaz (Ej. `"Unidades de Negocio"`).
*   **`idField`** _(string)_: Clave en el objeto que denota su identificador propio (generalmente hace match con `primaryKey`).
*   **`fkField`** _(object | null)_: Usado para pintar agrupaciones o migas de pan cuando el registro depende estrictamente de un Padre estructurado simple (Relaciones 1:N no-grafo). Ejemplo: `{ key: 'id_portafolio', label: 'Portafolio' }`.

---

## 3. Bloque `topological_metadata` (Gobernanza ABAC)

Obligatorio si la entidad será gobernada por políticas Zero-Trust y Herencia de Grafo.

*   **`ownerFields`** _(array de strings)_: Identifica cuáles campos dentro de la tabla guardan IDs de personas (emails o identificadores), para reconocer a un registro como "OWNER". Útil para políticas `OWNER_ONLY`. Ejemplo: `["scrum_master_id", "product_owner_id"]`.
*   **`parentEntity`** _(string | null)_: La entidad Padre desde la que se pueden "_Heredar Permisos_". Si el usuario actual es dueño del Padre pero no de esta entidad, la jerarquía se cruza y otorga permiso de todos modos mediante la política Topológica de Seguridad OMR.
*   **`parentField`** _(string | null)_: Par fundamental de `parentEntity`; especifica qué campo local (`id_producto`, `id_portafolio`...) tiene la Foreign Key para enlazar al padre.

---

## 4. Bloque `topologyRules` (Gestor Temporal SCD-2 y Grafos Avanzados M:N)

Este bloque transforma a la entidad en un Nodo capaz de usar conectores cruzados y guardado resiliente en tablas M:N puras con versionamiento histórico.

*   **`topologyType`** _(string)_: `"JERARQUICA_ESTRICTA"` o `"FLAT"`. Define si el análisis del Grafo requiere validaciones matemáticas de niveles.
*   **`levelFiltering`** _(boolean)_: Restringe la creación de aristas solo entre estratos permitidos.
*   **`strictLevelJumps`** _(boolean)_: Si es `true`, un nodo Nivel 1 solo permite hijos Nivel 2 y previene saltarse niveles a Nivel 3.
*   **`rootRequiresNoParent`** _(boolean)_: Bloquea crearle un padre a un Nivel Root (0).
*   **`allowOrphanStealing`** _(boolean)_: Autoriza transferir de Padre a un hijo si dicho hijo ya tenía un ancestro previo.
*   **`maxDepth`** _(number)_: Límite profundo del sub-grafo.
*   **`deletionStrategy`** _(string)_: Política para borrado Topológico (De momento `ORPHAN` desvincula a los hijos y los deja flotantes de forma segura).
*   **`scd2Enabled`** _(boolean)_: `true` si todas las mutaciones sobre relaciones de esta entidad deben crear *snapshots* históricas bajo "Slowly Changing Dimensions".
*   **`preventCycles`** _(boolean)_: El guardado rechaza un padre si este produce una dependencia cíclica entre el ancestro N.

---

## 5. Matriz de Propiedades en `fields` (Formularios y Columnas)

Cada campo en el arreglo interactúa de forma simultánea como: una Columna en la Vistas del Sistema (Grid, Cards), y un Input nativo en las interfaces de Agregar o Editar.

### Propiedades Universales
*   **`name`** _(string)_: Nombre estricto de la columna en la tabla o Base de Datos.
*   **`type`** _(string)_: Tipado lógico que condiciona la tecnología a usar del Frontend. Valores válidos:
    *   `text`: Cajas de texto cortas.
    *   `textarea`: Párrafos con salto de línea.
    *   `number`: Inputs bloqueados solo a digitos y decimales.
    *   `select`: Dropdowns configurables.
    *   `hidden`: Campos que mantienen estado y guardan la entidad pero no interfieren o se muestran en el UI (excepto por la API/Grid de requerirse).
    *   `divider`: No envía Payload, exclusivamente pinta un espaciador o Header para agrupar campos.
    *   `relation`: Componente abstracto que dispara un Subgrid Complejo o MultiSelect para uniones nativas y M:N de Grafo temporal.
*   **`label`** _(string)_: Texto mostrado al usuario.
*   **`required`** _(boolean)_: Bloquea la opción de Guardar en caso de estar vacío para validación.
*   **`width`** _(number)_: Determina el tamaño en el Grid de Ionic (Escala 1 a 12). `6` es media pantalla, `12` es fila entera.
*   **`section`** _(string)_: Par vital para inyectarlo en Título de bloque (Ej. `"Datos Generales"`). Si `steps` existe en la raíz, moverá todo el campo hacia una pantalla específica del Wizard.
*   **`showInList`** _(boolean)_ *(default `true`)*: Establece en `false` para que los textos inmensos de `textarea` no deformen la Data Table.
*   **`primaryKey`** _(boolean)_: Identificador de Llave Primaria que no puede ser alterada por Edición común.
*   **`readonly`** _(boolean)_: Habilita pintar la información en los formularios pero protege sus propiedades contra interacciones.
*   **`defaultValue`** _(any)_: Inicializa con un estado específico sobre registros limpios o nuevos (Ej. `"Activo"`).
*   **`helpText`** _(string)_: Renderiza una leyenda aclaratoria gris e inferior para orientar al Usuario.

### Propiedades Específicas por Tipo
Para inputs estructurados tipo `select` (Drop-downs):
*   **`options`** _(array de strings)_: Arreglo *Hardcodeado* si son Opciones delimitadas al código (Ej. `["SaaS", "Marketplace"]`).
*   **`lookupSource`** _(string)_: Invoca vía asíncrona mediante JSON-RPC (`google.script.run`) la lista desde un handler de AppScript (Ej. `getPortafoliosOptions` o `getSysRolesOptions`). El framework poblará el select después de re-hidratarse al cargarse.

Para inputs tipo `relation` (M:N Temporal Graphs & Subgrids):
*   **`uiBehavior`** _(string)_: Generalmente configurado a `"subgrid"` a favor del Master-Detail modal window.
*   **`targetEntity`** _(string)_: Con qué Entidad choca (ej `"Dominio"`).
*   **`graphEntity`** _(string)_: Archivo central transitivo (Ej. `"Relacion_Dominios"`).
*   **`relationType`** _(string)_: Denota cardinalidad o tipo para la Edge Table `"padre"` o `"hijo"`.
*   **`topologyCardinality`** _(string)_: `"1:1"`, `"1:N"`, `"M:N"`. Ayuda al motor UI a determinar si se trata de un *Radio button set* (Única relación) o *Checkboxes* (Múltiple).
*   **`isTemporalGraph`** _(boolean)_: Si existe, obliga inyección de versionado (SCD-2) y borrado unidereccional.

---

## 6. Bloque `businessRules` (Disparadores Activos Frontend)

Permite computaciones matemáticas simples on-the-fly.
*   Ejemplo: `[{ trigger: 'onInput', action: 'sumPrefix', prefix: 'cant_', target: 'total_integrantes' }]`.
*   Al detectarse teclado (`onInput`), suma todos los inputs de clase `cant_*` y reemplaza un total readonly en `target`.
