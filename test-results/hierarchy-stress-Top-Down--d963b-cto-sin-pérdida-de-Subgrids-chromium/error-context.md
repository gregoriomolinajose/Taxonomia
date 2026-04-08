# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hierarchy-stress.spec.js >> Top-Down Hierarchy Stress Test & Race Conditions >> Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids
- Location: __tests__\e2e\hierarchy-stress.spec.js:94:3

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.evaluate: Target page, context or browser has been closed
```

# Test source

```ts
  1   | const { test, expect, chromium } = require('@playwright/test');
  2   | 
  3   | let context;
  4   | let page;
  5   | 
  6   | test.describe('Top-Down Hierarchy Stress Test & Race Conditions', () => {
  7   | 
  8   |   test.beforeAll(async () => {
  9   |     // Usamos el Perfil Nativo Persistente para que Google no nos detecte como Bot Inyector
  10  |     const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
  11  |     context = await chromium.launchPersistentContext(authDir, {
  12  |         headless: false,
  13  |         channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  14  |         args: [
  15  |             '--disable-blink-features=AutomationControlled',
  16  |             '--no-sandbox'
  17  |         ]
  18  |     });
  19  |     page = await context.newPage();
  20  | 
  21  |     // Capturar logs internos de la página para depuración
  22  |     page.on('console', async msg => {
  23  |         const values = [];
  24  |         for (const arg of msg.args())
  25  |             values.push(await arg.jsonValue().catch(() => '<object>'));
  26  |         console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
  27  |     });
  28  |   });
  29  | 
  30  |   test.afterAll(async () => {
  31  |     await context.close();
  32  |   });
  33  | 
  34  |   test.beforeEach(async () => {
  35  |     // 1. Navegar al Endpoint Ejecutivo
  36  |     await page.goto('https://script.google.com/macros/s/AKfycbz1wK6yVfTuUe3kv35k45IULLBVya51t6HDXUZHNP-6rI9Nh_PEctWZseGyoQiQ2HxkIw/exec');
  37  |     
  38  |     // Si Google nos mandó al Login, pausamos amigablemente para que llenes tus credenciales
  39  |     if (page.url().includes('accounts.google.com')) {
  40  |         console.log("==============================================");
  41  |         console.log("ESPERANDO LOGIN MANUAL (Tienes 120 segundos)");
  42  |         console.log("==============================================");
  43  |         await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
  44  |     }
  45  | 
  46  |     // Esperar a que Taxonomia se hidrate dentro del doble iframe de Google Apps Script
  47  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  48  |     await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 60000 });
  49  |   });
  50  | 
  51  | // --- Helpers de Traversal DOM (Page Object Abstraction para Ionic Drawers) ---
  52  | async function fillTopInput(frame, name, value) {
  53  |     const selector = `[name="${name}"]`;
  54  |     // Usamos Playwright nativo para asegurar la asincronía y evitar undefined TypeErrors
  55  |     const inputLocator = frame.locator(selector).last();
  56  |     await inputLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(() => console.log(`[WARN] input ${name} no renderizó a tiempo`));
  57  |     
  58  |     await inputLocator.evaluate((el, v) => {
  59  |         el.value = v;
  60  |         el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
  61  |         el.dispatchEvent(new Event('input', { bubbles: true }));
  62  |     }, value).catch(e => console.log(`[ERROR] evaluate en ${name}:`, e));
  63  | }
  64  | 
  65  | async function clickTopButtonById(frame, id) {
  66  |     const selector = `ion-button#${id}`;
  67  |     const btnLocator = frame.locator(selector).last();
  68  |     await btnLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(e => console.log(`[WARN] Button ${id} did not attach.`));
  69  |     await btnLocator.click({ force: true }).catch(e => console.log(`[ERROR] Button ${id} click failed.`, e));
  70  | }
  71  | 
  72  | async function clickTopButtonByText(frame, text) {
  73  |     const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
> 74  |     await btnLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(e => console.log(`[WARN] Button with text ${text} did not attach.`));
      |                                 ^ Error: locator.evaluate: Target page, context or browser has been closed
  75  |     await btnLocator.click({ force: true }).catch(e => console.log(`[ERROR] Button with text ${text} click failed.`, e));
  76  | }
  77  | // --------------------------------------------------------------------------
  78  | 
  79  |   // Nota importante: Al usar nuestro propio "page", le decimos a Playwright que no inyecte el suyo ({ page }) 
  80  |   test('Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids', async () => {
  81  |     // Aumentar un poco el timeout de la prueba en caso Playwright tarde en sincronizar subgrids
  82  |     test.setTimeout(180_000);
  83  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  84  |     
  85  |     // =========================================================================
  86  |     // 1. CREAR UNIDAD DE NEGOCIO (Level 1)
  87  |     // =========================================================================
  88  |     await frame.locator('body').evaluate(() => {
  89  |         window.renderForm('Unidad_Negocio', {});
  90  |     });
  91  |     
  92  |     await fillTopInput(frame, 'nombre', 'UN E2E Autofocus ' + Date.now());
  93  | 
  94  |     // =========================================================================
  95  |     // 2. STRESS TEST: Crear 3 Portafolios y 3 Grupos X Portafolio simultáneamente
  96  |     // =========================================================================
  97  |     // Sin stepper, todo se renderiza on scroll. No ocupamos clickHeaderButton.
  98  | 
  99  |     for (let p = 1; p <= 3; p++) {
  100 |         await clickTopButtonById(frame, 'btn-create-new'); // Crea un Portafolio
  101 |         await page.waitForTimeout(500); // Animación Drawer
  102 | 
  103 |         await fillTopInput(frame, 'nombre', `Portafolio E2E Loop #${p} - ${Date.now()}`);
  104 | 
  105 |         for (let g = 1; g <= 3; g++) {
  106 |             await clickTopButtonById(frame, 'btn-create-new'); // Crea un Grupo dentro del Portafolio
  107 |             await page.waitForTimeout(500);
  108 | 
  109 |             await fillTopInput(frame, 'nombre', `Grupo E2E Loop #${g} - ${Date.now()}`);
  110 |             // El modelo de negocio es 'required' y sin él, el submit falla en arquitectura linear!
  111 |             await fillTopInput(frame, 'modelo_negocio', 'SaaS');
  112 |             await clickTopButtonByText(frame, 'Guardar Grupo');
  113 |             
  114 |             await page.waitForTimeout(1500); // Wait mutex de Google Apps Script Write
  115 |         }
  116 | 
  117 |         await clickTopButtonByText(frame, 'Guardar Portafolio');
  118 |         await page.waitForTimeout(2000); // Wait mutex de Portafolio
  119 |     }
  120 | 
  121 |     // =========================================================================
  122 |     // 3. ASSERT: Validar que TODOS los Portafolios (3) sobrevivieron a las condiciones de carrera del DOM
  123 |     // =========================================================================
  124 |     const childItems = frame.locator('ion-item').filter({ hasText: 'Portafolio E2E Loop #' });
  125 |     await expect(childItems).toHaveCount(3);
  126 | 
  127 |     // Guardar UN
  128 |     await clickTopButtonByText(frame, 'Guardar Unidad');
  129 | 
  130 |     await page.waitForTimeout(3000);
  131 |     console.log("Ruta Crítica Superada. El Multi-nivel Subgrid conservó su estado Optimista.");
  132 |   });
  133 | });
  134 | 
```