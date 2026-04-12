# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard-counters.spec.js >> E28: Dashboard Counters Visibility >> Los contadores del dashboard deben renderizar datos nÃºmericos en lugar de spinners (... o vacÃ­os)
- Location: __tests__\e2e\dashboard-counters.spec.js:49:3

# Error details

```
Error: expect(received).toMatch(expected)

Expected pattern: /^(\d+|-1)$/
Received string:  ""
```

# Test source

```ts
  1  | const { test, expect, chromium } = require('@playwright/test');
  2  | 
  3  | let context;
  4  | let page;
  5  | 
  6  | test.describe('E28: Dashboard Counters Visibility', () => {
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
  34 |     await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
  35 |     
  36 |     if (page.url().includes('accounts.google.com')) {
  37 |         console.log("ESPERANDO LOGIN MANUAL...");
  38 |         await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
  39 |     }
  40 | 
  41 |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  42 |     await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  43 |     
  44 |     // Wait for the framework to be ready and dashboard to be active
  45 |     await frame.locator('ion-card').first().waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
  46 | 
  47 |   });
  48 | 
  49 |   test('Los contadores del dashboard deben renderizar datos nÃºmericos en lugar de spinners (... o vacÃ­os)', async () => {
  50 |       const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  51 |       
  52 |       // Select the Portafolios Card
  53 |       const portafoliosCard = frame.locator('ion-card').filter({ hasText: 'Portafolios' });
  54 |       await expect(portafoliosCard).toBeVisible();
  55 | 
  56 |       const portafoliosTotal = portafoliosCard.locator('[data-dsh-total]');
  57 |       await expect(portafoliosTotal).toBeVisible();
  58 | 
  59 |       // Wait max 10s for the spinner '...' to turn into a number or '-'
  60 |       await expect(portafoliosTotal).not.toHaveText('...', { timeout: 10000 });
  61 |       
  62 |       // Verify that it is an integer >= 0, or '-' if completely empty
  63 |       const text = await portafoliosTotal.textContent();
  64 |       const numPattern = /^(\d+|-1)$/;
> 65 |       expect(text.trim()).toMatch(numPattern);
     |                           ^ Error: expect(received).toMatch(expected)
  66 | 
  67 |       const equiposCard = frame.locator('ion-card').filter({ hasText: 'Equipos' });
  68 |       const equiposTotal = equiposCard.locator('[data-dsh-total]');
  69 |       await expect(equiposTotal).not.toHaveText('...', { timeout: 15000 });
  70 |       expect((await equiposTotal.textContent()).trim()).toMatch(numPattern);
  71 | 
  72 |       const personasCard = frame.locator('ion-card').filter({ hasText: 'Personas' });
  73 |       const personasTotal = personasCard.locator('[data-dsh-total]');
  74 |       await expect(personasTotal).not.toHaveText('...', { timeout: 15000 });
  75 |       expect((await personasTotal.textContent()).trim()).toMatch(numPattern);
  76 |   });
  77 | 
  78 |   test('El bootstrap del dashboard no debe emitir errores de deserializaciÃ³n IPC', async () => {
  79 |       let deserializeErrorSeen = false;
  80 |       page.on('console', msg => {
  81 |           if (msg.text().includes('deserialize threw error') || msg.text().includes('dropping postMessage')) {
  82 |               deserializeErrorSeen = true;
  83 |           }
  84 |       });
  85 | 
  86 |       // Recarga forzada para capturar todo el flujo
  87 |       await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
  88 |       const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  89 |       await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  90 | 
  91 |       // Verificar dashboard cards resolve
  92 |       await frame.locator('ion-card').filter({ hasText: 'Portafolios' }).locator('[data-dsh-total]').waitFor({ state: 'visible' });
  93 |  // 5s headroom para que deserialize asome si existiese
  94 | 
  95 |       expect(deserializeErrorSeen).toBe(false);
  96 |   });
  97 | });
  98 | 
```