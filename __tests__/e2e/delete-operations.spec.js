const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E69: Delete Operations (Individual & Bulk) en Entorno DEV Real', () => {
  // Aumentar el timeout global para estas pruebas pesadas de E2E
  test.setTimeout(150000);

  test.beforeAll(async () => {
    test.setTimeout(200000);
    const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
    context = await chromium.launchPersistentContext(authDir, {
        headless: false,
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
        ]
    });
    page = await context.newPage();

    page.on('console', async msg => {
        const values = [];
        for (const arg of msg.args())
            values.push(await arg.jsonValue().catch(() => '<object>'));
        console.log(`PAGE LOG [${msg.type()}]:`, msg.text(), ...values);
    });

    if (!process.env.DEV_URL) {
        throw new Error("[E2E Fatal] DEV_URL environment variable is strictly required.");
    }
    
    console.log(`Navigating to: ${process.env.DEV_URL}`);
    try {
        await page.goto(process.env.DEV_URL, { timeout: 60000 });
    } catch (e) {
        console.log('Navigation error/timeout (continuing to wait for iframe):', e.message);
    }

    if (page.url().includes('accounts.google.com')) {
        throw new Error("Sesión OAuth expirada o inexistente. Por favor ejecuta 'npm run e2e:login' primero.");
    }
    
    // Esperar a que el sandbox construya el DOM. En Ionic, `ion-app` siempre existe.
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    // En lugar de `ion-app`, esperamos algo que sí es visible
    await frame.locator('ion-content').first().waitFor({ state: 'attached', timeout: 120000 });
    
    const fs = require('fs');
    fs.writeFileSync('debug-frame.html', await frame.locator('body').innerHTML());
  });

  test.afterAll(async () => {
    if (context) await context.close();
  });

  test('Historia 16: Borrado Individual en UI renderiza ion-alert y ejecuta soft-delete visual', async () => {
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
    const btnPortafolio = frame.locator('#nav-item-Portafolio');
    await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
    await btnPortafolio.click({ force: true });
    
    // Ahora esperar a que la tabla de registros cargue
    const gridRows = frame.locator('table.dv-table tbody tr');
    await gridRows.first().waitFor({ state: 'visible', timeout: 60000 });
    
    const rowCountBefore = await gridRows.count();
    expect(rowCountBefore).toBeGreaterThan(0);

    const firstRowText = await gridRows.first().locator('td').first().innerText();

    const btnDelete = gridRows.first().locator('button[title="Eliminar"]');
    await btnDelete.waitFor({ state: 'visible' });
    await btnDelete.click();

    const alertModal = frame.locator('ion-alert');
    await alertModal.waitFor({ state: 'visible' });
    
    const alertHeader = await alertModal.locator('.alert-title').innerText();
    expect(alertHeader).toContain('Confirmar Eliminación');

    const confirmBtn = alertModal.locator('button').filter({ hasText: 'Eliminar' });
    await confirmBtn.click();

    await frame.locator('ion-loading').waitFor({ state: 'visible' });
    await frame.locator('ion-loading').waitFor({ state: 'hidden', timeout: 30000 });

    const toast = frame.locator('ion-toast');
    await expect(toast).toContainText('eliminado correctamente');

    await expect(frame.locator(`table.dv-table tbody tr:has-text("${firstRowText}")`)).toHaveCount(0);
  });

  test('Historia 17: Borrado Masivo UI selecciona filas múltiples y limpia el Grid', async () => {
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');

    // Hacer clic en el elemento del sidebar (puede estar oculto en ciertas resoluciones de Ionic)
    const btnPortafolio = frame.locator('#nav-item-Portafolio');
    await btnPortafolio.waitFor({ state: 'attached', timeout: 30000 });
    await btnPortafolio.click({ force: true });

    // Ahora esperar a que la tabla de registros cargue
    const gridRows = frame.locator('table.dv-table tbody tr');
    await gridRows.first().waitFor({ state: 'visible', timeout: 60000 });

    const totalRows = await gridRows.count();
    test.skip(totalRows < 2, 'No hay suficientes filas para la prueba de borrado masivo');

    const row1Text = await gridRows.nth(0).locator('td').nth(1).innerText();
    const row2Text = await gridRows.nth(1).locator('td').nth(1).innerText();

    const cb1 = gridRows.nth(0).locator('.dv-row-checkbox');
    const cb2 = gridRows.nth(1).locator('.dv-row-checkbox');
    await cb1.check();
    await cb2.check();

    const bulkBtn = frame.locator('#dv-bulk-delete-btn');
    await bulkBtn.waitFor({ state: 'visible' });
    
    await bulkBtn.click();

    const alertModal = frame.locator('ion-alert');
    await alertModal.waitFor({ state: 'visible' });
    await expect(alertModal.locator('.alert-message')).toContainText('2 registros seleccionados');

    const confirmBtn = alertModal.locator('button').filter({ hasText: 'Eliminar' });
    await confirmBtn.click();

    await frame.locator('ion-loading').waitFor({ state: 'visible' });
    await frame.locator('ion-loading').waitFor({ state: 'hidden', timeout: 30000 });

    const toast = frame.locator('ion-toast');
    await expect(toast).toContainText('2 registros eliminados exitosamente');

    await expect(frame.locator(`table.dv-table tbody tr:has-text("${row1Text}")`)).toHaveCount(0);
    await expect(frame.locator(`table.dv-table tbody tr:has-text("${row2Text}")`)).toHaveCount(0);
  });
});
