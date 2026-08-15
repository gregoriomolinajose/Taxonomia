# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: delete-operations.spec.js >> E69: Delete Operations (Individual & Bulk) en Entorno DEV Real >> Historia 16: Borrado Individual en UI renderiza ion-alert y ejecuta soft-delete visual
- Location: __tests__\e2e\delete-operations.spec.js:58:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 60000ms exceeded.
Call log:
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('table.dv-table tbody tr').first() to be visible

```

# Test source

```ts
  1   | const { test, expect, chromium } = require('@playwright/test');
  2   | 
  3   | let context;
  4   | let page;
  5   | 
  6   | test.describe('E69: Delete Operations (Individual & Bulk) en Entorno DEV Real', () => {
  7   |   // Aumentar el timeout global para estas pruebas pesadas de E2E
  8   |   test.setTimeout(150000);
  9   | 
  10  |   test.beforeAll(async () => {
  11  |     test.setTimeout(200000);
  12  |     const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
  13  |     context = await chromium.launchPersistentContext(authDir, {
  14  |         headless: false,
  15  |         channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  16  |         args: [
  17  |             '--disable-blink-features=AutomationControlled',
  18  |             '--no-sandbox'
  19  |         ]
  20  |     });
  21  |     page = await context.newPage();
  22  | 
  23  |     page.on('console', async msg => {
  24  |         const values = [];
  25  |         for (const arg of msg.args())
  26  |             values.push(await arg.jsonValue().catch(() => '<object>'));
  27  |         console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
  28  |     });
  29  | 
  30  |     if (!process.env.DEV_URL) {
  31  |         throw new Error("[E2E Fatal] DEV_URL environment variable is strictly required.");
  32  |     }
  33  |     
  34  |     console.log(`Navigating to: ${process.env.DEV_URL}`);
  35  |     try {
  36  |         await page.goto(process.env.DEV_URL, { timeout: 60000 });
  37  |     } catch (e) {
  38  |         console.log('Navigation error/timeout (continuing to wait for iframe):', e.message);
  39  |     }
  40  | 
  41  |     if (page.url().includes('accounts.google.com')) {
  42  |         throw new Error("Sesión OAuth expirada o inexistente. Por favor ejecuta 'npm run e2e:login' primero.");
  43  |     }
  44  |     
  45  |     // Esperar a que el sandbox construya el DOM. En Ionic, `ion-app` siempre existe.
  46  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  47  |     // En lugar de `ion-app`, esperamos algo que sí es visible
  48  |     await frame.locator('ion-content').first().waitFor({ state: 'attached', timeout: 120000 });
  49  |     
  50  |     const fs = require('fs');
  51  |     fs.writeFileSync('debug-frame.html', await frame.locator('body').innerHTML());
  52  |   });
  53  | 
  54  |   test.afterAll(async () => {
  55  |     if (context) await context.close();
  56  |   });
  57  | 
  58  |   test('Historia 16: Borrado Individual en UI renderiza ion-alert y ejecuta soft-delete visual', async () => {
  59  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  60  |     
  61  |     // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
  62  |     const btnPortafolio = frame.locator('#nav-item-Portafolio');
  63  |     await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
  64  |     await btnPortafolio.evaluate(node => node.click());
  65  |     
  66  |     // Ahora esperar a que la tabla de registros cargue
  67  |     const gridRows = frame.locator('table.dv-table tbody tr');
> 68  |     await gridRows.first().waitFor({ state: 'visible', timeout: 60000 });
      |                            ^ TimeoutError: locator.waitFor: Timeout 60000ms exceeded.
  69  |     
  70  |     const rowCountBefore = await gridRows.count();
  71  |     expect(rowCountBefore).toBeGreaterThan(0);
  72  | 
  73  |     const firstRowText = await gridRows.first().locator('td').first().innerText();
  74  | 
  75  |     const btnDelete = gridRows.first().locator('button[title="Eliminar"]');
  76  |     await btnDelete.waitFor({ state: 'visible' });
  77  |     await btnDelete.click();
  78  | 
  79  |     const alertModal = frame.locator('ion-alert');
  80  |     await alertModal.waitFor({ state: 'visible' });
  81  |     
  82  |     const alertHeader = await alertModal.locator('.alert-title').innerText();
  83  |     expect(alertHeader).toContain('Confirmar Eliminación');
  84  | 
  85  |     const confirmBtn = alertModal.locator('button').filter({ hasText: 'Eliminar' });
  86  |     await confirmBtn.click();
  87  | 
  88  |     await frame.locator('ion-loading').waitFor({ state: 'visible' });
  89  |     await frame.locator('ion-loading').waitFor({ state: 'hidden', timeout: 30000 });
  90  | 
  91  |     const toast = frame.locator('ion-toast');
  92  |     await expect(toast).toContainText('eliminado correctamente');
  93  | 
  94  |     await expect(frame.locator(`table.dv-table tbody tr:has-text("${firstRowText}")`)).toHaveCount(0);
  95  |   });
  96  | 
  97  |   test('Historia 17: Borrado Masivo UI selecciona filas múltiples y limpia el Grid', async () => {
  98  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  99  | 
  100 |     // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
  101 |     const btnPortafolio = frame.locator('#nav-item-Portafolio');
  102 |     await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
  103 |     await btnPortafolio.evaluate(node => node.click());
  104 | 
  105 |     // Ahora esperar a que la tabla de registros cargue
  106 |     const gridRows = frame.locator('table.dv-table tbody tr');
  107 |     await gridRows.first().waitFor({ state: 'visible', timeout: 60000 });
  108 | 
  109 |     const totalRows = await gridRows.count();
  110 |     test.skip(totalRows < 2, 'No hay suficientes filas para la prueba de borrado masivo');
  111 | 
  112 |     const row1Text = await gridRows.nth(0).locator('td').nth(1).innerText();
  113 |     const row2Text = await gridRows.nth(1).locator('td').nth(1).innerText();
  114 | 
  115 |     const cb1 = gridRows.nth(0).locator('.dv-row-checkbox');
  116 |     const cb2 = gridRows.nth(1).locator('.dv-row-checkbox');
  117 |     await cb1.check();
  118 |     await cb2.check();
  119 | 
  120 |     const bulkBtn = frame.locator('#dv-bulk-delete-btn');
  121 |     await bulkBtn.waitFor({ state: 'visible' });
  122 |     
  123 |     await bulkBtn.click();
  124 | 
  125 |     const alertModal = frame.locator('ion-alert');
  126 |     await alertModal.waitFor({ state: 'visible' });
  127 |     await expect(alertModal.locator('.alert-message')).toContainText('2 registros seleccionados');
  128 | 
  129 |     const confirmBtn = alertModal.locator('button').filter({ hasText: 'Eliminar' });
  130 |     await confirmBtn.click();
  131 | 
  132 |     await frame.locator('ion-loading').waitFor({ state: 'visible' });
  133 |     await frame.locator('ion-loading').waitFor({ state: 'hidden', timeout: 30000 });
  134 | 
  135 |     const toast = frame.locator('ion-toast');
  136 |     await expect(toast).toContainText('2 registros eliminados exitosamente');
  137 | 
  138 |     await expect(frame.locator(`table.dv-table tbody tr:has-text("${row1Text}")`)).toHaveCount(0);
  139 |     await expect(frame.locator(`table.dv-table tbody tr:has-text("${row2Text}")`)).toHaveCount(0);
  140 |   });
  141 | });
  142 | 
```