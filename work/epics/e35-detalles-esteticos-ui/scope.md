# Epic E35: Detalles Estéticos y Refinamiento UX

**Fecha:** 2026-04-14
**Problem Brief:** `work/epics/e35-detalles-esteticos-ui/brief.md`
**Estado:** En Progreso (Ejecución y Cierre)

---

## Objetivo

Resolver la lista de detalles estéticos menores e implementar mejoras de UI que aporten al *Look & Feel* y resiliencia visual del usuario (sin modificar estructuras profundas de datos).

---

## Scope

### MUST (No Negociable)
- **S35.1** Refactorización visual de metadatos globales (ID) en los Drawers.
- **S35.1** Bugfix: Resolución del Render Ciego en Avatares al re-hidratar remotamente Google Workspace images.

---

## Stories

| ID | Nombre | Descripción | Tamaño | Depende de | Status |
|---|---|---|---|---|---|
| S35.1 | Mejora Visual: Drawer Headers & Avatar | 1) Bugfix del Drawer Avatar donde la imagen no se actualizaba pese a existir en base de datos debido a inyección reactiva asíncrona ciega. 2) Trasladar campo PrimaryKey (ID Ticket/Grupo) desde el bloque interno del form (`display:none` en UI_Factory.buildBadge) a ser una etiqueta congelada persistente dentro del Drawer Header. Se implementa un stack flex abarcando el 100% del ancho (Header Column Stretch) para que el boton (X) se ubique en extrema derecha. Además, se limpiaron todos los colores hardcodeados para heredar la resiliencia del Dark Mode nativo de Ionic (Ej. var(--ion-background-color) y meta-iconos por esquema). Por último, se calibró el contraste del Badge ID quitando el fondo pálido, se eliminó la herencia de color fuerte en los iconos del header para asegurar su legibilidad en el tema oscuro, y se ajustaron los espaciados verticales del layout para un respiro visual equilibrado. Además, se suprimieron los prefijos de texto obsoletos ('Gestión:', 'Editar:') logrando una cabecera más minimalista y simétrica emparejando el tamaño de fuente (20px) con el del icono. Por solicitud adicional, se re-asignó el color del icono explícitamente hacia var(--dv-primary) para lograr emular perfectamente el render del encabezado principal de la DataView en todo momento. Finalmente, se restituyó la inyección de Lexical IDs (ej. UNID-XXXX) en lugar del UUID local, aplicando una extracción resiliente directamente en tiempo de render mapeando el esquema contra el payload de datos sin depender de Event Listeners del DOM. | S | — | DONE |
| S35.3 | Pruebas Automatizadas UI/Back | Automatización de infraestructura de pruebas para garantizar el EventBus bidireccional, barreras de fuga de RAM (H10) y clausuras UX Mobile del componente SearchableSingle y RelationBuilder | S | S37.2 | TODO |

---

## Definition of Done

- [x] Bug del avatar resuelto disparando globalmente `BadgeUpdated` o `FormHydrated`.
- [x] ID estático en todos los Drawers bajo el título, estilizado como un Tag limpio con border y color sólido.
- [x] Despliegues automatizados Zero-Touch en Producción y Dev.
- [ ] Retrospectiva y Epica revisada.

---

## Implementation Plan

| Pos | Story | Strategy |
|---|---|---|
| 1 | **S35.1** (UI Drawer & Bugfix) | Quick fix aplicando broadcast de custom events nativos JS al final de la iteración en `FormRenderer_UI` para reactivar Custom Elements y moviendo la estructura HTML hacia el Drawer Header estático real. |

---

## Progress Tracking

| Story | Status  | T-Size |
|---|---|---|
| S35.1 | DONE  | S |
| S35.3 | TODO  | S |
