# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hierarchy-stress.spec.js >> Top-Down Hierarchy Stress Test & Race Conditions >> Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids
- Location: __tests__\e2e\hierarchy-stress.spec.js:101:3

# Error details

```
Test timeout of 180000ms exceeded.
```

```
Error: page.waitForTimeout: Target page, context or browser has been closed
```

# Test source

```ts
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
  82  |         if (await btnSiguiente.count() === 0) break;
  83  |         // Evaluar la presencialidad del ocultador Ionic en lugar de la visibilidad abstracta
  84  |         const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
  85  |         if (isHidden) break;
  86  |         
  87  |         await btnSiguiente.click({ force: true });
  88  |         // Reducimos 90% el Test Muda. Solo micro-latencia para repintado local
  89  |         await page.waitForTimeout(50);
  90  |         iter++;
  91  |     }
  92  |     
  93  |     // Auto-polling resiliente de Playwright contra el DOM mutante de FormStepper
  94  |     const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
  95  |     await expect(btnGuardar).not.toHaveClass(/ion-hide/, { timeout: 2000 });
  96  |     await clickTopButtonByText(frame, text);
  97  | }
  98  | // --------------------------------------------------------------------------
  99  | 
  100 |   // Nota importante: Al usar nuestro propio "page", le decimos a Playwright que no inyecte el suyo ({ page }) 
  101 |   test('Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids', async () => {
  102 |     // Aumentar un poco el timeout de la prueba en caso Playwright tarde en sincronizar subgrids
  103 |     test.setTimeout(180_000);
  104 |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  105 |     
  106 |     // =========================================================================
  107 |     // 1. CREAR UNIDAD DE NEGOCIO (Level 1)
  108 |     // =========================================================================
  109 |     await frame.locator('body').evaluate(() => {
  110 |         window.renderForm('Unidad_Negocio', {});
  111 |     });
  112 |     
  113 |     await fillTopInput(frame, 'nombre', 'UN E2E Autofocus ' + Date.now());
  114 | 
  115 |     // =========================================================================
  116 |     // 2. STRESS TEST: Crear 3 Portafolios y 3 Grupos X Portafolio simultáneamente
  117 |     // =========================================================================
  118 |     for (let p = 1; p <= 3; p++) {
  119 |         await clickTopButtonById(frame, 'btn-create-new'); // Crea un Portafolio
> 120 |         await page.waitForTimeout(500); // Animación Drawer
      |                    ^ Error: page.waitForTimeout: Target page, context or browser has been closed
  121 | 
  122 |         await fillTopInput(frame, 'nombre', `Portafolio E2E Loop #${p} - ${Date.now()}`);
  123 | 
  124 |         for (let g = 1; g <= 3; g++) {
  125 |             await clickTopButtonById(frame, 'btn-create-new'); // Crea un Grupo dentro del Portafolio
  126 |             await page.waitForTimeout(500);
  127 | 
  128 |             await fillTopInput(frame, 'nombre', `Grupo E2E Loop #${g} - ${Date.now()}`);
  129 |             // El modelo de negocio es 'required' y sin él, el submit falla en arquitectura linear!
  130 |             await fillTopInput(frame, 'modelo_negocio', 'SaaS');
  131 |             
  132 |             // Reemplazo Híbrido Stepper/Linear
  133 |             await submitHybridForm(frame, page, 'Guardar Grupo');
  134 |             
  135 |             await page.waitForTimeout(1500); // Wait mutex de Google Apps Script Write
  136 |         }
  137 | 
  138 |         await submitHybridForm(frame, page, 'Guardar Portafolio');
  139 |         await page.waitForTimeout(2000); // Wait mutex de Portafolio
  140 |     }
  141 | 
  142 |     // =========================================================================
  143 |     // 3. ASSERT: Validar que TODOS los Portafolios (3) sobrevivieron a las condiciones de carrera del DOM
  144 |     // =========================================================================
  145 |     const childItems = frame.locator('ion-item').filter({ hasText: 'Portafolio E2E Loop #' });
  146 |     await expect(childItems).toHaveCount(3);
  147 | 
  148 |     // Guardar UN
  149 |     await submitHybridForm(frame, page, 'Guardar Unidad');
  150 | 
  151 |     await page.waitForTimeout(3000);
  152 |     console.log("Ruta Crítica Superada. El Multi-nivel Subgrid conservó su estado Optimista.");
  153 |   });
  154 | });
  155 | 
```