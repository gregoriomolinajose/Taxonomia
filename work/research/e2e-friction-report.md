# Playwright E2E - Friction & Timeout Report

Tras haber eliminado todos los iteradores sintéticos (`await page.waitForTimeout`) y reducido drásticamente el *Timeout* general de 4 horas a tan solo 30 Segundos para generar fallos rápidos ("Fail Fast"), el pipeline de E2E expuso exactamente dónde ocurren las fricciones de interacción con el DOM simulado en chromium.

## Puntos Críticos de Fricción Identificados

### 1. Fricción Inter-frame (Sandbox de Google)
**Evidencia del Log**:
```log
Error: locator.evaluate: Target page, context or browser has been closed
  - waiting for locator('#sandboxFrame').contentFrame()
      .locator('#userHtmlFrame').contentFrame()
```
**Componente Afectado**: El Sandbox completo de Google Apps Script (`userHtmlFrame`).
**Diagnóstico (Mecánico)**: Playwright pierde la referencia del `contentFrame` cuando Google Apps Script realiza una recarga o validación interna de estado, provocando que el puntero `locator` se convierta en polvo (Target Closed). Playwright no puede seguir manejando el "locator" antiguo cuando se destruye el Frame. Se debe programar una re-localización dinámica del DOM o atarla firmemente a un evento persistente post-carga.

### 2. Contención en Intersección de Eventos (Botones en Modales Ionic)
**Evidencia del Log**:
```log
locator('ion-button').filter({ hasText: 'Guardar Portafolio' }).last()
```
**Componente Afectado**: Componente híbrido de creación dentro del modal `FormRenderer_UI` / `SubgridBuilder`.
**Diagnóstico (Visual)**: Playwright intenta evaluar el estado del botón `<ion-button>` pero asincrónicamente el modal `<ion-modal>` entra en conflicto de "pointer-events" (como se veía en la iteración pasada donde la capa oscurecedora u otro `ion-label` intercepta el clic). Como le quitamos el "Wait", el bot clica instantáneamente cuando el modal sigue en *animación de entrada*, frustrando el click.
**Acción Sugerida**: Playwright debe hacer *override* a la directiva de espera de animación, por ejemplo:
`await button.click({ force: true })`
O, más puristamente, no se debe depender de `.last()` si el DOM de los subgrids genera modales fantasmas.

### 3. Ausencia del Lifecycle Readiness Event (`APP::READY`)
**Componente Afectado**: `Dashboard_UI` y enrutamiento inicial.
**Diagnóstico (Lógico)**: En `dashboard-counters.spec.js`, Playwright asume agresivamente que cuando la página responde al comando `<goto>`, ya puede leer el `ion-item` de la barra lateral. Sin embargo, Ionic arranca sus *Web Components* independientemente del ciclo nativo de carga HTML. Como anulamos los `waitForTimeout(5000)`, Playwright revienta instantáneamente porque la vista se encuentra en "Esqueleto/Hydration".
**Acción Sugerida**: Todo el bloque E2E no debe depender de tiempos muertos `waitForTimeout`, sino de eventos de red:
`await page.waitForResponse(/exec/);`
o bien de Promesas DOM:
`await page.waitForFunction('window.FrameworkReady === true');`

## Conclusión

El componente que urge re-programar para que el Framework de Pruebas sea *Bullet-Proof* y superado sin tiempos de espera manuales, es la **Capa de Transición y Clicks sobre <ion-modal>**. Sustituyendo `waitForTimeout` por verificaciones funcionales como `locator.waitFor({ state: 'attached' })` combinado con comandos de click forzados `click({force: true})` para ignorar las animaciones decorativas de Ionic.
