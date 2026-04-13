# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: topology-strict.spec.js >> S29.4: Consistencia Front-End (Topology 1:N & Race Conditions) >> Race Condition Subgrid Prevention: MÃºltiples Clics concurrentes deben bloquear dobles guardados topologicos
- Location: __tests__\e2e\topology-strict.spec.js:52:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('ion-toast').filter({ hasText: 'éxito' })
Expected: visible
Timeout: 35000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 35000ms
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('ion-toast').filter({ hasText: 'éxito' })

```

# Test source

```ts
  1   | const { test, expect, chromium } = require('@playwright/test');
  2   | 
  3   | let context;
  4   | let page;
  5   | 
  6   | test.describe('S29.4: Consistencia Front-End (Topology 1:N & Race Conditions)', () => {
  7   | 
  8   |   test.beforeAll(async () => {
  9   |     const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
  10  |     context = await chromium.launchPersistentContext(authDir, {
  11  |         headless: false,
  12  |         channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
  13  |         args: [
  14  |             '--disable-blink-features=AutomationControlled',
  15  |             '--no-sandbox'
  16  |         ]
  17  |     });
  18  |     page = await context.newPage();
  19  |   });
  20  | 
  21  |   test.afterAll(async () => {
  22  |     await context.close();
  23  |   });
  24  | 
  25  |   test.beforeEach(async () => {
  26  |     await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
  27  |     
  28  |     if (page.url().includes('accounts.google.com')) {
  29  |         await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
  30  |     }
  31  | 
  32  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  33  |     await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  34  |   });
  35  | 
  36  | async function fillTopInput(frame, name, value) {
  37  |     const inputLocator = frame.locator(`[name="${name}"]`).last();
  38  |     await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
  39  |     await inputLocator.evaluate((el, v) => {
  40  |         el.value = v;
  41  |         el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
  42  |         el.dispatchEvent(new Event('input', { bubbles: true }));
  43  |     }, value);
  44  | }
  45  | 
  46  | async function clickTopButtonByText(frame, text) {
  47  |     const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
  48  |     await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
  49  |     await btnLocator.click({ force: true });
  50  | }
  51  | 
  52  |   test('Race Condition Subgrid Prevention: MÃºltiples Clics concurrentes deben bloquear dobles guardados topologicos', async () => {
  53  |     test.setTimeout(120_000);
  54  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  55  |     
  56  |     // Navegar a Datagrid para probar Reactividad Pura Front-End
  57  |     await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Equipo'); });
  58  | 
  59  |     
  60  |     // Abrir Formulario Equipo encima de la grilla
  61  |     await frame.locator('body').evaluate(() => window.renderForm('Equipo', {}));
  62  |     
  63  |     const unName = 'Equipo Race Condition ' + Date.now();
  64  |     await fillTopInput(frame, 'nombre_equipo', unName);
  65  |     
  66  |     const btnGuardar = frame.locator('ion-button').filter({ hasText: 'Guardar Equipo' }).last();
  67  |     await btnGuardar.waitFor({ state: 'attached', timeout: 15000 });
  68  |     
  69  |     // Inyectar 5 Clics simultÃ¡neos extremadamente rÃ¡pidos usando JS nativo para burlar bloqueos mecÃ¡nicos
  70  |     await btnGuardar.evaluate(async (btn) => {
  71  |         btn.click({ force: true });
  72  |         btn.click({ force: true });
  73  |         btn.click({ force: true });
  74  |         btn.click({ force: true });
  75  |         btn.click({ force: true });
  76  |     });
  77  | 
  78  |     // Validar que NO aparezcan 5 Toast de errores de Engine_DB o API o Colision de hermano
  79  |     // La estrategia de 'DataAPI Queue' o disabled del UI debe habernos protegido y solo permitir 1 Request.
  80  |     // El "Guardar" debe completarse y regresar sin tirar Topology Error por autoinserciones duplicadas idÃ©nticas (Sibling Collision Rule 11 en Engine Graph)
  81  |     const toastExito = frame.locator('ion-toast').filter({ hasText: 'éxito' });
> 82  |     await expect(toastExito).toBeVisible({ timeout: 35000 });
      |                              ^ Error: expect(locator).toBeVisible() failed
  83  |     
  84  |     // No debe haber un toast de Error activo en pantalla
  85  |     const toastError = frame.locator('ion-toast').filter({ hasText: '[Topology Error]' });
  86  |     await expect(toastError).toHaveCount(0);
  87  |     
  88  |     // Validar Re-Renderización inmediata del DataView via AppEventBus pub/sub
  89  |     const rowEquipo = frame.locator('tr, .ag-row').filter({ hasText: unName }).first();
  90  |     await expect(rowEquipo).toBeVisible({ timeout: 15000 }).catch(e => console.log("[WARN] Reactividad Local fallida o DataGrid no fue refrescado en E2E", e));
  91  |   });
  92  | 
  93  |   test('Validar topología de árbol profundo Ágil y Tradicional (S34.1)', async () => {
  94  |     test.setTimeout(150_000);
  95  |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  96  |     
  97  |     const ts = Date.now();
  98  |     await frame.locator('body').evaluate(async (stamp) => {
  99  |         if (!window.DataStore || !window.API) return;
  100 |         
  101 |         // Ejecución acelerada de Topología utilizando el Adapter interno sin depender de subgrids interactivos E2E (muy frágil)
  102 |         const un = { nombre_unidad: 'UN Auto ' + stamp, id_unidad_negocio: 'un_' + stamp, head_id: 'auto@nttdata.com' };
  103 |         await window.DataStore.save('Unidad_Negocio', un);
  104 |         
  105 |         const portf = { nombre: 'Portafolio Auto', id_unidad_negocio: un.id_unidad_negocio, id_portafolio: 'pf_' + stamp };
  106 |         await window.DataStore.save('Portafolio', portf);
  107 |         
  108 |         const gp = { nombre: 'GP Auto', id_portafolio: portf.id_portafolio, id_grupo_producto: 'gp_' + stamp };
  109 |         await window.DataStore.save('Grupo_Productos', gp);
  110 |         
  111 |         // Tradicional
  112 |         const prod = { nombre_producto: 'Prod Auto', id_grupo_producto: gp.id_grupo_producto, id_producto: 'prod_' + stamp };
  113 |         await window.DataStore.save('Producto', prod);
  114 |         
  115 |         // Agil
  116 |         const eq = { nombre_equipo: 'Eq Auto', id_grupo_producto: gp.id_grupo_producto, id_equipo: 'eq_' + stamp, metodologia: 'Scrum' };
  117 |         await window.DataStore.save('Equipo', eq);
  118 |         
  119 |         const pers = { email: 'a'+stamp+'@nttdata.com', nombre: 'Test', apellidos: 'Auto', equipo: eq.id_equipo, unidad_negocio: un.id_unidad_negocio, rol_agil: 'Developer', departamento: 'IT', centro_costo: 'IT.1', cargo: 'Dev', modalidad: 'Virtual', herradura: 'X', esquema: 'Interno' };
  120 |         await window.DataStore.save('Persona', pers);
  121 |     }, ts);
  122 | 
  123 |     // Validar que el API retorne todo limpio
  124 |     const toastError = frame.locator('ion-toast').filter({ hasText: '[Topology Error]' });
  125 |     await expect(toastError).toHaveCount(0);
  126 | 
  127 |     // Teardown E2E Limpieza
  128 |     await frame.locator('body').evaluate(async (stamp) => {
  129 |         if (!window.DataStore || !window.API) return;
  130 |         try {
  131 |             await window.DataStore.delete('Persona', 'a'+stamp+'@nttdata.com');
  132 |             await window.DataStore.delete('Equipo', 'eq_' + stamp);
  133 |             await window.DataStore.delete('Producto', 'prod_' + stamp);
  134 |             await window.DataStore.delete('Grupo_Productos', 'gp_' + stamp);
  135 |             await window.DataStore.delete('Portafolio', 'pf_' + stamp);
  136 |             await window.DataStore.delete('Unidad_Negocio', 'un_' + stamp);
  137 |         } catch(e) {
  138 |             console.error('Teardown incompleto', e);
  139 |             throw e;
  140 |         }
  141 |     }, ts);
  142 |   });
  143 | 
  144 | });
  145 | 
```