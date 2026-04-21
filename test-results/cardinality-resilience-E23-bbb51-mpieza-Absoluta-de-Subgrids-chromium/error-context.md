# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cardinality-resilience.spec.js >> E23: Cardinilidad TopolÃ³gica y Resiliencia SCD-2 >> Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids
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
  80  |     // Bypass strict expect which often fails with Ionic Web Components
  81  |     await btnGuardar.waitFor({ state: 'attached', timeout: 15000 }).catch(()=>{});
  82  |     await btnGuardar.evaluate(btn => {
  83  |         if (!btn.disabled) btn.click({ force: true });
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
  99  |         const containerPortA = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
  100 |         await containerPortA.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
  101 |         
  102 |         if (await containerPortA.isVisible()) {
  103 |             await containerPortA.evaluate(el => el.executeSearchAndOpen());
  104 |             const btnCreatePort = containerPortA.locator('ion-item').filter({ hasText: 'Crear' }).last();
  105 |             await btnCreatePort.waitFor({ state: 'visible', timeout: 8000 });
  106 |             await btnCreatePort.click({ force: true });
  107 |         }
  108 |  
  109 |         await fillTopInput(frame, 'nombre', portafolioName);
  110 |         console.log("Saving new portafolio...");
  111 |         await submitHybridForm(frame, page, 'Guardar Portafolio');
  112 | 
  113 |         
  114 |         console.log("Saving UN A...");
  115 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  116 |  // Wait for global UI refresh
  117 |         
  118 |         // 2. Crear UN B e intentar Robar el Portafolio
  119 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  120 |         await fillTopInput(frame, 'nombre', 'UN B (Padre LadrÃ³n) ' + Date.now());
  121 |         
  122 |         console.log("Linking UN B...");
  123 |         const containerPortB = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
  124 |         await containerPortB.evaluate(el => el.executeSearchAndOpen());
  125 |         
  126 |         // Seleccionar el Portafolio interactivo (puede venir del inline-list)
  127 |         const popoverPortListB = containerPortB.locator('ion-item').filter({ hasText: portafolioName }).first();
  128 |         await popoverPortListB.waitFor({ state: 'visible', timeout: 8000 });
  129 |         await popoverPortListB.click({ force: true });
  130 |         
  131 |         // Modal cierra por Escape
  132 |         await page.keyboard.press('Escape');
  133 |         
  134 |         // UN B ahora reclama tener a ese Portafolio
  135 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  136 |  
  137 | 
  138 |         // Probaremos la Limpieza Absoluta (Escenario 1.3):
  139 |         await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
  140 |         await fillTopInput(frame, 'nombre', 'UN C (Empty) ' + Date.now());
  141 |         
  142 |         console.log("Linking UN C...");
  143 |         const containerPortC = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
  144 |         await containerPortC.evaluate(el => el.executeSearchAndOpen());
  145 | 
  146 |         const someItems = containerPortC.locator('ion-item').filter({ hasText: 'Portafolio' }).first();
  147 |         await someItems.waitFor({ state: 'visible', timeout: 8000 });
  148 |         await someItems.click({ force: true });
  149 |         
  150 |         // Salir
  151 |         await page.keyboard.press('Escape');
  152 |   
  153 | 
  154 |         // Limpiar (Desvincular con X - Badge de TXSearchable)
  155 |         const removeBtn = containerPortC.locator('ion-chip ion-icon[name="close-circle"]').first();
  156 |         if (await removeBtn.isVisible()) {
  157 |             await removeBtn.click({ force: true });
  158 |         }
  159 | 
  160 | 
  161 |         // Guardar (Subgrid vacÃ­o)
  162 |         await submitHybridForm(frame, page, 'Guardar Unidad');
  163 |         
  164 |         // Si el guardado fue exitoso y Toast aparece, early-return M:N / 1:N no abortÃ³ la operaciÃ³n prematuramente.
  165 |         const toast = frame.locator('ion-toast').filter({ hasText: 'Ã©xito' });
  166 |         await expect(toast).toBeVisible({ timeout: 10000 });
  167 |     } catch(err) {
  168 |         console.error("DEBUG FATAL PLAYWRIGHT:", err);
> 169 |         await page.screenshot({ path: 'artifacts/pw_error.png' });
      |                    ^ Error: page.screenshot: Target page, context or browser has been closed
  170 |         throw err;
  171 |     }
  172 |   });
  173 | 
  174 | });
  175 | 
```