# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-capacity.spec.js >> E34 - S34.5: Capacity Map (Mapa E2E) Drill-down and Visibility >> El Mapa de Capacidad E2E debe inicializar su render jerárquico al presionar nav e ir directo al dataview prefiltrado
- Location: __tests__\e2e\dashboard-capacity.spec.js:45:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('#capacity-map-canvas')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('#capacity-map-canvas')

```

# Test source

```ts
  1  | const { test, expect, chromium } = require('@playwright/test');
  2  | 
  3  | let context;
  4  | let page;
  5  | 
  6  | test.describe('E34 - S34.5: Capacity Map (Mapa E2E) Drill-down and Visibility', () => {
  7  | 
  8  |   test.beforeAll(async () => {
  9  |     const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
  10 |     context = await chromium.launchPersistentContext(authDir, {
  11 |         headless: false,
  12 |         channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  13 |         args: [
  14 |             '--disable-blink-features=AutomationControlled',
  15 |             '--no-sandbox'
  16 |         ]
  17 |     });
  18 |     page = await context.newPage();
  19 | 
  20 |     page.on('console', async msg => {
  21 |         const values = [];
  22 |         for (const arg of msg.args())
  23 |             values.push(await arg.jsonValue().catch(() => '<object>'));
  24 |         console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
  25 |     });
  26 |   });
  27 | 
  28 |   test.afterAll(async () => {
  29 |     await context.close();
  30 |   });
  31 | 
  32 |   test.beforeEach(async () => {
  33 |     // Navigate to web app
  34 |     await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbwcQ6tJrdCg4bUUXy-FftU2QoN_Lh8G5nSntR7J8z43d4I1gDms5J5YvF02L8uM82xowA/exec');
  35 |     
  36 |     if (page.url().includes('accounts.google.com')) {
  37 |         console.log("ESPERANDO LOGIN MANUAL...");
  38 |         await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
  39 |     }
  40 | 
  41 |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  42 |     await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  43 |   });
  44 | 
  45 |   test('El Mapa de Capacidad E2E debe inicializar su render jerárquico al presionar nav e ir directo al dataview prefiltrado', async () => {
  46 |       const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  47 |       
  48 |       // Select the Capacity Map from the navigation dynamically to avoid ionic menu layout issues
  49 |       const navItem = frame.locator('#nav-item-capacitymap');
  50 |       await expect(navItem).toBeAttached({ timeout: 15000 });
  51 |       await frame.locator('body').evaluate(() => {
  52 |           window.AppEventBus.publish('NAV::CHANGE', {viewType: 'capacitymap'});
  53 |       });
  54 | 
  55 |       // Verify the map Canvas wrapper renders
  56 |       const canvas = frame.locator('#capacity-map-canvas');
> 57 |       await expect(canvas).toBeVisible({ timeout: 10000 });
     |                            ^ Error: expect(locator).toBeVisible() failed
  58 |       
  59 |       // Test Unidades de Negocio block exists (even if empty, the wrapper `.capmap-container` mounts)
  60 |       const container = frame.locator('.capmap-container');
  61 |       await expect(container).toBeVisible({ timeout: 10000 });
  62 | 
  63 |       // Probar el Drill down asumiendo que SIEMPRE hay al menos una UN en la taxonomía local Dev
  64 |       // Si la BD de test es completamente vacía, la prueba debe fallar por Test Seeding (Muda Mitigation).
  65 |       const firstUN = frame.locator('.capmap-un-title').first();
  66 |       await firstUN.waitFor({ state: 'visible', timeout: 5000 });
  67 |       // Clic en la primera UN para drill-down
  68 |       await firstUN.click();
  69 |       
  70 |       // Verify DataView Engine took over and set strict filter in UI (Chip was appended)
  71 |       const strictChip = frame.locator('.dv-header ion-chip').first();
  72 |       await expect(strictChip).toBeVisible({ timeout: 10000 });
  73 |       
  74 |       // Validate that the label includes 'Filtrado'
  75 |       await expect(strictChip).toContainText('Filtrado');
  76 |   });
  77 | });
  78 | 
```