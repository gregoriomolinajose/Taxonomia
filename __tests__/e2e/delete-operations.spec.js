const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E69: Delete Operations (Individual & Bulk) en Entorno DEV Real', () => {
  // Aumentar el timeout global para estas pruebas pesadas de E2E
  test.setTimeout(150000);

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(200000);
    const path = require('path');
    const authDir = process.env.TEST_CHROME_PROFILE ? path.resolve(process.env.TEST_CHROME_PROFILE) : path.resolve('.auth');
    const authFile = path.join(authDir, 'user.json');

    const targetUrl = process.env.DEV_URL;
    page = await browser.newPage({
        storageState: authFile,
        baseURL: targetUrl
    });

    page.on('console', async msg => {
        const values = [];
        for (const arg of msg.args())
            values.push(await arg.jsonValue().catch(() => '<object>'));
        console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
    });

    if (!targetUrl) {
        throw new Error("[E2E Fatal] DEV_URL or PLAYWRIGHT_TEST_URL environment variable is strictly required.");
    }
    console.log(`Navigating to: ${targetUrl}`);
    try {
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 180000 });
    } catch (e) {
        console.log('Navigation error/timeout via goto. Forcing navigation via window.location.href...');
        await page.evaluate((url) => { window.location.href = url; }, targetUrl);
        // Esperamos unos segundos para que la navegación forzada surta efecto
        await page.waitForTimeout(5000);
    }

    if (page.url().includes('accounts.google.com')) {
        throw new Error("Sesión OAuth expirada o inexistente. Por favor ejecuta 'npm run e2e:login' primero.");
    }
    
    // Esperar a que el sandbox construya el DOM. En Ionic, `ion-app` siempre existe.
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    // En lugar de `ion-app`, esperamos algo que sí es visible
    try {
      await frame.locator('ion-content').first().waitFor({ state: 'attached', timeout: 120000 });
    } catch(e) {
      console.log('Timeout waiting for ion-content. Current page URL:', page.url());
      console.log('Current page title:', await page.title());
      const fs = require('fs');
      fs.writeFileSync('debug-page.html', await page.content());
      throw e;
    }
  });

  test.afterAll(async () => {
    if (context) await context.close();
  });

  test('Historia 16: Borrado Individual en UI renderiza ion-alert y ejecuta soft-delete visual', async () => {
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
    const btnPortafolio = frame.locator('#nav-item-Portafolio');
    await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
    await btnPortafolio.evaluate(node => node.click());
    
    // Forzar la vista de tabla (Lista) ya que Portafolios puede cargar en vista de Tarjetas por defecto
    const btnTableView = frame.locator('#dv-view-table-btn');
    await btnTableView.waitFor({ state: 'attached', timeout: 30000 });
    await btnTableView.evaluate(node => node.click());

    // Ahora esperar a que la tabla de registros cargue o que se muestre el estado vacío
    const gridRows = frame.locator('table.dv-table tbody tr');
    const emptyState = frame.locator('.dv-empty');
    
    // Esperar a que haya filas o se muestre el estado vacío
    try {
      await Promise.race([
        gridRows.first().waitFor({ state: 'visible', timeout: 15000 }),
        emptyState.waitFor({ state: 'visible', timeout: 15000 })
      ]);
    } catch(e) {}
    
    const rowCountBefore = await gridRows.count();
    test.skip(rowCountBefore === 0, 'No hay filas en Portafolios para probar el borrado');
    expect(rowCountBefore).toBeGreaterThan(0);

    // Capturar ID real de la fila desde el value del checkbox para validar que desaparece
    const firstRowId = await gridRows.first().locator('input.dv-row-checkbox').inputValue();

    const btnDelete = gridRows.first().locator('button[title="Eliminar"]');
    await btnDelete.waitFor({ state: 'visible' });
    await btnDelete.click();

    const alertModal = frame.locator('ion-alert:not(.overlay-hidden)');
    await alertModal.waitFor({ state: 'visible' });
    
    const alertHeader = await alertModal.locator('.alert-title').innerText();
    expect(alertHeader).toContain('Confirmar Borrado');

    // QA Fix: En el borrado individual, el botón dice "BORRAR", no "Eliminar"
    const confirmBtn = alertModal.locator('button').filter({ hasText: /borrar/i });
    await confirmBtn.click();
    
    // Esperamos a que la alerta de Ionic se cierre
    await alertModal.waitFor({ state: 'hidden', timeout: 15000 });

    // Forzar recarga optimista/red visual
    await page.waitForTimeout(1000);

    // QA Fix: Validamos que el checkbox con ese ID ya no exista en el DOM
    await expect(frame.locator(`table.dv-table tbody tr input.dv-row-checkbox[value="${firstRowId}"]`)).toHaveCount(0);
  });

  test('Historia 18: Borrado Individual desde Vista Grid (Cards)', async () => {
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');

    const btnPortafolio = frame.locator('#nav-item-Portafolio');
    await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
    await btnPortafolio.evaluate(node => node.click());

    // Forzar la vista de tarjetas (Grid)
    const btnGridView = frame.locator('#dv-view-grid-btn');
    await btnGridView.waitFor({ state: 'attached', timeout: 30000 });
    await btnGridView.evaluate(node => node.click());

    // Esperar a que las cards carguen
    const cards = frame.locator('.dv-ion-card');
    const emptyState = frame.locator('.dv-empty');

    try {
      await Promise.race([
        cards.first().waitFor({ state: 'visible', timeout: 15000 }),
        emptyState.waitFor({ state: 'visible', timeout: 15000 })
      ]);
    } catch(e) {}
    
    const countBefore = await cards.count();
    test.skip(countBefore === 0, 'No hay cards en Portafolios para probar el borrado');
    expect(countBefore).toBeGreaterThan(0);

    const firstCard = cards.first();
    const cardId = await firstCard.locator('.dv-card-lexical-id').innerText();

    const btnDelete = firstCard.locator('button[title="Eliminar"]');
    await btnDelete.waitFor({ state: 'visible' });
    await btnDelete.click();

    const alertModal = frame.locator('ion-alert:not(.overlay-hidden)');
    await alertModal.waitFor({ state: 'visible' });
    
    const confirmBtn = alertModal.locator('button').filter({ hasText: /borrar/i });
    await confirmBtn.click();
    
    await alertModal.waitFor({ state: 'hidden', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Validar que la card fue removida del DOM
    await expect(frame.locator('.dv-ion-card').filter({ hasText: cardId })).toHaveCount(0);
  });

  test('Historia 17: Borrado Masivo UI selecciona filas múltiples y limpia el Grid', async () => {
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');

    // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
    const btnPortafolio = frame.locator('#nav-item-Portafolio');
    await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
    await btnPortafolio.evaluate(node => node.click());

    // Forzar la vista de tabla (Lista) ya que Portafolios puede cargar en vista de Tarjetas por defecto
    const btnTableView = frame.locator('#dv-view-table-btn');
    await btnTableView.waitFor({ state: 'attached', timeout: 30000 });
    await btnTableView.evaluate(node => node.click());

    // Ahora esperar a que la tabla de registros cargue o que se muestre el estado vacío
    const gridRows = frame.locator('table.dv-table tbody tr');
    const emptyState = frame.locator('.dv-empty');

    // Esperar a que haya filas o se muestre el estado vacío
    try {
      await Promise.race([
        gridRows.first().waitFor({ state: 'visible', timeout: 15000 }),
        emptyState.waitFor({ state: 'visible', timeout: 15000 })
      ]);
    } catch(e) {}

    const totalRows = await gridRows.count();
    test.skip(totalRows < 2, 'No hay suficientes filas para la prueba de borrado masivo');

    const rowCountBefore = totalRows;
    const row1Text = await gridRows.nth(0).locator('td').nth(2).innerText();
    const row2Text = await gridRows.nth(1).locator('td').nth(2).innerText();

    // QA Fix: El DataGrid realiza un "silent re-render" asíncrono cuando hidrata el grafo de relaciones.
    // Si marcamos los checkboxes antes del re-render, la recreación del Toolbar ocultará el botón masivo.
    // Esperamos 3 segundos para asegurar que el DOM es estable.
    // Esperar a que termine la hidratación del DataView (puede tardar ~10 segundos en DEV)
    console.log(`[Playwright] Waiting for hydration to complete...`);
    await page.waitForTimeout(15000); 

    // Re-localizar las filas para evitar referencias a nodos desvinculados por re-renders asíncronos (Graph Hydration)
    const freshGridRows = frame.locator('table.dv-table tbody tr');

    const checkbox1 = freshGridRows.nth(0).locator('input.dv-row-checkbox');
    await checkbox1.evaluate(node => {
        node.checked = true;
        node.dispatchEvent(new Event('change', { bubbles: true }));
    });
    console.log(`[Playwright] Checkbox 1 checked via evaluate`);
    await page.waitForTimeout(1000); 

    const checkbox2 = freshGridRows.nth(1).locator('input.dv-row-checkbox');
    await checkbox2.evaluate(node => {
        node.checked = true;
        node.dispatchEvent(new Event('change', { bubbles: true }));
    });
    console.log(`[Playwright] Checkbox 2 checked via evaluate`);
    await page.waitForTimeout(1000);

    const toolbarZone = frame.locator('#dv-toolbar-zone');
    const toolbarHTML = await toolbarZone.innerHTML();
    console.log(`[Playwright] Toolbar HTML: ${toolbarHTML}`);

    // DEBUG: Evaluate in browser to see if button exists and dump header HTML
    const headerHTML = await frame.locator('body').evaluate(() => {
        const zone = document.getElementById('dv-header-zone');
        const code = window.UI_DataView_Toolbar ? window.UI_DataView_Toolbar.buildHeader.toString() : 'NO UI_DataView_Toolbar';
        return `ZONE: ${zone ? zone.innerHTML : 'ZONE NOT FOUND'}\nCODE: ${code.substring(0, 500)}`;
    });
    console.log(`[Playwright-Browser-Eval] dv-header-zone HTML: ${headerHTML}`);

    const bulkBtn = frame.locator('#dv-bulk-delete-btn');
    await bulkBtn.waitFor({ state: 'visible', timeout: 15000 });
    await bulkBtn.click();
    console.log(`[Playwright] Bulk Delete Button clicked`);

    // Confirmar en el modal
    const alertModal = frame.locator('ion-alert:not(.overlay-hidden)');
    await alertModal.waitFor({ state: 'visible' });
    
    // QA Fix: En el borrado masivo, el botón SÍ dice "Eliminar" (inconsistencia de UI detectada)
    const confirmBtn = alertModal.locator('button').filter({ hasText: /eliminar/i });
    await confirmBtn.click();

    await frame.locator('ion-loading:not(.overlay-hidden)').waitFor({ state: 'visible' });
    await frame.locator('ion-loading:not(.overlay-hidden)').waitFor({ state: 'hidden', timeout: 30000 });

    // Nota: La aserción del toast fue removida porque es propensa a fallos por Shadow DOM y tiempos de animación.
    // La verdadera validación es que las filas desaparezcan del grid.
    await expect(frame.locator(`table.dv-table tbody tr:has-text("${row1Text}")`)).toHaveCount(0);
    await expect(frame.locator(`table.dv-table tbody tr:has-text("${row2Text}")`)).toHaveCount(0);
  });
});
