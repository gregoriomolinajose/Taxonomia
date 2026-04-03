# Epic 22: Enterprise B2B UX Transformation

> **Status:** 🚧 In Progress
> **Origin:** Stakeholder UX requirement definition.

## 🎯 Objetivo de Negocio
Transformar la experiencia de usuario (UX) de la plataforma, pasando de una interfaz de herramienta interna a un estándar Enterprise SaaS B2B. Esto se logrará separando las utilidades del sistema de la navegación de negocio, implementando una búsqueda global (Omnibar) y rediseñando el Dashboard inicial en un "Centro de Mando" reactivo al contexto (ABAC).

## 🏛️ Regla Arquitectónica Estricta (Design System Purity)
Ningún componente, color, sombra o espaciado de esta Épica será "hardcodeado".
Todo el renderizado consumirá exclusivamente los tokens del Sistema de Diseño centralizado (`window._UI_CONFIG` y variables CSS globales). Uso de la fábrica `window.DOM.create()` para inyección de nodos nativos e Ionic Components manteniendo la regla (Zero-XSS).

## 📂 Desglose de Historias de Usuario (Scope)

### 🎟️ S22.1: Top App Bar & Reubicación de Perfil Dinámico
**Descripción:** Construir un `<header>` global (Top Bar). Mover opciones de configuración, seguridad y cierre de sesión fuera del menú lateral hacia un menú desplegable (Dropdown) en la esquina superior derecha.
**Acceptance Criteria:**
- Avatar consume dinámicamente la foto de perfil de Google Workspace (con fallback a iniciales).
- El Dropdown muestra el Rol primario (hidratado por `Engine_ABAC`).
- El menú lateral queda exclusivamente para entidades de negocio.

### 🎟️ S22.2: Omnibar (Búsqueda Global)
**Descripción:** Implementar búsqueda global en el nuevo Top Bar.
**Acceptance Criteria:**
- Búsqueda a través de múltiples esquemas simultáneamente.
- Resultados en panel flotante contextual (estilizado con tarjetas estándar).
- Navegación al perfil de entidad clicando un resultado instanciando `UI_Router`.

### 🎟️ S22.3: Limpieza de UI & Ocultamiento de Tablas de Sistema
**Descripción:** Parametrizar la visibilidad para que entidades administrativas no ensucien la interfaz operativa.
**Acceptance Criteria:**
- Ocultar `Sys_Roles`, `Sys_Permissions` del menú lateral (flag `showInSidebar: false`).
- Acceso exclusivo vía "Configuración" en el Dropdown de Perfil S22.1, protegido por la Matriz S18.5.
- Eliminar permanentemente texto de "Bienvenida" del Dashboard.

### 🎟️ S22.4: Contextual Dashboard (Widgets ABAC-Aware)
**Descripción:** Reconstruir la pantalla de inicio con layout "F invertida" que reaccione al nivel de permisos.
**Acceptance Criteria:**
- *Skeleton Loaders:* Estado de carga inicial con `ion-skeleton-text`.
- *Top KPIs (Zona 1):* Tarjetas numéricas que muestran conteos relevantes.
- *Mi Ecosistema (Zona 2):* Tarjetas dinámicas filtradas por propiedad (`ABAC.can()`).
- *Empty States Educativos:* Ilustraciones tenues si el usuario no tiene alcance operativo.

### 🎟️ S22.5: Bottom Tab Bar (Navegación Móvil)
**Descripción:** Implementar una Barra de Navegación Inferior exclusiva para pantallas móviles (< 768px). Esta barra centraliza la navegación en la "Thumb Zone", emulando la experiencia de apps nativas y ocultando simultáneamente el menú lateral.
**Acceptance Criteria:**
- *Renderizado Condicional (Breakpoints):* Inyección/visibilidad de la barra exclusiva en vistas móviles, y ocultamiento automático del Sidebar.
- *Consumo del Design System:* Empleo estricto de `ion-tab-bar` y `ion-tab-button` vía `window.DOM.create()`. Prohibición de CSS posicional hardcodeado.
- *Jerarquía Táctil de 4 Ítems:* "Inicio" (Dashboard), "Buscar" (Omnibar en Fullscreen Modal), "Explorar" (entidades SAFe) y "Perfil" (Dropdown Settings/ABAC/Logout).
- *Safe Area Padding:* Pleno respeto al Safe Area Inferior para dispositivos iOS modernos.

## Progress Tracking
- [x] S22.1: Top App Bar & Reubicaci�n de Perfil Din�mico
- [ ] S22.2: Omnibar (B�squeda Global)
- [ ] S22.3: Limpieza de UI & Ocultamiento de Tablas de Sistema
- [ ] S22.4: Contextual Dashboard (Widgets ABAC-Aware)
- [ ] S22.5: Bottom Tab Bar (Navegaci�n M�vil)
