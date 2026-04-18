# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ui-resilience.spec.js >> E2E UI Resilience & Interaction Stability >> Validar Resiliencia en FormEngine_UI (Drawers Principales y Satélites) sin generar ReferenceExceptions
- Location: __tests__\e2e\ui-resilience.spec.js:55:3

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('.drawer-dynamic-title').last()
Expected: "Portafolio de Resiliencia UI"
Received: "Nuevo Registro"
Timeout:  2000ms

Call log:
  - Expect "soft toHaveText" with timeout 2000ms
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('.drawer-dynamic-title').last()
    6 × locator resolved to <h1 class="drawer-dynamic-title">Nuevo Registro</h1>
      - unexpected value "Nuevo Registro"

```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const { setupPersistentContext, bypassGoogleAuth } = require('./utils/setup');
  3   | 
  4   | let context;
  5   | let page;
  6   | let pageErrors = [];
  7   | 
  8   | test.describe('E2E UI Resilience & Interaction Stability', () => {
  9   | 
  10  |   test.beforeAll(async () => {
  11  |     const setup = await setupPersistentContext();
  12  |     context = setup.context;
  13  |     page = setup.page;
  14  | 
  15  |     // S40.2: Interceptar globalmente cualquier excepción nativa o "ReferenceError"
  16  |     page.on('pageerror', exception => {
  17  |         console.error(`[FATAL EXCEPTION CATCHED]: ${exception}`);
  18  |         pageErrors.push(exception);
  19  |     });
  20  | 
  21  |     page.on('console', msg => {
  22  |         if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
  23  |             console.error(`[CONSOLE ERROR]: ${msg.text()}`);
  24  |             pageErrors.push(new Error(msg.text()));
  25  |         }
  26  |     });
  27  | 
  28  |   });
  29  | 
  30  |   test.afterAll(async () => {
  31  |     await context.close();
  32  |   });
  33  | 
  34  |   test.beforeEach(async () => {
  35  |     pageErrors = []; // Reset errors before each test
  36  |     await bypassGoogleAuth(page);
  37  |   });
  38  | 
  39  |   // --- Helpers Locales ---
  40  |   async function typeInteractively(frame, inputName, text) {
  41  |       // Localizamos físicamente la tag `input` que está dentro del Shadow DOM de `ion-input` / `ion-searchbar`
  42  |       const inputLocator = frame.locator(`[name="${inputName}"], ion-searchbar[name="${inputName}"]`).locator('input').last();
  43  |       try {
  44  |           await inputLocator.waitFor({ state: 'attached', timeout: 10000 });
  45  |           await inputLocator.scrollIntoViewIfNeeded();
  46  |           await inputLocator.click({ force: true });
  47  |           await page.keyboard.type(text, { delay: 50 }); // Emulamos 50ms per keystroke humano
  48  |       } catch(e) {
  49  |           console.warn(`[WARN] No se pudo escribir en ${inputName}: ${e.message}`);
  50  |       }
  51  |   }
  52  | 
  53  |   // --------------------------------------------------------------------------
  54  | 
  55  |   test('Validar Resiliencia en FormEngine_UI (Drawers Principales y Satélites) sin generar ReferenceExceptions', async () => {
  56  |     test.setTimeout(180_000);
  57  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  58  | 
  59  |     console.log("[E2E] Abriendo Formulario Entidad...");
  60  |     await frame.locator('body').evaluate(() => { window.renderForm('Portafolio', {}); });
  61  |     
  62  |     // 1. Simulación Humana en el Componente Principal (Drawer Name)
  63  |     console.log("[E2E] Tecleando título principal...");
  64  |     await typeInteractively(frame, 'nombre', 'Portafolio de Resiliencia UI');
  65  |     
  66  |     // Verificamos de inmediato que no se haya invocado un pageerror ("targetTitleField is not defined")
  67  |     expect(pageErrors.length).toBe(0);
  68  | 
  69  |     // Verificamos si el Header dinámico se respetó (Soft check para tolerar caché de deploy en Auth)
  70  |     const dynamicHeader = frame.locator('.drawer-dynamic-title').last();
  71  |     const hasHeader = await dynamicHeader.isVisible();
  72  |     if (hasHeader) {
> 73  |         await expect.soft(dynamicHeader).toHaveText('Portafolio de Resiliencia UI', { timeout: 2000 });
      |                                          ^ Error: expect(locator).toHaveText(expected) failed
  74  |     }
  75  | 
  76  |     // 2. Simulación Humana en el Componente SearchableSelect (Satélite)
  77  |     console.log("[E2E] Explorando Searchable Proxy...");
  78  |     const selectPadre = frame.locator('tx-searchable[data-form-component="unidad_negocio_padre"]').last();
  79  |     await selectPadre.waitFor({ state: 'visible', timeout: 5000 });
  80  |     
  81  |     // Expandir el Popover TXSearchable vía API en vez de clickDOM bruto
  82  |     await selectPadre.evaluate(el => el.executeSearchAndOpen());
  83  |     
  84  |     // Aparecerá el Popover/Modal nativo que renderiza el ShadowDOM inyectado
  85  |     // Como ion-select_padre en modo single crea un Desktop Dropdown o Mobile Modal
  86  |     const popoverContainer = frame.locator('.tx-desktop-dropdown, ion-modal').last();
  87  |     const alertSearch = popoverContainer.locator('ion-list').last(); // Buscamos la lista
  88  |     await alertSearch.waitFor({ state: 'visible', timeout: 5000 });
  89  |     
  90  |     // En Desktop la caja de busqueda embebida está en ion-searchbar
  91  |     const alertInput = popoverContainer.locator('ion-searchbar').last().locator('input').last();
  92  |     if(await alertInput.count() > 0) {
  93  |        await alertInput.pressSequentially("Busqueda", { delay: 50 });
  94  |     }
  95  |     
  96  |     // Volvemos a salir y cancelar usando tecla Escape (Standard de Ionic para popovers)
  97  |     await page.keyboard.press('Escape');
  98  | 
  99  |     // 3. Simulación Humana en SubgridBuilder (Drill-Down Recursividad Modales)
  100 |     console.log("[E2E] Explorando SearchableMulti Modal...");
  101 |     // Localizar el Multi Select de Grupos
  102 |     const multiContainer = frame.locator('tx-searchable[data-form-component="grupos_productos_vinculados"]').last();
  103 |     await multiContainer.waitFor({ state: 'attached', timeout: 10000 });
  104 |     
  105 |     await multiContainer.evaluate(el => el.executeSearchAndOpen());
  106 |     
  107 |     const btnAgregarGrupo = frame.locator('ion-item').filter({ hasText: 'Crear' }).last();
  108 |     
  109 |     if (await btnAgregarGrupo.count() > 0) {
  110 |         await btnAgregarGrupo.evaluate(b => b.click({ force: true }));
  111 |         // Estando en el segundo Drawer (Encima de portafolio) tecleamos de nuevo
  112 |         await typeInteractively(frame, 'nombre', 'Sub-componente Seguro');
  113 |         expect(pageErrors.length).toBe(0); // Seguimos sin estrellar UI (WSOD)
  114 |         
  115 |         // El dynamic title del grupo debe coincidir (Soft check)
  116 |         const subDrawerHeader = frame.locator('.drawer-dynamic-title').last();
  117 |         if (await subDrawerHeader.isVisible()) {
  118 |             await expect.soft(subDrawerHeader).toHaveText('Sub-componente Seguro', { timeout: 2000 });
  119 |         }
  120 |     }
  121 | 
  122 |     console.log("✅ Monkey Tester completado. Sin rastro de Ghost Listeners ni Excepciones Fatales.");
  123 |     // Assurance Final
  124 |     expect(pageErrors.length).toBe(0);
  125 |   });
  126 | });
  127 | 
```