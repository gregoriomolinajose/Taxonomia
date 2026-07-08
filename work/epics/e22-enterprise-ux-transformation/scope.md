# Epic 22: Enterprise B2B UX Transformation

> **Status:** ð§ In Progress
> **Origin:** Stakeholder UX requirement definition.

## ð¯ Objetivo de Negocio
Transformar la experiencia de usuario (UX) de la plataforma, pasando de una interfaz de herramienta interna a un estÃ¡ndar Enterprise SaaS B2B. Esto se lograrÃ¡ separando las utilidades del sistema de la navegaciÃ³n de negocio, implementando una bÃºsqueda global (Omnibar) y rediseÃ±ando el Dashboard inicial en un "Centro de Mando" reactivo al contexto (ABAC).

## ðï¸ Regla ArquitectÃ³nica Estricta (Design System Purity)
NingÃºn componente, color, sombra o espaciado de esta Ãpica serÃ¡ "hardcodeado".
Todo el renderizado consumirÃ¡ exclusivamente los tokens del Sistema de DiseÃ±o centralizado (`window._UI_CONFIG` y variables CSS globales). Uso de la fÃ¡brica `window.DOM.create()` para inyecciÃ³n de nodos nativos e Ionic Components manteniendo la regla (Zero-XSS).

## ð Desglose de Historias de Usuario (Scope)

### ðï¸ S22.1: Top App Bar & ReubicaciÃ³n de Perfil DinÃ¡mico
**DescripciÃ³n:** Construir un `<header>` global (Top Bar). Mover opciones de configuraciÃ³n, seguridad y cierre de sesiÃ³n fuera del menÃº lateral hacia un menÃº desplegable (Dropdown) en la esquina superior derecha.
**Acceptance Criteria:**
- Avatar consume dinÃ¡micamente la foto de perfil de Google Workspace (con fallback a iniciales).
- El Dropdown muestra el Rol primario (hidratado por `Engine_ABAC`).
- El menÃº lateral queda exclusivamente para entidades de negocio.

### ðï¸ S22.2: Omnibar (BÃºsqueda Global)
**DescripciÃ³n:** Implementar bÃºsqueda global en el nuevo Top Bar.
**Acceptance Criteria:**
- BÃºsqueda a travÃ©s de mÃºltiples esquemas simultÃ¡neamente.
- Resultados en panel flotante contextual (estilizado con tarjetas estÃ¡ndar).
- NavegaciÃ³n al perfil de entidad clicando un resultado instanciando `UI_Router`.

### ðï¸ S22.3: Limpieza de UI & Ocultamiento de Tablas de Sistema
**DescripciÃ³n:** Parametrizar la visibilidad para que entidades administrativas no ensucien la interfaz operativa.
**Acceptance Criteria:**
- Ocultar `Sys_Roles`, `Sys_Permissions` del menÃº lateral (flag `showInSidebar: false`).
- Acceso exclusivo vÃ­a "ConfiguraciÃ³n" en el Dropdown de Perfil S22.1, protegido por la Matriz S18.5.
- Eliminar permanentemente texto de "Bienvenida" del Dashboard.

### ðï¸ S22.4: Contextual Dashboard (Widgets ABAC-Aware)
**DescripciÃ³n:** Reconstruir la pantalla de inicio con layout "F invertida" que reaccione al nivel de permisos.
**Acceptance Criteria:**
- *Skeleton Loaders:* Estado de carga inicial con `ion-skeleton-text`.
- *Top KPIs (Zona 1):* Tarjetas numÃ©ricas que muestran conteos relevantes.
- *Mi Ecosistema (Zona 2):* Tarjetas dinÃ¡micas filtradas por propiedad (`ABAC.can()`).
- *Empty States Educativos:* Ilustraciones tenues si el usuario no tiene alcance operativo.

### ðï¸ S22.5: Bottom Tab Bar (NavegaciÃ³n MÃ³vil)
**DescripciÃ³n:** Implementar una Barra de NavegaciÃ³n Inferior exclusiva para pantallas mÃ³viles (< 768px). Esta barra centraliza la navegaciÃ³n en la "Thumb Zone", emulando la experiencia de apps nativas y ocultando simultÃ¡neamente el menÃº lateral.
**Acceptance Criteria:**
- *Renderizado Condicional (Breakpoints):* InyecciÃ³n/visibilidad de la barra exclusiva en vistas mÃ³viles, y ocultamiento automÃ¡tico del Sidebar.
- *Consumo del Design System:* Empleo estricto de `ion-tab-bar` y `ion-tab-button` vÃ­a `window.DOM.create()`. ProhibiciÃ³n de CSS posicional hardcodeado.
- *JerarquÃ­a TÃ¡ctil de 4 Ãtems:* "Inicio" (Dashboard), "Buscar" (Omnibar en Fullscreen Modal), "Explorar" (entidades SAFe) y "Perfil" (Dropdown Settings/ABAC/Logout).
- *Safe Area Padding:* Pleno respeto al Safe Area Inferior para dispositivos iOS modernos.

## Progress Tracking
- [x] S22.1: Top App Bar & Reubicación de Perfil Dinámico
- [ ] S22.2: Omnibar (Búsqueda Global)
- [ ] S22.3: Limpieza de UI & Ocultamiento de Tablas de Sistema
- [ ] S22.4: Contextual Dashboard (Widgets ABAC-Aware)
- [ ] S22.5: Bottom Tab Bar (Navegación Móvil)
