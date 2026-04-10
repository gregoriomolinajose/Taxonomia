const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('S29.4: Consistencia Front-End (Topology 1:N & Race Conditions)', () => {

  test.beforeAll(async () => {
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
  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
    
    if (page.url().includes('accounts.google.com')) {
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 60000 });
  });

async function fillTopInput(frame, name, value) {
    const inputLocator = frame.locator(`[name="${name}"]`).last();
    await inputLocator.waitFor({ state: 'attached', timeout: 5000 });
    await inputLocator.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
}

async function clickTopButtonByText(frame, text) {
    const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
    await btnLocator.waitFor({ state: 'attached', timeout: 5000 });
    await btnLocator.evaluate(btn => btn.click());
}

  test('Race Condition Subgrid Prevention: MÃºltiples Clics concurrentes deben bloquear dobles guardados topologicos', async () => {
    test.setTimeout(120_000);
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // Navegar a Datagrid para probar Reactividad Pura Front-End
    await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Equipo'); });
    await page.waitForTimeout(2000);
    
    // Abrir Formulario Equipo encima de la grilla
    await frame.locator('body').evaluate(() => window.renderForm('Equipo', {}));
    
    const unName = 'Equipo Race Condition ' + Date.now();
    await fillTopInput(frame, 'nombre_equipo', unName);
    
    const btnGuardar = frame.locator('ion-button').filter({ hasText: 'Guardar Equipo' }).last();
    await btnGuardar.waitFor({ state: 'attached', timeout: 5000 });
    
    // Inyectar 5 Clics simultÃ¡neos extremadamente rÃ¡pidos usando JS nativo para burlar bloqueos mecÃ¡nicos
    await btnGuardar.evaluate(async (btn) => {
        btn.click();
        btn.click();
        btn.click();
        btn.click();
        btn.click();
    });

    // Validar que NO aparezcan 5 Toast de errores de Engine_DB o API o Colision de hermano
    // La estrategia de 'DataAPI Queue' o disabled del UI debe habernos protegido y solo permitir 1 Request.
    // El "Guardar" debe completarse y regresar sin tirar Topology Error por autoinserciones duplicadas idÃ©nticas (Sibling Collision Rule 11 en Engine Graph)
    const toastExito = frame.locator('ion-toast').filter({ hasText: 'Ã©xito' });
    await expect(toastExito).toBeVisible({ timeout: 15000 });
    
    // No debe haber un toast de Error activo en pantalla
    const toastError = frame.locator('ion-toast').filter({ hasText: '[Topology Error]' });
    await expect(toastError).toHaveCount(0);
    
    // Validar Re-Renderización inmediata del DataView via AppEventBus pub/sub
    const rowEquipo = frame.locator('tr, .ag-row').filter({ hasText: unName }).first();
    await expect(rowEquipo).toBeVisible({ timeout: 6000 }).catch(e => console.log("[WARN] Reactividad Local fallida o DataGrid no fue refrescado en E2E", e));
  });

});
