# Reglas de Interfaz Gráfica y UX/UI (Frontend)

## 1. Arquitectura Frontend Mobile-First
- Aplicación de Arquitectura Híbrida (Capacitor-Ready) SPA.
- Apps Script solo funge como API/Servidor que inyecta la página; el UI está desacoplado.
- **Uso Estricto de Componentes Nativos:** Todo el DOM dinámico debe generarse usando Web Components de **Ionic (`<ion-input>`, `<ion-datetime>`)**.
- NUNCA inventes o construyas componentes visuales complejos desde cero si existe una alternativa oficial en el framework.

- **Precisión de Área Táctil (Hitboxes) y Event Bubbling:** En componentes compuestos como listas seleccionables (ej. `<ion-checkbox>` dentro de un `<ion-item>`), es OBLIGATORIO garantizar que la interacción funcione fluidamente ya sea que el usuario toque la fila completa o específicamente el recuadro del control. Se debe gestionar correctamente la propagación de eventos en el DOM (ej. delegando el clic al item o usando bindings nativos `ionChange`) para evitar que la interfaz se sienta rota o poco responsiva.

## 2. Progressive Disclosure (Wizards)
- PROHIBIDO renderizar formularios largos en una sola vista plana.
- Si el `APP_SCHEMAS` define la propiedad `steps`, el motor DEBE renderizar un componente de navegación paso a paso (Wizard) utilizando `<ion-stepper>` o `<ion-segment>`.
- **Ley de Navegación Activa (Steppers):** Todo componente visual que indique progreso o pasos (ej. `<ion-segment>`, `<ion-stepper>`) DEBE ser obligatoriamente clickeable e interactivo. El usuario DEBE poder saltar a cualquier paso (anterior o posterior) tocando el indicador directamente. Queda prohibido el uso de steppers puramente cosméticos o de solo lectura.

## 3. Diseño Responsivo Nativo (Grid)
- El layout DEBE construirse estrictamente sobre `<ion-grid>`, `<ion-row>` y `<ion-col>`.
- Todo input debe ser Mobile-First (`size="12"`). 
- Si el esquema define `width`, debe mapearse a breakpoints grandes (ej. `<ion-col size="12" size-md="6">`). 
- NUNCA uses CSS crudo para el layout.

## 4. Feedback Visual, Theming e Iconografía
- Toda operación de red DEBE bloquear la interfaz usando `<ion-loading>` o `<ion-spinner>`.
- El resultado de las operaciones DEBE comunicarse mediante un `<ion-toast>` nativo. NUNCA uses `alert()` nativo.
- DEBES usar los tokens de color nativos de Ionic (`primary`, `success`, etc.). NUNCA inyectes estilos CSS con colores "hardcoded".
- **Consistencia de Iconografía (Design System):** La familia oficial de glifos de la aplicación es la variante delineada (`-outline`) de Ionicons. NUNCA mezcles íconos sólidos (`-sharp` o por defecto) con íconos delineados, para mantener el mismo peso visual en toda la navegación e interfaz.

## 5. Navegación y Flujos de Vida CRUD (Routing)
- **Ley de Success Routing:** Todo evento de éxito al guardar o actualizar un registro DEBE destruir completamente el contenedor del formulario del DOM y retornar obligatoriamente a la vista de listado (`DataView_UI`).
- **Ley de Escape Routing:** Todo botón de retroceso (`<ion-back-button>`) o botón de "Cancelar" en las pantallas de creación/edición DEBE cancelar el flujo de forma segura, destruir el contenedor del formulario y retornar a la vista de listado (`DataView_UI`).
- **Ley de Visibilidad de la Llave Primaria (PK):** El campo definido como Llave Primaria (`primaryKey: true` o equivalente) JAMÁS debe ser ocultado en la cuadrícula de `DataView_UI`, incluso si en el esquema está marcado como `type: "hidden"`. Este campo es el ancla visual y obligatoria para que el usuario pueda acceder a la vista de edición.

## 6. Sincronización de Layout y Menús (Sidebar & Dashboard)
- **Ley de Jerarquía del Menú (Sidebar Index 0):** El ítem de navegación principal (`Inicio`, `Home` o `Dashboard`) es sagrado. DEBE ser siempre el primer elemento (Índice 0 absoluto) en la barra de navegación lateral. Ninguna entidad nueva, sin importar su nivel en la taxonomía, puede desplazar al Inicio de la parte superior.
- **Ley de Sincronización del Dashboard (Cards):** Toda nueva entidad principal (CRUD) que se agregue al menú lateral DEBE tener obligatoriamente su representación visual equivalente en el panel de Inicio (Dashboard Principal). 
- **Ley de Simetría Responsiva:** Al agregar una nueva tarjeta al Dashboard, el desarrollador o agente DEBE recalcular el Grid responsivo (`<ion-col>`) para asegurar que el diseño se mantenga simétrico (por ejemplo, pasar de tercios `size-xl="4"` a cuartos `size-xl="3"` si se tienen 4 tarjetas).

## 7. Formateo de Cadenas y Nomenclatura (Anti-Snake-Case Bleeding)
- **Ley de Presentación de Entidades:** NUNCA expongas las llaves crudas de la base de datos (ej. `Unidad_Negocio`, `snake_case`) en la interfaz gráfica.
- **Saneamiento Obligatorio:** Todo título principal, subtítulo de tabla, texto de botón de acción (ej. "+ Crear...") o mensaje de alerta (Toast) que se genere dinámicamente a partir de la llave del esquema, DEBE pasar por una función utilitaria de formateo.
- **Regla de Transformación:** El formateador debe reemplazar todos los guiones bajos (`_`) por espacios en blanco (` `) para que el usuario final siempre lea lenguaje natural y corporativo (ej. transformar `Unidad_Negocio` a `Unidad de Negocio`).

## 8. Determinismo de Navegación y Estados Vacíos (Empty States)
- **Ley de Navegación Determinista:** El orden de renderizado de los elementos en el menú lateral (Sidebar) NO DEBE depender del orden de iteración de las llaves del objeto de base de datos (`Object.keys()`). El motor de UI DEBE contar con una configuración explícita (un arreglo de ordenamiento o una propiedad `order` en el esquema) que garantice que la jerarquía del modelo de negocio (ej. Inicio > Unidades > Portafolios > Grupos > Productos) se mantenga inmutable y estática.
- **Ley de Estados Vacíos (Empty States) Nativos:** Queda ESTRICTAMENTE PROHIBIDO el uso de imágenes (`<img>`), SVGs personalizados o ilustraciones de terceros para representar pantallas sin datos (ej. "Sin resultados"). Todo Empty State DEBE construirse utilizando componentes nativos: un `<ion-icon>` de la familia `-outline` (ej. `folder-open-outline`), un título `<ion-text>` y un subtítulo, respetando la paleta de colores del Design System (ej. `color="medium"`).
- **Alcance Global del Saneamiento de Strings:** La regla Anti-Snake-Case (Sección 7) no solo aplica al contenedor principal. Aplica de manera global y absoluta a TODOS los nodos de texto dinámicos, incluyendo la barra superior de navegación (Navbar/Header), migas de pan (Breadcrumbs) y tooltips.

## 9. Integridad de Referencias de Entidad (Click-to-Edit)
- **Ley de Match de Esquema:** El motor de UI NUNCA debe hardcodear nombres de entidades en las funciones de edición. Toda llamada a `openEditForm` debe usar la referencia dinámica del esquema.
- **Validación de Existencia:** Antes de intentar leer propiedades como `idField` o `steps`, el motor DEBE validar que el objeto de configuración de la entidad no sea `null` o `undefined`, lanzando un error controlado y descriptivo en lugar de un TypeError genérico.

## 10. Prohibición de Feedback Nativo y Uso del Sistema de Diseño
- **Ley de la Coherencia Visual:** Queda terminantemente PROHIBIDO el uso de mecanismos de interacción nativos del navegador como `window.alert()`, `window.prompt()`, `window.confirm()` o diálogos modales nativos de HtmlService (`createTemplateFromFile`).
- **Uso de Componentes Ionic/Material:** Toda interacción que requiera feedback (Alertas), confirmación o entrada rápida de datos (Inputs rápidos) DEBE utilizar exclusivamente los componentes del framework de UI (ej. `ion-modal`, `ion-alert`, `ion-popover`). 
- **Validación QA:** Cualquier interfaz que presente un diálogo nativo será rechazada automáticamente en la fase de control de calidad.
