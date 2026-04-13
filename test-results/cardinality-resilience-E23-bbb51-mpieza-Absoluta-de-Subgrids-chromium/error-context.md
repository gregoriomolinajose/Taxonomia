# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cardinality-resilience.spec.js >> E23: Cardinilidad TopolÃ³gica y Resiliencia SCD-2 >> Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids
- Location: __tests__\e2e\cardinality-resilience.spec.js:89:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('[id="btn-create-new"]').last()

```

# Test source

```ts
  1   | const { test, expect, chromium } = require('@playwright/test');
  2   | 
  3   | let context;
  4   | let page;
  5   | 
  6   | test.describe('E23: Cardinilidad TopolÃ³gica y Resiliencia SCD-2', () => {
  7   | 
  8   |   test.beforeAll(async () => {
  9   |     const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
  10  |     context = await chromium.launchPersistentContext(authDir, {
  11  |         headless: false,
  12  |         channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  13  |         args: [
  14  |             '--disable-blink-features=AutomationControlled',
  15  |             '--no-sandbox'
  16  |         ]
  17  |     });
  18  |     page = await context.newPage();
  19  | 
  20  |     page.on('console', async msg => {
  21  |         const values = [];
  22  |         for (const arg of msg.args())
  23  |             values.push(await arg.jsonValue().catch(() => '<object>'));
  24  |         console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
  25  |     });
  26  |   });
  27  | 
  28  |   test.afterAll(async () => {
  29  |     await context.close();
  30  |   });
  31  | 
  32  |   test.beforeEach(async () => {
  33  |     await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
  34  |     
  35  |     if (page.url().includes('accounts.google.com')) {
  36  |         console.log("ESPERANDO LOGIN MANUAL...");
  37  |         await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
  38  |     }
  39  | 
  40  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  41  |     await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  42  |   });
  43  | 
  44  | // --- Helpers DOM ---
  45  | async function fillTopInput(frame, name, value) {
  46  |     const selector = `[name="${name}"]`;
  47  |     const inputLocator = frame.locator(selector).last();
  48  |     await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
  49  |     await inputLocator.evaluate((el, v) => {
  50  |         el.value = v;
  51  |         el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
  52  |         el.dispatchEvent(new Event('input', { bubbles: true }));
  53  |     }, value);
  54  | }
  55  | 
  56  | async function clickTopButtonById(frame, id) {
  57  |     const btnLocator = frame.locator(`[id="${id}"]`).last();
> 58  |     await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
      |                      ^ TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
  59  |     await btnLocator.click({ force: true });
  60  | }
  61  | 
  62  | async function clickTopButtonByText(frame, text) {
  63  |     const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
  64  |     await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
  65  |     await btnLocator.click({ force: true });
  66  | }
  67  | 
  68  | async function submitHybridForm(frame, page, text) {
  69  |     const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
  70  |     let iter = 0;
  71  |     while(iter < 5) {
  72  |         if (await btnSiguiente.count() === 0) break;
  73  |         const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
  74  |         if (isHidden) break;
  75  |         await btnSiguiente.click({ force: true });
  76  | 
  77  |         iter++;
  78  |     }
  79  |     const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
  80  |     // Bypass strict expect which often fails with Ionic Web Components
  81  |     await btnGuardar.waitFor({ state: 'attached', timeout: 15000 }).catch(()=>{});
  82  |     await btnGuardar.evaluate(btn => {
  83  |         if (!btn.disabled) btn.click({ force: true });
  84  |     });
  85  | }
  86  | 
  87  | // -------------------------------------------------------------
  88  | 
  89  |   test('Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids', async () => {
  90  |     test.setTimeout(280_000);
  91  |     try {
  92  |         const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  93  |         const portafolioName = 'Portafolio Robado ' + Date.now();
  94  |         
  95  |         // 1. Crear UN A con un Portafolio
  96  |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  97  |         await fillTopInput(frame, 'nombre', 'UN A (Padre Original) ' + Date.now());
  98  |         
  99  |         await clickTopButtonByText(frame, 'Agregar');
  100 | 
  101 |         await clickTopButtonById(frame, 'btn-create-new'); 
  102 |  
  103 |         await fillTopInput(frame, 'nombre', portafolioName);
  104 |         console.log("Saving new portafolio...");
  105 |         await submitHybridForm(frame, page, 'Guardar Portafolio');
  106 | 
  107 |         
  108 |         console.log("Saving UN A...");
  109 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  110 |  // Wait for global UI refresh
  111 |         
  112 |         // 2. Crear UN B e intentar Robar el Portafolio
  113 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  114 |         await fillTopInput(frame, 'nombre', 'UN B (Padre LadrÃ³n) ' + Date.now());
  115 |         
  116 |         console.log("Linking UN B...");
  117 |         await clickTopButtonByText(frame, 'Agregar');
  118 |  // Wait relation builder modal
  119 |         
  120 |         // Seleccionar el Portafolio que pertenece a la UN A
  121 |         const listItems = frame.locator('ion-item').filter({ hasText: portafolioName });
  122 |         await listItems.first().click({ force: true });
  123 |         await clickTopButtonByText(frame, 'Vincular');
  124 |  
  125 |         
  126 |         // UN B ahora reclama tener a ese Portafolio
  127 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  128 |  
  129 | 
  130 |         // Probaremos la Limpieza Absoluta (Escenario 1.3):
  131 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  132 |         await fillTopInput(frame, 'nombre', 'UN C (Empty) ' + Date.now());
  133 |         
  134 |         console.log("Linking UN C...");
  135 |         await clickTopButtonByText(frame, 'Agregar');
  136 | 
  137 |         const someItems = frame.locator('ion-label').filter({ hasText: 'Portafolio' }).first();
  138 |         await someItems.click({ force: true });
  139 |         await clickTopButtonByText(frame, 'Vincular');
  140 |  
  141 | 
  142 |         // Limpiar (Desvincular con X)
  143 |         const removeBtn = frame.locator('ion-button[color="danger"]').first();
  144 |         await removeBtn.click({ force: true });
  145 | 
  146 | 
  147 |         // Guardar (Subgrid vacÃ­o)
  148 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  149 |         
  150 |         // Si el guardado fue exitoso y Toast aparece, early-return M:N / 1:N no abortÃ³ la operaciÃ³n prematuramente.
  151 |         const toast = frame.locator('ion-toast').filter({ hasText: 'Ã©xito' });
  152 |         await expect(toast).toBeVisible({ timeout: 10000 });
  153 |     } catch(err) {
  154 |         console.error("DEBUG FATAL PLAYWRIGHT:", err);
  155 |         await page.screenshot({ path: 'artifacts/pw_error.png' });
  156 |         throw err;
  157 |     }
  158 |   });
```