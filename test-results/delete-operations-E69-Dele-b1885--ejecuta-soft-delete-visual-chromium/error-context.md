# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: delete-operations.spec.js >> E69: Delete Operations (Individual & Bulk) en Entorno DEV Real >> Historia 16: Borrado Individual en UI renderiza ion-alert y ejecuta soft-delete visual
- Location: __tests__\e2e\delete-operations.spec.js:64:3

# Error details

```
Error: Sesión OAuth expirada o inexistente. Por favor ejecuta 'npm run e2e:login' primero.
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e6]:
        - generic [ref=e7]: Loading
        - progressbar [ref=e8]
      - main [ref=e15]:
        - generic [ref=e16]:
          - img [ref=e19]
          - heading "Choose an account" [level=1] [ref=e21]
        - list [ref=e32]:
          - listitem [ref=e33]:
            - link "José Gregorio Molina Guerrero gregoriomolinajose@gmail.com Signed out" [ref=e34] [cursor=pointer]:
              - generic [ref=e36]:
                - generic [ref=e38]:
                  - generic [ref=e39]: José Gregorio Molina Guerrero
                  - generic [ref=e40]: gregoriomolinajose@gmail.com
                - generic [ref=e41]: Signed out
          - listitem [ref=e42]:
            - link "Use another account" [ref=e43] [cursor=pointer]:
              - generic [ref=e44]:
                - img [ref=e46]
                - generic [ref=e49]: Use another account
          - listitem [ref=e50]:
            - link "Remove an account" [ref=e51] [cursor=pointer]:
              - generic [ref=e52]:
                - img [ref=e54]
                - generic [ref=e56]: Remove an account
    - contentinfo [ref=e61]:
      - combobox "Change language English (United States)" [ref=e65] [cursor=pointer]:
        - generic:
          - generic: English (United States)
        - generic:
          - img
      - list [ref=e67]:
        - listitem [ref=e68]:
          - link "Open Google Account Help Center (external, opens in a new window)" [ref=e69] [cursor=pointer]:
            - /url: https://support.google.com/accounts?hl=en-US&p=account_iph
            - text: Help
        - listitem [ref=e70]:
          - link "Privacy Policy (external, opens in a new window)" [ref=e71] [cursor=pointer]:
            - /url: https://accounts.google.com/TOS?loc=MX&hl=en-US&privacy=true
            - text: Privacy
        - listitem [ref=e72]:
          - link "Google Terms of Service (external, opens in a new window)" [ref=e73] [cursor=pointer]:
            - /url: https://accounts.google.com/TOS?loc=MX&hl=en-US
            - text: Terms
  - iframe [ref=e74]:
    
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
  10  |   test.beforeAll(async ({ browser }) => {
  11  |     test.setTimeout(200000);
  12  |     const path = require('path');
  13  |     const authDir = process.env.TEST_CHROME_PROFILE ? path.resolve(process.env.TEST_CHROME_PROFILE) : path.resolve('.auth');
  14  |     const authFile = path.join(authDir, 'user.json');
  15  | 
  16  |     const targetUrl = process.env.DEV_URL;
  17  |     page = await browser.newPage({
  18  |         storageState: authFile,
  19  |         baseURL: targetUrl
  20  |     });
  21  | 
  22  |     page.on('console', async msg => {
  23  |         const values = [];
  24  |         for (const arg of msg.args())
  25  |             values.push(await arg.jsonValue().catch(() => '<object>'));
  26  |         console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
  27  |     });
  28  | 
  29  |     if (!targetUrl) {
  30  |         throw new Error("[E2E Fatal] DEV_URL or PLAYWRIGHT_TEST_URL environment variable is strictly required.");
  31  |     }
  32  |     console.log(`Navigating to: ${targetUrl}`);
  33  |     try {
  34  |         await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 180000 });
  35  |     } catch (e) {
  36  |         console.log('Navigation error/timeout via goto. Forcing navigation via window.location.href...');
  37  |         await page.evaluate((url) => { window.location.href = url; }, targetUrl);
  38  |         // Esperamos unos segundos para que la navegación forzada surta efecto
  39  |         await page.waitForTimeout(5000);
  40  |     }
  41  | 
  42  |     if (page.url().includes('accounts.google.com')) {
> 43  |         throw new Error("Sesión OAuth expirada o inexistente. Por favor ejecuta 'npm run e2e:login' primero.");
      |               ^ Error: Sesión OAuth expirada o inexistente. Por favor ejecuta 'npm run e2e:login' primero.
  44  |     }
  45  |     
  46  |     // Esperar a que el sandbox construya el DOM. En Ionic, `ion-app` siempre existe.
  47  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  48  |     // En lugar de `ion-app`, esperamos algo que sí es visible
  49  |     try {
  50  |       await frame.locator('ion-content').first().waitFor({ state: 'attached', timeout: 120000 });
  51  |     } catch(e) {
  52  |       console.log('Timeout waiting for ion-content. Current page URL:', page.url());
  53  |       console.log('Current page title:', await page.title());
  54  |       const fs = require('fs');
  55  |       fs.writeFileSync('debug-page.html', await page.content());
  56  |       throw e;
  57  |     }
  58  |   });
  59  | 
  60  |   test.afterAll(async () => {
  61  |     if (context) await context.close();
  62  |   });
  63  | 
  64  |   test('Historia 16: Borrado Individual en UI renderiza ion-alert y ejecuta soft-delete visual', async () => {
  65  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  66  |     
  67  |     // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
  68  |     const btnPortafolio = frame.locator('#nav-item-Portafolio');
  69  |     await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
  70  |     await btnPortafolio.evaluate(node => node.click());
  71  |     
  72  |     // Forzar la vista de tabla (Lista) ya que Portafolios puede cargar en vista de Tarjetas por defecto
  73  |     const btnTableView = frame.locator('#dv-view-table-btn');
  74  |     await btnTableView.waitFor({ state: 'attached', timeout: 30000 });
  75  |     await btnTableView.evaluate(node => node.click());
  76  | 
  77  |     // Ahora esperar a que la tabla de registros cargue o que se muestre el estado vacío
  78  |     const gridRows = frame.locator('table.dv-table tbody tr');
  79  |     const emptyState = frame.locator('.dv-empty');
  80  |     
  81  |     // Esperar a que haya filas o se muestre el estado vacío
  82  |     try {
  83  |       await Promise.race([
  84  |         gridRows.first().waitFor({ state: 'visible', timeout: 15000 }),
  85  |         emptyState.waitFor({ state: 'visible', timeout: 15000 })
  86  |       ]);
  87  |     } catch(e) {}
  88  |     
  89  |     const rowCountBefore = await gridRows.count();
  90  |     test.skip(rowCountBefore === 0, 'No hay filas en Portafolios para probar el borrado');
  91  |     expect(rowCountBefore).toBeGreaterThan(0);
  92  | 
  93  |     // Capturar ID real de la fila desde el value del checkbox para validar que desaparece
  94  |     const firstRowId = await gridRows.first().locator('input.dv-row-checkbox').inputValue();
  95  | 
  96  |     const btnDelete = gridRows.first().locator('button[title="Eliminar"]');
  97  |     await btnDelete.waitFor({ state: 'visible' });
  98  |     await btnDelete.click();
  99  | 
  100 |     const alertModal = frame.locator('ion-alert:not(.overlay-hidden)');
  101 |     await alertModal.waitFor({ state: 'visible' });
  102 |     
  103 |     const alertHeader = await alertModal.locator('.alert-title').innerText();
  104 |     expect(alertHeader).toContain('Confirmar Borrado');
  105 | 
  106 |     // QA Fix: En el borrado individual, el botón dice "BORRAR", no "Eliminar"
  107 |     const confirmBtn = alertModal.locator('button').filter({ hasText: /borrar/i });
  108 |     await confirmBtn.click();
  109 |     
  110 |     // Esperamos a que la alerta de Ionic se cierre
  111 |     await alertModal.waitFor({ state: 'hidden', timeout: 15000 });
  112 | 
  113 |     // Forzar recarga optimista/red visual
  114 |     await page.waitForTimeout(1000);
  115 | 
  116 |     // QA Fix: Validamos que el checkbox con ese ID ya no exista en el DOM
  117 |     await expect(frame.locator(`table.dv-table tbody tr input.dv-row-checkbox[value="${firstRowId}"]`)).toHaveCount(0);
  118 |   });
  119 | 
  120 |   test('Historia 17: Borrado Masivo UI selecciona filas múltiples y limpia el Grid', async () => {
  121 |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  122 | 
  123 |     // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
  124 |     const btnPortafolio = frame.locator('#nav-item-Portafolio');
  125 |     await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
  126 |     await btnPortafolio.evaluate(node => node.click());
  127 | 
  128 |     // Forzar la vista de tabla (Lista) ya que Portafolios puede cargar en vista de Tarjetas por defecto
  129 |     const btnTableView = frame.locator('#dv-view-table-btn');
  130 |     await btnTableView.waitFor({ state: 'attached', timeout: 30000 });
  131 |     await btnTableView.evaluate(node => node.click());
  132 | 
  133 |     // Ahora esperar a que la tabla de registros cargue o que se muestre el estado vacío
  134 |     const gridRows = frame.locator('table.dv-table tbody tr');
  135 |     const emptyState = frame.locator('.dv-empty');
  136 | 
  137 |     // Esperar a que haya filas o se muestre el estado vacío
  138 |     try {
  139 |       await Promise.race([
  140 |         gridRows.first().waitFor({ state: 'visible', timeout: 15000 }),
  141 |         emptyState.waitFor({ state: 'visible', timeout: 15000 })
  142 |       ]);
  143 |     } catch(e) {}
```