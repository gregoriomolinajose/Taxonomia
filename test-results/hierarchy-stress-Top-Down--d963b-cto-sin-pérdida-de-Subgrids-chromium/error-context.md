# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hierarchy-stress.spec.js >> Top-Down Hierarchy Stress Test & Race Conditions >> Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids
- Location: __tests__\e2e\hierarchy-stress.spec.js:93:3

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Test source

```ts
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
  74  |     await btnLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(e => console.log(`[WARN] Button with text ${text} did not attach.`));
  75  |     await btnLocator.click({ force: true }).catch(e => console.log(`[ERROR] Button with text ${text} click failed.`, e));
  76  | }
  77  | 
  78  | async function submitHybridForm(frame, page, text) {
  79  |     const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
  80  |     let iter = 0;
  81  |     while(iter < 5) {
  82  |         const isVisible = await btnSiguiente.isVisible().catch(() => false);
  83  |         if (!isVisible) break;
  84  |         await btnSiguiente.click({ force: true });
  85  |         await page.waitForTimeout(500);
  86  |         iter++;
  87  |     }
  88  |     await clickTopButtonByText(frame, text);
  89  | }
  90  | // --------------------------------------------------------------------------
  91  | 
  92  |   // Nota importante: Al usar nuestro propio "page", le decimos a Playwright que no inyecte el suyo ({ page }) 
  93  |   test('Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids', async () => {
  94  |     // Aumentar un poco el timeout de la prueba en caso Playwright tarde en sincronizar subgrids
  95  |     test.setTimeout(180_000);
  96  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  97  |     
  98  |     // =========================================================================
  99  |     // 1. CREAR UNIDAD DE NEGOCIO (Level 1)
  100 |     // =========================================================================
  101 |     await frame.locator('body').evaluate(() => {
  102 |         window.renderForm('Unidad_Negocio', {});
  103 |     });
  104 |     
  105 |     await fillTopInput(frame, 'nombre', 'UN E2E Autofocus ' + Date.now());
  106 | 
  107 |     // =========================================================================
  108 |     // 2. STRESS TEST: Crear 3 Portafolios y 3 Grupos X Portafolio simultáneamente
  109 |     // =========================================================================
  110 |     for (let p = 1; p <= 3; p++) {
  111 |         await clickTopButtonById(frame, 'btn-create-new'); // Crea un Portafolio
> 112 |         await page.waitForTimeout(500); // Animación Drawer
      |                    ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  113 | 
  114 |         await fillTopInput(frame, 'nombre', `Portafolio E2E Loop #${p} - ${Date.now()}`);
  115 | 
  116 |         for (let g = 1; g <= 3; g++) {
  117 |             await clickTopButtonById(frame, 'btn-create-new'); // Crea un Grupo dentro del Portafolio
  118 |             await page.waitForTimeout(500);
  119 | 
  120 |             await fillTopInput(frame, 'nombre', `Grupo E2E Loop #${g} - ${Date.now()}`);
  121 |             // El modelo de negocio es 'required' y sin él, el submit falla en arquitectura linear!
  122 |             await fillTopInput(frame, 'modelo_negocio', 'SaaS');
  123 |             
  124 |             // Reemplazo Híbrido Stepper/Linear
  125 |             await submitHybridForm(frame, page, 'Guardar Grupo');
  126 |             
  127 |             await page.waitForTimeout(1500); // Wait mutex de Google Apps Script Write
  128 |         }
  129 | 
  130 |         await submitHybridForm(frame, page, 'Guardar Portafolio');
  131 |         await page.waitForTimeout(2000); // Wait mutex de Portafolio
  132 |     }
  133 | 
  134 |     // =========================================================================
  135 |     // 3. ASSERT: Validar que TODOS los Portafolios (3) sobrevivieron a las condiciones de carrera del DOM
  136 |     // =========================================================================
  137 |     const childItems = frame.locator('ion-item').filter({ hasText: 'Portafolio E2E Loop #' });
  138 |     await expect(childItems).toHaveCount(3);
  139 | 
  140 |     // Guardar UN
  141 |     await submitHybridForm(frame, page, 'Guardar Unidad');
  142 | 
  143 |     await page.waitForTimeout(3000);
  144 |     console.log("Ruta Crítica Superada. El Multi-nivel Subgrid conservó su estado Optimista.");
  145 |   });
  146 | });
  147 | 
```