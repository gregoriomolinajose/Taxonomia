# Reglas de Interfaz Gráfica y UX/UI (Frontend)
**Proyecto:** Taxonomía  
**Estándar:** Enterprise / Ionic Framework (Mobile-First)

---

## 1. Arquitectura Frontend y Sistema de Diseño (Two-Tier Tokens)
- **SPA Híbrida:** Apps Script solo funge como API/Servidor que inyecta la página; el UI está desacoplado.
- **Componentes Nativos:** Todo el DOM dinámico debe generarse usando Web Components de Ionic (`<ion-input>`, etc.). NUNCA inventes componentes visuales desde cero si existe alternativa oficial.
- **Arquitectura de Tokens (SSOT):** Los colores se rigen por Dos Niveles en el `:root`. El Nivel 1 contiene los Brand Tokens del cliente (inmutables). El Nivel 2 mapea las variables nativas de Ionic hacia el Nivel 1.
- **Cero Fugas Semánticas (Zero Hardcoding):** PROHIBIDO forzar colores en el HTML (ej. `color="light"`, `style="color: blue"`). Textos y fondos DEBEN heredar su color del motor CSS (Modos Claro/Oscuro).
- **Tipografía Fluida:** El escalado tipográfico se controla mediante variables `--sys-font-*` que mutan basándose en Breakpoints (Mobile First por defecto, escalando en `>= 768px`).
- **Hitboxes:** En componentes compuestos (ej. listas seleccionables), es OBLIGATORIO garantizar un área táctil fluida y gestionar la propagación de eventos (`ionChange`).
- **Prohibición de JS Inline Styles:** El JavaScript tiene prohibido inyectar propiedades `style` físicas (ej. colores, márgenes) en el DOM. El JS debe limitarse a conmutar clases semánticas (ej. `.active`, `.is-hidden`), delegando la resolución visual pura al archivo `CSS_DesignSystem`.

## 2. Progressive Disclosure (Wizards) y Anclaje de Acciones
- **Desglose Cognitivo:** PROHIBIDO renderizar formularios largos en una vista plana. Si hay `steps`, el motor DEBE renderizar un Wizard (`<ion-segment>` o `<ion-stepper>`). Todo componente visual de progreso DEBE ser interactivo.
- **Ley de Anclaje de Acciones (Sticky Footer):** Los botones de mutación ("Guardar", "Siguiente", "Atrás", "Cancelar") NUNCA deben vivir dentro del flujo de scroll (`<ion-content>`). DEBEN estar aislados y anclados en la base de la pantalla utilizando estrictamente `<ion-footer>`.

## 3. Diseño Responsivo Nativo (Grid) y Patrón Bento Box
- **Estructura Base:** El layout DEBE construirse sobre `<ion-grid>`, `<ion-row>` y `<ion-col>`. Todo input debe ser Mobile-First (`size="12"`). NUNCA uses CSS crudo para el layout.
- **Protección de Cunetas (Gutter Preservation):** PROHIBIDO usar la clase `ion-no-padding` en contenedores `<ion-grid>` que alojen tarjetas o campos de formulario. El espaciado DEBE calcularse por el motor de Ionic (`--ion-grid-column-padding`).
- **Estructura Bento Box:** Para asimetría sin colisiones, el grid define la separación, y las tarjetas (`<ion-card>`) absorben el tamaño exacto configurando `margin: 0 !important; width: 100%; height: 100%;`.
- **Amortiguación Vertical de Grid:** Queda prohibido aplicar `margin-bottom` a las etiquetas `<ion-row>`. El espaciado vertical debe gestionarse internamente mediante `padding-bottom` en los contenedores `<ion-col>`.

## 4. Feedback Visual e Iconografía
- Toda operación de red DEBE bloquear la interfaz usando `<ion-loading>` o `<ion-spinner>`.
- El resultado de las operaciones DEBE comunicarse mediante `<ion-toast>` nativo.
- **Consistencia de Iconografía:** La familia oficial de glifos es la variante delineada (`-outline`) de Ionicons. NUNCA mezcles íconos sólidos con delineados.

## 5. Navegación y Flujos de Vida CRUD (Routing)
- **Success Routing:** Todo evento de éxito al guardar/actualizar DEBE destruir el contenedor del formulario del DOM y retornar a la vista de listado (`DataView_UI`).
- **Escape Routing:** Todo botón de retroceso/cancelar DEBE cancelar el flujo de forma segura, destruir el contenedor y retornar a `DataView_UI`.
- **Visibilidad de PK:** El campo Llave Primaria JAMÁS debe ser ocultado en la cuadrícula de `DataView_UI`, incluso si es `type: "hidden"`. Es el ancla visual para acceder a la edición.

## 6. Sincronización de Layout y Menús (Sidebar & Dashboard)
- **Jerarquía del Menú (Index 0):** El ítem `Inicio` / `Dashboard` es sagrado. DEBE ser siempre el primer elemento absoluto en la navegación.
- **Sincronización del Dashboard:** Toda nueva entidad CRUD en el menú DEBE tener su representación visual equivalente en el Dashboard Principal.
- **Simetría Responsiva:** Al agregar tarjetas al Dashboard, se DEBE recalcular el Grid responsivo para mantener la simetría (ej. de tercios a cuartos).

## 7. Formateo de Cadenas (Anti-Snake-Case Bleeding)
- **Saneamiento Obligatorio:** NUNCA expongas llaves crudas de BD (ej. `Unidad_Negocio`) en la UI.
- Todo título, subtítulo, botón o alerta generado por esquema DEBE pasar por un formateador que reemplace guiones bajos (`_`) por espacios, presentando lenguaje natural corporativo.

## 8. Determinismo y Estados Vacíos (Empty States)
- **Navegación Determinista:** El orden del menú NO DEBE depender de `Object.keys()`. Se DEBE usar una configuración explícita (`order` en esquema) para garantizar una jerarquía inmutable.
- **Empty States Nativos:** PROHIBIDO usar imágenes, SVGs o ilustraciones externas para "Sin resultados". DEBEN construirse con componentes nativos: `<ion-icon>` outline, título y subtítulo `<ion-text>` respetando la paleta de colores.
- **Alcance Global del Saneamiento:** La regla Anti-Snake-Case aplica a TODOS los nodos de texto dinámicos (Navbar, Breadcrumbs, Tooltips).

## 9. Integridad de Referencias de Entidad (Click-to-Edit)
- **Match de Esquema:** NUNCA hardcodear nombres de entidades en funciones de edición. Toda llamada a `openEditForm` debe usar la referencia dinámica.
- **Validación de Existencia:** Antes de leer propiedades de esquema, el motor DEBE validar que el objeto no sea `null`/`undefined`, lanzando errores descriptivos.

## 10. Prohibición de Feedback Nativo (Alert/Confirm)
- **Coherencia Visual:** PROHIBIDO el uso de `window.alert()`, `window.prompt()`, `window.confirm()` o modales nativos de HtmlService.
- Toda interacción de feedback o confirmación DEBE usar componentes Ionic (`ion-modal`, `ion-alert`). Interfaces con diálogos nativos serán rechazadas en QA.

## 11. Manipulación del DOM y Lectura JIT
- **Prohibición de Nodos Fantasma:** PROHIBIDO capturar referencias a inputs del DOM en variables globales o closures fuera del evento de acción.
- **Lectura Just-In-Time (JIT):** Toda recolección de Payload DEBE realizarse consultando el contenedor activo en el milisegundo exacto del clic.
- **Destrucción y Reset:** Al completar/cancelar un flujo, el contenedor DEBE forzar la limpieza de su estado interno y DOM (Anti-Stale State) para que nazca como un lienzo en blanco la próxima vez.

## 12. Versionado Estricto y Trazabilidad Visual
- **Visibilidad Obligatoria:** La UI DEBE mostrar siempre la versión y build actual (ej. `v1.0.0 - Build 260325.1030`).
- **Inyección Dinámica:** PROHIBIDO hardcodear la versión en HTML. DEBE inyectarse dinámicamente desde el Backend (ej. `<?= APP_VERSION ?>`).
- **Actualización por Despliegue:** CADA VEZ que el agente complete un feature, arregle un bug o solicite un despliegue (`clasp push`), DEBE actualizar el Patch o Timestamp en la configuración para que QA mitigue falsos positivos por caché.

## 13. Arquitectura Estricta del Menú Lateral (3-State Sidebar)
- **Blindaje de Viewport:** El colapso a "Mini" (72px) o "Hidden" SOLO aplica en `min-width: 992px`. En móvil, opera como Drawer nativo.
- **Esqueleto Elástico:** Botones (`.nav-item`) sin ancho fijo base; usan `width: calc(100% - Xpx)`. En "Mini", mutan a cubo con `flex-direction: column`.
- **Encapsulamiento DOM:** Solo se permite `.nav-item` con `<ion-icon>` y `<ion-label>`. Cero nodos huérfanos.
- **Cabeceras Metamórficas:** `.sidebar-heading` colapsa visualmente a una línea divisoria de 1px en estado Mini.
- **Accesibilidad Nativa:** Se usa el atributo `title` en el contenedor en lugar de `<ion-tooltip>` para evitar fallos de hidratación.

## 14. Modularización en Google Apps Script (Separation of Concerns)

Para evitar que el archivo principal de la interfaz (`Index.html`) se convierta en un monolito inmanejable, el código Frontend DEBE separarse estrictamente utilizando el patrón de inyección de recursos (Scriptlets de GAS). Queda PROHIBIDO colocar grandes bloques de CSS o lógica JavaScript de negocio directamente en el archivo base.

### 14.1. Taxonomía de Archivos Frontend
El código DEBE fragmentarse en archivos HTML que actúen como módulos puros, inyectados mediante `<?!= include('NombreArchivo'); ?>`:

* **`CSS_DesignSystem.html`:** Archivo EXCLUSIVO para almacenar la Arquitectura de Tokens (Nivel 1 y 2), la Tipografía Fluida y las variables nativas del tema.
* **`CSS_Layout.html` (o `CSS_App.html`):** Archivo exclusivo para las clases estructurales (Sidebar, Bento Box, utilidades de márgenes).
* **`JS_Core.html`:** Archivo que contiene el motor de estado del Menú Lateral (`initSidebar`, etc.) y las funciones utilitarias globales (Toasts, Loaders).
* **`Index.html` (Shell):** Es el orquestador. Solo debe contener la estructura del DOM (`<ion-app>`, `<ion-split-pane>`) y las llamadas a los `includes`.

### 14.2. Gobernanza de Z-Index (Stacking Context)
Debido a la naturaleza modular del menú colapsable, los footers estáticos y los componentes de retroalimentación, se prohíbe el uso de `z-index` arbitrarios (ej. `z-index: 99999;`). El ecosistema se rige por esta escala absoluta:
* `z-index: 10` - Sticky Footers (`<ion-footer>`).
* `z-index: 50` - Overlay del Sidebar en versión móvil.
* `z-index: 100` - Modales (`<ion-modal>`).
* `z-index: 9999` - Sistema de Toasts y Loaders (Máxima prioridad visual).

## 15. Renderizado Híbrido (Metadatos vs Datos de Negocio)
- **Metadatos vs Datos de Negocio:** Variables críticas de cache y build (ej. `APP_VERSION`) deben inyectarse mediante Scriptlets estáticos del servidor (`<?= ?>`) en el orquestador principal para el First Contentful Paint. La lógica de negocio y esquemas pesados (ej. `APP_SCHEMAS`) se hidratan en el cliente vía JS asíncrono o variables globales de estado.

## 16. Regla UI §15 (Single Source of Truth & Zero Hardcoding)
- **Auditoría Obligatoria (Design System First):** Antes de proponer o escribir cualquier bloque de CSS o estilo en línea, tienes la obligación absoluta de leer el archivo `CSS_DesignSystem.html`.
- **Mapeado de Tokens (Strict Matching):** Todo color, margen, padding, sombra, tipografía o radio de borde DEBE estar mapeado a un token existente (ej. `var(--spacing-4)`, `var(--rounded-md)`, `var(--color-interactive-primary)`). Queda ESTRICTAMENTE PROHIBIDO el uso de valores mágicos o quemados (hardcoding).
- **Protocolo de Alerta (Stop & Escalate):** Si el diseño requiere un valor, componente, color o comportamiento que NO EXISTE actualmente en `CSS_DesignSystem.html`, TIENES PROHIBIDO inventarlo. Debes DETENER la implementación inmediatamente, emitir la alerta: **"Falta de Token Detectada (Stop & Escalate)"**, proponer la adición de dicho token y solicitar autorización ("Aprobar lógica") antes de continuar.