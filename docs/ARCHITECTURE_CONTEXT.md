# 🧠 Cerebro del Proyecto: Arquitectura & Reglas Maestras (Taxonomia Project)

Este es el documento maestro de contexto estructural. Cualquier desarrollador o Agente de IA (Antigravity/RaiSE) DEBE entender y respetar estas reglas arquitectónicas antes de sugerir o inyectar código. Si tus propuestas rompen estos estatutos, tu código será rechazado en la etapa de PR/Revisión.

## 1. Visión General del Proyecto
**Plataforma de Taxonomía y Gestión Enterprise** construida como una Single Page Application (SPA).

* **Frontend:** Agnostic MVC SPA usando Vanilla JS puro, HTML estándar y *Web Components* (Ionic 8 vía CDN). Se utilizan *CSS Custom Properties* nativas (SIN preprocesadores ni SASS) para la inyección de estilos.
* **Backend:** Serverless basado en Google Apps Script (GAS V8 Engine).
* **Base de Datos:** Google Sheets auto-aprovisionado, operando localmente mediante Caché en Memoria e hileras JSON.

## 2. Arquitectura Frontend (El Chasis Visual)
La interfaz de usuario obedece a un modelo modular estricto gobernado por un Contrato Visual y flujos *Just-In-Time*.

* **Single Source of Truth (SSOT) - CSS_DesignSystem.html**: Es el único lugar autorizado para definir tokens de diseño. Se divide en Tokens de Marca (Nivel 1) y Alias Variables para Ionic (Nivel 2). Implementa Tipografía Fluida. Las clases estructurales estáticas (grids, contenedores) están PROHIBIDAS aquí.
* **Theme Engine & Acccesibilidad**: El Modo Oscuro funciona por mapeo estricto sobre las variables estándar de Ionic (`body.dark`). Usa un motor cognitivo de luminiscencia (YIQ) para contraste sin requerir "Phantom Tokens" o colores hardcodeados en el Markup HTML.
* **Vistas Modulares Dinámicas (JIT Binding)**: No hay decenas de páginas estáticas `.html`. En su lugar, el Framework SPA (Index/JS_Core) inyecta las vistas universales `DataView_UI.html` y `FormEngine_UI.html` dinámicamente en memoria utilizando componentes Ionic.

## 3. Arquitectura Backend (El Motor de Datos)
Toda la interacción con la base de datos obedece al patrón de abstracción máxima y "Payload Único" para neutralizar la latencia del Serverless de Google.

* **Modelo Config-Driven (Schema_Engine.gs)**: Es el único lugar donde se declaran las entidades (Portafolio, Unidad_Negocio, etc.). Gobierna desde los tipos de campo formales y Primary Keys automáticos hasta la estructura visual del Blueprint UI (`width`, `section`).
* **Patrón Facade / RPC Router (API_Universal & Engine_DB)**: El controlador API_Universal.gs recibe las rutas del Frontend, pero DELEGA de forma obligatoria la operativa de Base de Datos y Lógica hacia `Engine_DB.js`. Engine_DB.js es el gran orquestador responsable de rutear datos a Sheets o la Nube y emitir invalidaciones de Memoria Ram local.
* **Auto-Aprovisionamiento DB (Adapter_Sheets)**: Es el único archivo autorizado para tocar la API `SpreadsheetApp`. Si una entidad se consulta por vez primera, invoca internamente `_ensureSheetExists`, generando la pestaña física e inyectándole los headers tabulares traducidos del Scheme_Engine.

## 4. Principios Inquebrantables (Core Principles)
* **§ Agnostic Design (Zero-Touch UI)**: Queda TERMINANTEMENTE PROHIBIDO crear lógicas dedicadas por entidad en el código cliente o vistas HTML separadas. Los motores son 100% genéricos (Ejem. `_fetchData(entityName)`). Si falta una pantalla, NUNCA se edita HTML, SE actualiza la metadata en Google Apps Script.
* **§ Contrato Asíncrono (Non-blocking UI)**: Inyección OBLIGATORIA e INMEDIATA de *Skeletons* o Spinners (Ejem: `_showLoadingState()`) previos a la resolución final de red.
* **§ Graceful Degradation (Falla Transparente)**: Eliminar el uso de *Mocks* artificiales para inflar grillas falsas en producción. Los fallos nativos de promesas GAS (Timeout / Serialización Proxy V8 postMessage) se canalizan hacia componentes visuales limpios indicándole al usuario final acciones de mitigación como "Por favor, refresca la página".

---
*Fin del Instrumento de Gobierno Arquitectónico. Referencia fundamental obligatoria para cualquier sesión de Integración RaiSE AI.*
