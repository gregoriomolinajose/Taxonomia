# Reglas de Interfaz Gráfica y UX/UI (Frontend)

## 1. Arquitectura Frontend Mobile-First
- Aplicación de Arquitectura Híbrida (Capacitor-Ready) SPA.
- Apps Script solo funge como API/Servidor que inyecta la página; el UI está desacoplado.
- **Uso Estricto de Componentes Nativos:** Todo el DOM dinámico debe generarse usando Web Components de **Ionic (`<ion-input>`, `<ion-datetime>`)**.
- NUNCA inventes o construyas componentes visuales complejos desde cero si existe una alternativa oficial en el framework.

## 2. Progressive Disclosure (Wizards)
- PROHIBIDO renderizar formularios largos en una sola vista plana.
- Si el `APP_SCHEMAS` define la propiedad `steps`, el motor DEBE renderizar un componente de navegación paso a paso (Wizard) utilizando `<ion-stepper>` o `<ion-segment>`.

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