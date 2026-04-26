# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cardinality-resilience.spec.js >> E23: Cardinilidad TopolÃ³gica y Resiliencia SCD-2 >> Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids
- Location: __tests__\e2e\cardinality-resilience.spec.js:95:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 3000ms exceeded.
Call log:
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('ion-button').filter({ hasText: 'Guardar Portafolio' }).last()

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
  58  |     await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
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
  80  |     // Fail fast if button is not present
  81  |     const allButtons = await frame.locator('ion-button').evaluateAll(btns => btns.map(b => b.textContent.trim()));
  82  |     console.log(`Available buttons (looking for "${text}"):`, allButtons);
  83  |     
> 84  |     await btnGuardar.waitFor({ state: 'attached', timeout: 3000 });
      |                      ^ TimeoutError: locator.waitFor: Timeout 3000ms exceeded.
  85  |     
  86  |     // Check disabled state via Playwright instead of evaluate
  87  |     const isDisabled = await btnGuardar.evaluate(btn => btn.disabled).catch(() => true);
  88  |     if (!isDisabled) {
  89  |         await btnGuardar.click({ force: true, timeout: 3000 });
  90  |     }
  91  | }
  92  | 
  93  | // -------------------------------------------------------------
  94  | 
  95  |   test('Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids', async () => {
  96  |     test.setTimeout(60_000);
  97  |     try {
  98  |         const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  99  |         const portafolioName = 'Portafolio Robado ' + Date.now();
  100 |         
  101 |         // 1. Crear UN A con un Portafolio
  102 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  103 |         await fillTopInput(frame, 'nombre', 'UN A (Padre Original) ' + Date.now());
  104 |         
  105 |         const containerPortA = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
  106 |         await containerPortA.waitFor({ state: 'attached', timeout: 15000 });
  107 |         
  108 |         // Remove flaky isVisible check and force the evaluation
  109 |         await containerPortA.evaluate(el => el.executeSearchAndOpen());
  110 |         
  111 |         // Wait for the popover/modal to render the 'Crear' item
  112 |         const btnCreatePort = frame.locator('ion-item').filter({ hasText: 'Crear' }).last();
  113 |         await btnCreatePort.waitFor({ state: 'attached', timeout: 8000 });
  114 |         await btnCreatePort.click({ force: true });
  115 |  
  116 |         await fillTopInput(frame, 'nombre', portafolioName);
  117 |         console.log("Saving new portafolio...");
  118 |         await submitHybridForm(frame, page, 'Guardar Portafolio');
  119 | 
  120 |         
  121 |         console.log("Saving UN A...");
  122 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  123 |  // Wait for global UI refresh
  124 |         
  125 |         // 2. Crear UN B e intentar Robar el Portafolio
  126 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  127 |         await fillTopInput(frame, 'nombre', 'UN B (Padre LadrÃ³n) ' + Date.now());
  128 |         
  129 |         console.log("Linking UN B...");
  130 |         const containerPortB = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
  131 |         await containerPortB.evaluate(el => el.executeSearchAndOpen());
  132 |         
  133 |         // Seleccionar el Portafolio interactivo (puede venir del inline-list)
  134 |         const popoverPortListB = containerPortB.locator('ion-item').filter({ hasText: portafolioName }).first();
  135 |         await popoverPortListB.waitFor({ state: 'visible', timeout: 8000 });
  136 |         await popoverPortListB.click({ force: true });
  137 |         
  138 |         // Modal cierra por Escape
  139 |         await page.keyboard.press('Escape');
  140 |         
  141 |         // UN B ahora reclama tener a ese Portafolio
  142 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  143 |  
  144 | 
  145 |         // Probaremos la Limpieza Absoluta (Escenario 1.3):
  146 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  147 |         await fillTopInput(frame, 'nombre', 'UN C (Empty) ' + Date.now());
  148 |         
  149 |         console.log("Linking UN C...");
  150 |         const containerPortC = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
  151 |         await containerPortC.evaluate(el => el.executeSearchAndOpen());
  152 | 
  153 |         const someItems = containerPortC.locator('ion-item').filter({ hasText: 'Portafolio' }).first();
  154 |         await someItems.waitFor({ state: 'visible', timeout: 8000 });
  155 |         await someItems.click({ force: true });
  156 |         
  157 |         // Salir
  158 |         await page.keyboard.press('Escape');
  159 |   
  160 | 
  161 |         // Limpiar (Desvincular con X - Badge de TXSearchable)
  162 |         const removeBtn = containerPortC.locator('ion-chip ion-icon[name="close-circle"]').first();
  163 |         if (await removeBtn.isVisible()) {
  164 |             await removeBtn.click({ force: true });
  165 |         }
  166 | 
  167 | 
  168 |         // Guardar (Subgrid vacÃ­o)
  169 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  170 |         
  171 |         // Si el guardado fue exitoso y Toast aparece, early-return M:N / 1:N no abortÃ³ la operaciÃ³n prematuramente.
  172 |         const toast = frame.locator('ion-toast').filter({ hasText: 'Ã©xito' });
  173 |         await expect(toast).toBeVisible({ timeout: 10000 });
  174 |     } catch(err) {
  175 |         console.error("DEBUG FATAL PLAYWRIGHT:", err);
  176 |         await page.screenshot({ path: 'artifacts/pw_error.png' });
  177 |         throw err;
  178 |     }
  179 |   });
  180 | 
  181 | });
  182 | 
```