# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cardinality-resilience.spec.js >> E23: Cardinilidad Topológica y Resiliencia SCD-2 >> Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids
- Location: __tests__\e2e\cardinality-resilience.spec.js:89:3

# Error details

```
Test timeout of 280000ms exceeded.
```

```
Error: page.screenshot: Target page, context or browser has been closed
```

# Test source

```ts
  55  | 
  56  | async function clickTopButtonById(frame, id) {
  57  |     const btnLocator = frame.locator(`[id="${id}"]`).last();
  58  |     await btnLocator.waitFor({ state: 'attached', timeout: 5000 });
  59  |     await btnLocator.evaluate(btn => btn.click());
  60  | }
  61  | 
  62  | async function clickTopButtonByText(frame, text) {
  63  |     const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
  64  |     await btnLocator.waitFor({ state: 'attached', timeout: 5000 });
  65  |     await btnLocator.evaluate(btn => btn.click());
  66  | }
  67  | 
  68  | async function submitHybridForm(frame, page, text) {
  69  |     const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
  70  |     let iter = 0;
  71  |     while(iter < 5) {
  72  |         if (await btnSiguiente.count() === 0) break;
  73  |         const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
  74  |         if (isHidden) break;
  75  |         await btnSiguiente.evaluate(btn => btn.click());
  76  |         await page.waitForTimeout(500);
  77  |         iter++;
  78  |     }
  79  |     const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
  80  |     // Bypass strict expect which often fails with Ionic Web Components
  81  |     await btnGuardar.waitFor({ state: 'attached', timeout: 5000 }).catch(()=>{});
  82  |     await btnGuardar.evaluate(btn => {
  83  |         if (!btn.disabled) btn.click();
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
  100 |         await page.waitForTimeout(1000);
  101 |         await clickTopButtonById(frame, 'btn-create-new'); 
  102 |         await page.waitForTimeout(500); 
  103 |         await fillTopInput(frame, 'nombre', portafolioName);
  104 |         console.log("Saving new portafolio...");
  105 |         await submitHybridForm(frame, page, 'Guardar Portafolio');
  106 |         await page.waitForTimeout(2000);
  107 |         
  108 |         console.log("Saving UN A...");
  109 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  110 |         await page.waitForTimeout(4000); // Wait for global UI refresh
  111 |         
  112 |         // 2. Crear UN B e intentar Robar el Portafolio
  113 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  114 |         await fillTopInput(frame, 'nombre', 'UN B (Padre Ladrón) ' + Date.now());
  115 |         
  116 |         console.log("Linking UN B...");
  117 |         await clickTopButtonByText(frame, 'Agregar');
  118 |         await page.waitForTimeout(1000); // Wait relation builder modal
  119 |         
  120 |         // Seleccionar el Portafolio que pertenece a la UN A
  121 |         const listItems = frame.locator('ion-item').filter({ hasText: portafolioName });
  122 |         await listItems.first().click();
  123 |         await clickTopButtonByText(frame, 'Vincular');
  124 |         await page.waitForTimeout(1000); 
  125 |         
  126 |         // UN B ahora reclama tener a ese Portafolio
  127 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  128 |         await page.waitForTimeout(4000); 
  129 | 
  130 |         // Probaremos la Limpieza Absoluta (Escenario 1.3):
  131 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  132 |         await fillTopInput(frame, 'nombre', 'UN C (Empty) ' + Date.now());
  133 |         
  134 |         console.log("Linking UN C...");
  135 |         await clickTopButtonByText(frame, 'Agregar');
  136 |         await page.waitForTimeout(1000);
  137 |         const someItems = frame.locator('ion-label').filter({ hasText: 'Portafolio' }).first();
  138 |         await someItems.click();
  139 |         await clickTopButtonByText(frame, 'Vincular');
  140 |         await page.waitForTimeout(1000); 
  141 | 
  142 |         // Limpiar (Desvincular con X)
  143 |         const removeBtn = frame.locator('ion-button[color="danger"]').first();
  144 |         await removeBtn.click();
  145 |         await page.waitForTimeout(500);
  146 | 
  147 |         // Guardar (Subgrid vacío)
  148 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  149 |         
  150 |         // Si el guardado fue exitoso y Toast aparece, early-return M:N / 1:N no abortó la operación prematuramente.
  151 |         const toast = frame.locator('ion-toast').filter({ hasText: 'éxito' });
  152 |         await expect(toast).toBeVisible({ timeout: 10000 });
  153 |     } catch(err) {
  154 |         console.error("DEBUG FATAL PLAYWRIGHT:", err);
> 155 |         await page.screenshot({ path: 'artifacts/pw_error.png' });
      |                    ^ Error: page.screenshot: Target page, context or browser has been closed
  156 |         throw err;
  157 |     }
  158 |   });
  159 | 
  160 | });
  161 | 
```