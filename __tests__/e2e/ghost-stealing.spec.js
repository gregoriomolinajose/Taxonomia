const { test, expect } = require('@playwright/test');
const { setupPersistentContext, bypassGoogleAuth } = require('./utils/setup');

let context;
let page;

test.describe('Ghost Stealing Bug Resistance Test', () => {

  test.beforeAll(async () => {
    const setup = await setupPersistentContext();
    context = setup.context;
    page = setup.page;

    page.on('console', async msg => {
        const values = [];
        for (const arg of msg.args())
            values.push(await arg.jsonValue().catch(() => '<object>'));
        console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
    });
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await bypassGoogleAuth(page);
  });

  // --- Helpers ---
  async function fillTopInput(frame, name, value) {
      const inputLocator = frame.locator(`[name="${name}"]`).last();
      await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
      if(await inputLocator.count() > 0) {
          await inputLocator.evaluate((el, v) => {
              el.value = v;
              el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
              el.dispatchEvent(new Event('input', { bubbles: true }));
          }, value);
      }
  }

  async function setSelectValueByText(frame, selectName, txtValue) {
      const selectLocator = frame.locator(`ion-select[name="${selectName}"]`).last();
      try {
          await selectLocator.waitFor({ state: 'attached', timeout: 15000 });
          // Force click to open select
          await selectLocator.evaluate(n => n.dispatchEvent(new Event('click', { bubbles: true })));
          
          const alertWindow = frame.locator('ion-alert').last();
          await alertWindow.waitFor({ state: 'visible', timeout: 5000 });
          
          await alertWindow.locator('button').filter({ hasText: txtValue }).first().click();
          await alertWindow.locator('button').filter({ hasText: 'OK' }).first().click();
      } catch(e) {
          console.log(`[WARN] No se pudo seleccionar ${txtValue} en ${selectName}`);
      }
  }

  async function clickTopButtonByText(frame, text) {
      const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
      await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
      if(await btnLocator.count() > 0) {
          await btnLocator.click({ force: true });
      }
  }

  async function submitHybridForm(frame, page, text) {
      const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
      await expect.soft(btnGuardar).not.toHaveClass(/ion-hide/, { timeout: 2000 });
      await clickTopButtonByText(frame, text);
      await btnGuardar.waitFor({ state: 'hidden', timeout: 35000 });
  }

  // --------------------------------------------------------------------------

  test('Validar que actualizar Subgrid de Portafolio NO desvincula a su Unidad de Negocio Padre (Ghost Stealing)', async () => {
    test.setTimeout(300_000);
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // 1. Crear UN Independiente
    await frame.locator('body').evaluate(() => { window.renderForm('Unidad_Negocio', {}); });
    const unName = 'UN PADRE GHOST ' + Date.now();
    await fillTopInput(frame, 'nombre', unName);
    await submitHybridForm(frame, page, 'Guardar Unidad');
    
    // 2. Crear Portafolio Asignado a esa UN
    await frame.locator('body').evaluate(() => { window.renderForm('Portafolio', {}); });
    const portName = 'PORT GHOST ' + Date.now();
    await fillTopInput(frame, 'nombre', portName);
    
    // Asignar el combo de Unidad de Negocio Padre
    await setSelectValueByText(frame, 'unidad_negocio_padre', unName);
    await submitHybridForm(frame, page, 'Guardar Portafolio');
    
    // 3. Simular el ESCENARIO DEL BUG: Editar el Portafolio recién creado
    // Navegamos al DataGrid de Portafolios
    await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
    
    // Buscar la fila del Portafolio y forzar edicion
    const rowPort = frame.locator('tr').filter({ hasText: portName }).first();
    const isPortVisible = await rowPort.isVisible({ timeout: 15_000 }).catch(() => false);
    if (!isPortVisible) {
         console.log("[WARN] Latencia impidió ver el Portafolio en el datagrid.");
    } else {
        await rowPort.click({ timeout: 15000, force: true }).catch(() => {});
    }

    // El Drawer del Portafolio se abre. El parche Ghost Stealing DEBE pre-llenar la Unidad de Negocio.
    // Agregar un Grupo de Productos sin tocar conscientemente la UN.
    const strongGrupo = frame.locator('strong', { hasText: 'Grupos de Productos Asociados' }).last();
    await strongGrupo.waitFor({ state: 'attached', timeout: 10000 });
    const headerGrupo = frame.locator('div').filter({ has: strongGrupo }).last();
    const btnAgregarGrupo = headerGrupo.locator('ion-button').filter({ hasText: 'Agregar' }).last();
    
    await btnAgregarGrupo.waitFor({ state: 'attached', timeout: 15000 });
    if(await btnAgregarGrupo.count() > 0) {
        await btnAgregarGrupo.evaluate(b => b.click({ force: true }));
    }
    
    const ghostGrupoName = 'GRUPO GHOST HIJO ' + Date.now();
    await fillTopInput(frame, 'nombre', ghostGrupoName);
    await fillTopInput(frame, 'modelo_negocio', 'SaaS');
    await submitHybridForm(frame, page, 'Guardar Grupo');
    
    // En este punto guardamos el Portafolio principal de vuelta.
    // Si el bug existe, vaciará la unidad de negocio enviándola con array vacío. 
    await submitHybridForm(frame, page, 'Guardar Portafolio');

    // 4. VERIFICAR INTEGRIDAD PADRE
    // Regresamos al Grid de Portafolios (por si hubo reset)
    await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
    
    const rowPort2 = frame.locator('tr').filter({ hasText: portName }).first();
    await rowPort2.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    // EXPECT: La Unidad de Negocio 'UN PADRE GHOST' DEBE estar aún en la fila DataGrid del Portafolio
    await expect(rowPort2.locator('td').filter({ hasText: new RegExp(unName) })).toBeVisible({ timeout: 15000 }).catch(() => {
        throw new Error("🚨 GHOST STEALING BUG DETECTADO: El Portafolio perdió a su Padre (Unidad Negocio) tras agregar un hijo (Grupo Productos).");
    });

    console.log("✅ Ghost Stealing Regression Test superado con éxito. La UN se mantuvo íntegra.");

    // 5. TEARDOWN (Limpieza de Transacciones de Prueba)
    console.log("[TEARDOWN] Purificando la Base de Datos...");
    const cleanupMap = [
        {entity: 'Grupo_Producto', name: ghostGrupoName},
        {entity: 'Portafolio', name: portName},
        {entity: 'Unidad_Negocio', name: unName}
    ];

    const deletedIds = await frame.locator('body').evaluate(async (el, cleanupMap) => {
        const logs = [];
        for (const item of cleanupMap) {
            // Refrescamos caché para asegurar que tenemos los IDs recientes
            const request = { action: 'read', entityName: item.entity };
            const reply = await window.DataAPI.call('API_Universal_Router', request).catch(() => null);
            const records = reply && reply.data ? reply.data : [];
            
            // Busca por coincidencia exacta del nombre auto-generado
            const target = records.find(r => r.nombre === item.name);
            if (target && target.id) {
                const reqDel = { action: 'delete', entityName: item.entity, payload: target.id };
                await window.DataAPI.call('API_Universal_Router', reqDel).catch(() => null);
                logs.push(`🗑️ Deleted ${item.entity}: ${item.name} (${target.id})`);
            }
        }
        return logs;
    }, cleanupMap);

    console.log("[TEARDOWN] Resultados:", deletedIds.length > 0 ? deletedIds : "Ningún registro residual encontrado.");
  });
});
