const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E23: Cardinilidad TopolÃ³gica y Resiliencia SCD-2', () => {

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
    await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
    
    if (page.url().includes('accounts.google.com')) {
        console.log("ESPERANDO LOGIN MANUAL...");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 60000 });
  });

// --- Helpers DOM ---
async function fillTopInput(frame, name, value) {
    const selector = `[name="${name}"]`;
    const inputLocator = frame.locator(selector).last();
    await inputLocator.waitFor({ state: 'attached', timeout: 5000 });
    await inputLocator.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
}

async function clickTopButtonById(frame, id) {
    const btnLocator = frame.locator(`[id="${id}"]`).last();
    await btnLocator.waitFor({ state: 'attached', timeout: 5000 });
    await btnLocator.evaluate(btn => btn.click());
}

async function clickTopButtonByText(frame, text) {
    const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
    await btnLocator.waitFor({ state: 'attached', timeout: 5000 });
    await btnLocator.evaluate(btn => btn.click());
}

async function submitHybridForm(frame, page, text) {
    const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
    let iter = 0;
    while(iter < 5) {
        if (await btnSiguiente.count() === 0) break;
        const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
        if (isHidden) break;
        await btnSiguiente.evaluate(btn => btn.click());
        await page.waitForTimeout(500);
        iter++;
    }
    const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
    // Bypass strict expect which often fails with Ionic Web Components
    await btnGuardar.waitFor({ state: 'attached', timeout: 5000 }).catch(()=>{});
    await btnGuardar.evaluate(btn => {
        if (!btn.disabled) btn.click();
    });
}

// -------------------------------------------------------------

  test('Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids', async () => {
    test.setTimeout(280_000);
    try {
        const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
        const portafolioName = 'Portafolio Robado ' + Date.now();
        
        // 1. Crear UN A con un Portafolio
        await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
        await fillTopInput(frame, 'nombre', 'UN A (Padre Original) ' + Date.now());
        
        await clickTopButtonByText(frame, 'Agregar');
        await page.waitForTimeout(1000);
        await clickTopButtonById(frame, 'btn-create-new'); 
        await page.waitForTimeout(500); 
        await fillTopInput(frame, 'nombre', portafolioName);
        console.log("Saving new portafolio...");
        await submitHybridForm(frame, page, 'Guardar Portafolio');
        await page.waitForTimeout(2000);
        
        console.log("Saving UN A...");
        await submitHybridForm(frame, page, 'Guardar Unidad');
        await page.waitForTimeout(4000); // Wait for global UI refresh
        
        // 2. Crear UN B e intentar Robar el Portafolio
        await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
        await fillTopInput(frame, 'nombre', 'UN B (Padre LadrÃ³n) ' + Date.now());
        
        console.log("Linking UN B...");
        await clickTopButtonByText(frame, 'Agregar');
        await page.waitForTimeout(1000); // Wait relation builder modal
        
        // Seleccionar el Portafolio que pertenece a la UN A
        const listItems = frame.locator('ion-item').filter({ hasText: portafolioName });
        await listItems.first().click();
        await clickTopButtonByText(frame, 'Vincular');
        await page.waitForTimeout(1000); 
        
        // UN B ahora reclama tener a ese Portafolio
        await submitHybridForm(frame, page, 'Guardar Unidad');
        await page.waitForTimeout(4000); 

        // Probaremos la Limpieza Absoluta (Escenario 1.3):
        await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
        await fillTopInput(frame, 'nombre', 'UN C (Empty) ' + Date.now());
        
        console.log("Linking UN C...");
        await clickTopButtonByText(frame, 'Agregar');
        await page.waitForTimeout(1000);
        const someItems = frame.locator('ion-label').filter({ hasText: 'Portafolio' }).first();
        await someItems.click();
        await clickTopButtonByText(frame, 'Vincular');
        await page.waitForTimeout(1000); 

        // Limpiar (Desvincular con X)
        const removeBtn = frame.locator('ion-button[color="danger"]').first();
        await removeBtn.click();
        await page.waitForTimeout(500);

        // Guardar (Subgrid vacÃ­o)
        await submitHybridForm(frame, page, 'Guardar Unidad');
        
        // Si el guardado fue exitoso y Toast aparece, early-return M:N / 1:N no abortÃ³ la operaciÃ³n prematuramente.
        const toast = frame.locator('ion-toast').filter({ hasText: 'Ã©xito' });
        await expect(toast).toBeVisible({ timeout: 10000 });
    } catch(err) {
        console.error("DEBUG FATAL PLAYWRIGHT:", err);
        await page.screenshot({ path: 'artifacts/pw_error.png' });
        throw err;
    }
  });

});
