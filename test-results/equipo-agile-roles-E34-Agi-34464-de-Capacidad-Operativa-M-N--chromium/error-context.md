# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: equipo-agile-roles.spec.js >> E34: Agile Census Subgrids and 1:1 Alignments >> La ficha de Equipo debe separar Roles de Liderazgo Múltiple (1:1) de Capacidad Operativa (M:N)
- Location: __tests__\e2e\equipo-agile-roles.spec.js:37:3

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.click: Target page, context or browser has been closed
```

# Test source

```ts
  1  | const { test, expect, chromium } = require('@playwright/test');
  2  | 
  3  | let context;
  4  | let page;
  5  | 
  6  | test.describe('E34: Agile Census Subgrids and 1:1 Alignments', () => {
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
  19 |   });
  20 | 
  21 |   test.afterAll(async () => {
  22 |     await context.close();
  23 |   });
  24 | 
  25 |   test.beforeEach(async () => {
  26 |     await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
  27 |     
  28 |     if (page.url().includes('accounts.google.com')) {
  29 |         await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
  30 |     }
  31 | 
  32 |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  33 |     await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  34 |     await frame.locator('ion-card').first().waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
  35 |   });
  36 | 
  37 |   test('La ficha de Equipo debe separar Roles de Liderazgo Múltiple (1:1) de Capacidad Operativa (M:N)', async () => {
  38 |       const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  39 |       
  40 |       // Navigate to Equipos
  41 |       await frame.locator('ion-menu-button').click().catch(()=>null);
> 42 |       await frame.locator('ion-item').filter({ hasText: 'Equipos' }).click({ timeout: 10000 });
     |                                                                      ^ Error: locator.click: Target page, context or browser has been closed
  43 |       
  44 |       // Wait for Table to render rows
  45 |       await frame.locator('ion-item').filter({ hasText: 'Ver Detalles' }).first().waitFor({ state: 'visible', timeout: 20000 });
  46 |       
  47 |       // Open the first Equipo
  48 |       await frame.locator('ion-item').filter({ hasText: 'Ver Detalles' }).first().click();
  49 | 
  50 |       // Wait for Drawer
  51 |       await frame.locator('ion-drawer, ion-modal, .form-container').first().waitFor({ state: 'visible', timeout: 15000 });
  52 | 
  53 |       // Verify 1:1 Roles exist as Single Selects structurally
  54 |       const smSelect = frame.locator('tx-searchable[data-form-component="scrum_master_id"], ion-select[name="scrum_master_id"], ion-input[name="scrum_master_id"]');
  55 |       const poSelect = frame.locator('tx-searchable[data-form-component="product_owner_id"], ion-select[name="product_owner_id"], ion-input[name="product_owner_id"]');
  56 |       const rteSelect = frame.locator('tx-searchable[data-form-component="rte_id"], ion-select[name="rte_id"], ion-input[name="rte_id"]');
  57 |       
  58 |       expect(await smSelect.count()).toBeGreaterThanOrEqual(0); // Optional depending on view logic, but normally visible
  59 |       
  60 |       // Verify Subgrid for "Personas Asignadas"
  61 |       const subgridContainer = frame.locator('tx-searchable[data-form-component="miembros_vinculados"], tx-searchable[data-form-component="miembros"], div[data-form-component="miembros"]').last();
  62 |       const subgridTitle = subgridContainer.locator('strong', { hasText: /Personas Asignadas/ });
  63 |       
  64 |       if (await subgridContainer.isVisible()) {
  65 |           if (await subgridContainer.isVisible()) {
  66 |               await subgridContainer.evaluate(el => el.executeSearchAndOpen());
  67 |               
  68 |               // TXSearchable renderiza ion-list dentro de ion-popover/ion-modal O In-Line para Multi-select
  69 |               const overlayList = subgridContainer.locator('ion-list').last();
  70 |               await overlayList.waitFor({ state: 'visible', timeout: 8000 });
  71 | 
  72 |               // Cerramos el modal usando Escape
  73 |               await page.keyboard.press('Escape');
  74 |           }
  75 |       }
  76 |       
  77 |   });
  78 | 
  79 | });
  80 | 
```