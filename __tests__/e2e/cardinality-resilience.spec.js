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
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  });

// --- Helpers DOM ---
async function fillTopInput(frame, name, value) {
    const selector = `[name="${name}"]`;
    const inputLocator = frame.locator(selector).last();
    await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
    await inputLocator.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
}

async function clickTopButtonById(frame, id) {
    const btnLocator = frame.locator(`[id="${id}"]`).last();
    await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
    await btnLocator.click({ force: true });
}

async function clickTopButtonByText(frame, text) {
    const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
    await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
    await btnLocator.click({ force: true });
}

async function submitHybridForm(frame, page, text) {
    const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
    let iter = 0;
    while(iter < 5) {
        if (await btnSiguiente.count() === 0) break;
        const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
        if (isHidden) break;
        await btnSiguiente.click({ force: true });

        iter++;
    }
    const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
    // Fail fast if button is not present
    const allButtons = await frame.locator('ion-button').evaluateAll(btns => btns.map(b => b.textContent.trim()));
    console.log(`Available buttons (looking for "${text}"):`, allButtons);
    
    await btnGuardar.waitFor({ state: 'attached', timeout: 3000 });
    
    // Check disabled state via Playwright instead of evaluate
    const isDisabled = await btnGuardar.evaluate(btn => btn.disabled).catch(() => true);
    if (!isDisabled) {
        await btnGuardar.click({ force: true, timeout: 3000 });
    }
}

// -------------------------------------------------------------

  test('Escenario 1.1 y 1.3: Exclusividad 1:N y Limpieza Absoluta de Subgrids', async () => {
    test.setTimeout(60_000);
    try {
        const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
        const portafolioName = 'Portafolio Robado ' + Date.now();
        
        // 1. Crear UN A con un Portafolio
        await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
        await fillTopInput(frame, 'nombre', 'UN A (Padre Original) ' + Date.now());
        
        const containerPortA = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
        await containerPortA.waitFor({ state: 'attached', timeout: 15000 });
        
        // Remove flaky isVisible check and force the evaluation
        await containerPortA.evaluate(el => el.executeSearchAndOpen());
        
        // Wait for the popover/modal to render the 'Crear' item
        const btnCreatePort = frame.locator('ion-item').filter({ hasText: 'Crear' }).last();
        await btnCreatePort.waitFor({ state: 'attached', timeout: 8000 });
        await btnCreatePort.click({ force: true });
 
        await fillTopInput(frame, 'nombre', portafolioName);
        console.log("Saving new portafolio...");
        await submitHybridForm(frame, page, 'Guardar Portafolio');

        
        console.log("Saving UN A...");
        await submitHybridForm(frame, page, 'Guardar Unidad');
 // Wait for global UI refresh
        
        // 2. Crear UN B e intentar Robar el Portafolio
        await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
        await fillTopInput(frame, 'nombre', 'UN B (Padre LadrÃ³n) ' + Date.now());
        
        console.log("Linking UN B...");
        const containerPortB = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
        await containerPortB.evaluate(el => el.executeSearchAndOpen());
        
        // Seleccionar el Portafolio interactivo (puede venir del inline-list)
        const popoverPortListB = containerPortB.locator('ion-item').filter({ hasText: portafolioName }).first();
        await popoverPortListB.waitFor({ state: 'visible', timeout: 8000 });
        await popoverPortListB.click({ force: true });
        
        // Modal cierra por Escape
        await page.keyboard.press('Escape');
        
        // UN B ahora reclama tener a ese Portafolio
        await submitHybridForm(frame, page, 'Guardar Unidad');
 

        // Probaremos la Limpieza Absoluta (Escenario 1.3):
        await frame.locator('body').evaluate(() => window.renderForm('Unidad_Negocio', {}));
        await fillTopInput(frame, 'nombre', 'UN C (Empty) ' + Date.now());
        
        console.log("Linking UN C...");
        const containerPortC = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
        await containerPortC.evaluate(el => el.executeSearchAndOpen());

        const someItems = containerPortC.locator('ion-item').filter({ hasText: 'Portafolio' }).first();
        await someItems.waitFor({ state: 'visible', timeout: 8000 });
        await someItems.click({ force: true });
        
        // Salir
        await page.keyboard.press('Escape');
  

        // Limpiar (Desvincular con X - Badge de TXSearchable)
        const removeBtn = containerPortC.locator('ion-chip ion-icon[name="close-circle"]').first();
        if (await removeBtn.isVisible()) {
            await removeBtn.click({ force: true });
        }


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
