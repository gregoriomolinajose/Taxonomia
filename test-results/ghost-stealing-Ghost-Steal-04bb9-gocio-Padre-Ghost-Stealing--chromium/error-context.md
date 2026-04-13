# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ghost-stealing.spec.js >> Ghost Stealing Bug Resistance Test >> Validar que actualizar Subgrid de Portafolio NO desvincula a su Unidad de Negocio Padre (Ghost Stealing)
- Location: __tests__\e2e\ghost-stealing.spec.js:97:3

# Error details

```
Error: 🚨 GHOST STEALING BUG DETECTADO: El Portafolio perdió a su Padre (Unidad Negocio) tras agregar un hijo (Grupo Productos).
```

# Test source

```ts
  59  |   }
  60  | 
  61  |   async function setSelectValueByText(frame, selectName, txtValue) {
  62  |       const selectLocator = frame.locator(`ion-select[name="${selectName}"]`).last();
  63  |       try {
  64  |           await selectLocator.waitFor({ state: 'attached', timeout: 15000 });
  65  |           // Force click to open select
  66  |           await selectLocator.evaluate(n => n.dispatchEvent(new Event('click', { bubbles: true })));
  67  |           
  68  |           const alertWindow = frame.locator('ion-alert').last();
  69  |           await alertWindow.waitFor({ state: 'visible', timeout: 5000 });
  70  |           
  71  |           await alertWindow.locator('button').filter({ hasText: txtValue }).first().click();
  72  |           await alertWindow.locator('button').filter({ hasText: 'OK' }).first().click();
  73  |       } catch(e) {
  74  |           console.log(`[WARN] No se pudo seleccionar ${txtValue} en ${selectName}`);
  75  |       }
  76  |   }
  77  | 
  78  |   async function clickTopButtonByText(frame, text) {
  79  |       const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
  80  |       try {
  81  |           await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
  82  |           if(await btnLocator.count() > 0) {
  83  |               await btnLocator.click({ force: true }).catch(e => {});
  84  |           }
  85  |       } catch(e) {}
  86  |   }
  87  | 
  88  |   async function submitHybridForm(frame, page, text) {
  89  |       const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
  90  |       await expect(btnGuardar).not.toHaveClass(/ion-hide/, { timeout: 2000 }).catch(() => {});
  91  |       await clickTopButtonByText(frame, text);
  92  |       await btnGuardar.waitFor({ state: 'hidden', timeout: 35000 }).catch(() => {});
  93  |   }
  94  | 
  95  |   // --------------------------------------------------------------------------
  96  | 
  97  |   test('Validar que actualizar Subgrid de Portafolio NO desvincula a su Unidad de Negocio Padre (Ghost Stealing)', async () => {
  98  |     test.setTimeout(300_000);
  99  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  100 |     
  101 |     // 1. Crear UN Independiente
  102 |     await frame.locator('body').evaluate(() => { window.renderForm('Unidad_Negocio', {}); });
  103 |     const unName = 'UN PADRE GHOST ' + Date.now();
  104 |     await fillTopInput(frame, 'nombre', unName);
  105 |     await submitHybridForm(frame, page, 'Guardar Unidad');
  106 |     
  107 |     // 2. Crear Portafolio Asignado a esa UN
  108 |     await frame.locator('body').evaluate(() => { window.renderForm('Portafolio', {}); });
  109 |     const portName = 'PORT GHOST ' + Date.now();
  110 |     await fillTopInput(frame, 'nombre', portName);
  111 |     
  112 |     // Asignar el combo de Unidad de Negocio Padre
  113 |     await setSelectValueByText(frame, 'unidad_negocio_padre', unName);
  114 |     await submitHybridForm(frame, page, 'Guardar Portafolio');
  115 |     
  116 |     // 3. Simular el ESCENARIO DEL BUG: Editar el Portafolio recién creado
  117 |     // Navegamos al DataGrid de Portafolios
  118 |     await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
  119 |     
  120 |     // Buscar la fila del Portafolio y forzar edicion
  121 |     const rowPort = frame.locator('tr').filter({ hasText: portName }).first();
  122 |     const isPortVisible = await rowPort.isVisible({ timeout: 15_000 }).catch(() => false);
  123 |     if (!isPortVisible) {
  124 |          console.log("[WARN] Latencia impidió ver el Portafolio en el datagrid.");
  125 |     } else {
  126 |         await rowPort.click({ timeout: 15000, force: true }).catch(() => {});
  127 |     }
  128 | 
  129 |     // El Drawer del Portafolio se abre. El parche Ghost Stealing DEBE pre-llenar la Unidad de Negocio.
  130 |     // Agregar un Grupo de Productos sin tocar conscientemente la UN.
  131 |     const strongGrupo = frame.locator('strong', { hasText: 'Grupos de Productos Asociados' }).last();
  132 |     await strongGrupo.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  133 |     const headerGrupo = frame.locator('div').filter({ has: strongGrupo }).last();
  134 |     const btnAgregarGrupo = headerGrupo.locator('ion-button').filter({ hasText: 'Agregar' }).last();
  135 |     
  136 |     await btnAgregarGrupo.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
  137 |     if(await btnAgregarGrupo.count() > 0) {
  138 |         await btnAgregarGrupo.evaluate(b => b.click({ force: true }));
  139 |     }
  140 |     
  141 |     const ghostGrupoName = 'GRUPO GHOST HIJO ' + Date.now();
  142 |     await fillTopInput(frame, 'nombre', ghostGrupoName);
  143 |     await fillTopInput(frame, 'modelo_negocio', 'SaaS');
  144 |     await submitHybridForm(frame, page, 'Guardar Grupo');
  145 |     
  146 |     // En este punto guardamos el Portafolio principal de vuelta.
  147 |     // Si el bug existe, vaciará la unidad de negocio enviándola con array vacío. 
  148 |     await submitHybridForm(frame, page, 'Guardar Portafolio');
  149 | 
  150 |     // 4. VERIFICAR INTEGRIDAD PADRE
  151 |     // Regresamos al Grid de Portafolios (por si hubo reset)
  152 |     await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
  153 |     
  154 |     const rowPort2 = frame.locator('tr').filter({ hasText: portName }).first();
  155 |     await rowPort2.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  156 | 
  157 |     // EXPECT: La Unidad de Negocio 'UN PADRE GHOST' DEBE estar aún en la fila DataGrid del Portafolio
  158 |     await expect(rowPort2.locator('td').filter({ hasText: new RegExp(unName) })).toBeVisible({ timeout: 15000 }).catch(() => {
> 159 |         throw new Error("🚨 GHOST STEALING BUG DETECTADO: El Portafolio perdió a su Padre (Unidad Negocio) tras agregar un hijo (Grupo Productos).");
      |               ^ Error: 🚨 GHOST STEALING BUG DETECTADO: El Portafolio perdió a su Padre (Unidad Negocio) tras agregar un hijo (Grupo Productos).
  160 |     });
  161 | 
  162 |     console.log("✅ Ghost Stealing Regression Test superado con éxito. La UN se mantuvo íntegra.");
  163 |   });
  164 | });
  165 | 
```