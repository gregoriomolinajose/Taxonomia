# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ghost-stealing.spec.js >> Ghost Stealing Bug Resistance Test >> Validar que actualizar Subgrid de Portafolio NO desvincula a su Unidad de Negocio Padre (Ghost Stealing)
- Location: __tests__\e2e\ghost-stealing.spec.js:77:3

# Error details

```
TimeoutError: locator.waitFor: Timeout 35000ms exceeded.
Call log:
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('ion-button').filter({ hasText: 'Guardar Unidad' }).last() to be hidden
    73 × locator resolved to visible <ion-button shape="round" color="primary" class="ion-color ion-color-primary md button button-round button-solid ion-activatable ion-focusable hydrated">…</ion-button>

```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const { setupPersistentContext, bypassGoogleAuth } = require('./utils/setup');
  3   | 
  4   | let context;
  5   | let page;
  6   | 
  7   | test.describe('Ghost Stealing Bug Resistance Test', () => {
  8   | 
  9   |   test.beforeAll(async () => {
  10  |     const setup = await setupPersistentContext();
  11  |     context = setup.context;
  12  |     page = setup.page;
  13  | 
  14  |     page.on('console', async msg => {
  15  |         const values = [];
  16  |         for (const arg of msg.args())
  17  |             values.push(await arg.jsonValue().catch(() => '<object>'));
  18  |         console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
  19  |     });
  20  |   });
  21  | 
  22  |   test.afterAll(async () => {
  23  |     await context.close();
  24  |   });
  25  | 
  26  |   test.beforeEach(async () => {
  27  |     await bypassGoogleAuth(page);
  28  |   });
  29  | 
  30  |   // --- Helpers ---
  31  |   async function fillTopInput(frame, name, value) {
  32  |       const inputLocator = frame.locator(`[name="${name}"]`).last();
  33  |       await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
  34  |       if(await inputLocator.count() > 0) {
  35  |           await inputLocator.evaluate((el, v) => {
  36  |               el.value = v;
  37  |               el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
  38  |               el.dispatchEvent(new Event('input', { bubbles: true }));
  39  |           }, value);
  40  |       }
  41  |   }
  42  | 
  43  |   async function setSelectValueByText(frame, selectName, txtValue) {
  44  |       const selectLocator = frame.locator(`tx-searchable[data-form-component="${selectName}"]`).last();
  45  |       try {
  46  |           await selectLocator.waitFor({ state: 'attached', timeout: 15000 });
  47  |           // Open TXSearchable via Component API
  48  |           await selectLocator.evaluate(el => el.executeSearchAndOpen());
  49  |           
  50  |           // Desktop uses ion-popover, Mobile uses ion-modal, but either way it renders ion-list natively inside
  51  |           const overlayList = frame.locator(`.tx-desktop-dropdown ion-list, ion-modal ion-list`).last();
  52  |           await overlayList.waitFor({ state: 'visible', timeout: 5000 });
  53  |           
  54  |           await overlayList.locator('ion-item').filter({ hasText: txtValue }).first().click();
  55  |       } catch(e) {
  56  |           console.log(`[WARN] No se pudo seleccionar ${txtValue} en ${selectName}`, e);
  57  |       }
  58  |   }
  59  | 
  60  |   async function clickTopButtonByText(frame, text) {
  61  |       const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
  62  |       await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
  63  |       if(await btnLocator.count() > 0) {
  64  |           await btnLocator.click({ force: true });
  65  |       }
  66  |   }
  67  | 
  68  |   async function submitHybridForm(frame, page, text) {
  69  |       const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
  70  |       await expect.soft(btnGuardar).not.toHaveClass(/ion-hide/, { timeout: 2000 });
  71  |       await clickTopButtonByText(frame, text);
> 72  |       await btnGuardar.waitFor({ state: 'hidden', timeout: 35000 });
      |                        ^ TimeoutError: locator.waitFor: Timeout 35000ms exceeded.
  73  |   }
  74  | 
  75  |   // --------------------------------------------------------------------------
  76  | 
  77  |   test('Validar que actualizar Subgrid de Portafolio NO desvincula a su Unidad de Negocio Padre (Ghost Stealing)', async () => {
  78  |     test.setTimeout(300_000);
  79  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  80  |     
  81  |     // 1. Crear UN Independiente
  82  |     await frame.locator('body').evaluate(() => { window.renderForm('Unidad_Negocio', {}); });
  83  |     const unName = 'UN PADRE GHOST ' + Date.now();
  84  |     await fillTopInput(frame, 'nombre', unName);
  85  |     await submitHybridForm(frame, page, 'Guardar Unidad');
  86  |     
  87  |     // 2. Crear Portafolio Asignado a esa UN
  88  |     await frame.locator('body').evaluate(() => { window.renderForm('Portafolio', {}); });
  89  |     const portName = 'PORT GHOST ' + Date.now();
  90  |     await fillTopInput(frame, 'nombre', portName);
  91  |     
  92  |     // Asignar el combo de Unidad de Negocio Padre
  93  |     await setSelectValueByText(frame, 'unidad_negocio_padre', unName);
  94  |     await submitHybridForm(frame, page, 'Guardar Portafolio');
  95  |     
  96  |     // 3. Simular el ESCENARIO DEL BUG: Editar el Portafolio recién creado
  97  |     // Navegamos al DataGrid de Portafolios
  98  |     await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
  99  |     
  100 |     // Buscar la fila del Portafolio y forzar edicion
  101 |     const rowPort = frame.locator('tr').filter({ hasText: portName }).first();
  102 |     const isPortVisible = await rowPort.isVisible({ timeout: 15_000 }).catch(() => false);
  103 |     if (!isPortVisible) {
  104 |          console.log("[WARN] Latencia impidió ver el Portafolio en el datagrid.");
  105 |     } else {
  106 |         await rowPort.click({ timeout: 15000, force: true }).catch(() => {});
  107 |     }
  108 | 
  109 |     // El Drawer del Portafolio se abre. El parche Ghost Stealing DEBE pre-llenar la Unidad de Negocio.
  110 |     // Agregar un Grupo de Productos sin tocar conscientemente la UN.
  111 |     // [S41.14 E2E Update] searchable_multi usa TXSearchable en vez de Subgrid puro.
  112 |     const container = frame.locator('tx-searchable[data-form-component="grupos_vinculados"]').last();
  113 |     await container.waitFor({ state: 'attached', timeout: 15000 });
  114 |     
  115 |     // Abrir el popup iterativamente
  116 |     await container.evaluate(el => el.executeSearchAndOpen());
  117 |     
  118 |     // Esperar a que renderice y clickear en el boton CREAR
  119 |     const btnCreate = frame.locator('#tx-searchable-multigrupos_vinculados-btn-create-desk, #tx-searchable-multigrupos_vinculados-btn-create-inline').last();
  120 |     await btnCreate.waitFor({ state: 'attached', timeout: 5000 });
  121 |     await btnCreate.click({ force: true });
  122 |     
  123 |     const ghostGrupoName = 'GRUPO GHOST HIJO ' + Date.now();
  124 |     await fillTopInput(frame, 'nombre', ghostGrupoName);
  125 |     await fillTopInput(frame, 'modelo_negocio', 'SaaS');
  126 |     await submitHybridForm(frame, page, 'Guardar Grupo');
  127 |     
  128 |     // En este punto guardamos el Portafolio principal de vuelta.
  129 |     // Si el bug existe, vaciará la unidad de negocio enviándola con array vacío. 
  130 |     await submitHybridForm(frame, page, 'Guardar Portafolio');
  131 | 
  132 |     // 4. VERIFICAR INTEGRIDAD PADRE
  133 |     // Regresamos al Grid de Portafolios (por si hubo reset)
  134 |     await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
  135 |     
  136 |     const rowPort2 = frame.locator('tr').filter({ hasText: portName }).first();
  137 |     await rowPort2.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  138 | 
  139 |     // EXPECT: La Unidad de Negocio 'UN PADRE GHOST' DEBE estar aún en la fila DataGrid del Portafolio
  140 |     await expect(rowPort2.locator('td').filter({ hasText: new RegExp(unName) })).toBeVisible({ timeout: 15000 }).catch(() => {
  141 |         throw new Error("🚨 GHOST STEALING BUG DETECTADO: El Portafolio perdió a su Padre (Unidad Negocio) tras agregar un hijo (Grupo Productos).");
  142 |     });
  143 | 
  144 |     console.log("✅ Ghost Stealing Regression Test superado con éxito. La UN se mantuvo íntegra.");
  145 | 
  146 |     // 5. TEARDOWN (Limpieza de Transacciones de Prueba)
  147 |     console.log("[TEARDOWN] Purificando la Base de Datos...");
  148 |     const cleanupMap = [
  149 |         {entity: 'Grupo_Producto', name: ghostGrupoName},
  150 |         {entity: 'Portafolio', name: portName},
  151 |         {entity: 'Unidad_Negocio', name: unName}
  152 |     ];
  153 | 
  154 |     const deletedIds = await frame.locator('body').evaluate(async (el, cleanupMap) => {
  155 |         const logs = [];
  156 |         for (const item of cleanupMap) {
  157 |             // Refrescamos caché para asegurar que tenemos los IDs recientes
  158 |             const request = { action: 'read', entityName: item.entity };
  159 |             const reply = await window.DataAPI.call('API_Universal_Router', request).catch(() => null);
  160 |             const records = reply && reply.data ? reply.data : [];
  161 |             
  162 |             // Busca por coincidencia exacta del nombre auto-generado
  163 |             const target = records.find(r => r.nombre === item.name);
  164 |             if (target && target.id) {
  165 |                 const reqDel = { action: 'delete', entityName: item.entity, payload: target.id };
  166 |                 await window.DataAPI.call('API_Universal_Router', reqDel).catch(() => null);
  167 |                 logs.push(`🗑️ Deleted ${item.entity}: ${item.name} (${target.id})`);
  168 |             }
  169 |         }
  170 |         return logs;
  171 |     }, cleanupMap);
  172 | 
```