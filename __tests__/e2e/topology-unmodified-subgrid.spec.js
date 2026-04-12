const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E33: Unmodified Subgrid Declarative Save Resilience', () => {

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
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  });

  test('Topology State: Guardar un registro intacto con un Portafolio existente no debe lanzar Colisión de Hermanos', async () => {
    test.setTimeout(120_000);
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // Navegar y Limpiar Toasts Residuales
    await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Unidad_Negocio'); });
    await page.waitForTimeout(2000);

    // Instanciar un Payload falso forzado.
    const unName = 'Unidad Declarative ' + Date.now();
    await frame.locator('body').evaluate((n) => window.renderForm('Unidad_Negocio', { nombre: n }), unName);
    
    // GUARDADO 1: Relacionar un Portafolio real (Emulando el UI del usuario)
    await page.waitForTimeout(1500); // Emular pausa
    await frame.locator('body').evaluate(() => {
        if (!window.AppEventBus || !window.DataStore) return;
        const portafolios = window.DataStore.getAll('Portafolio');
        if (portafolios && portafolios.length > 0) {
            const pReal = portafolios[0];
            window.AppEventBus.publish('Subgrid::LinkEntity', {
                 entity: 'Unidad_Negocio', // Parent Entity Drawer
                 parentField: 'portafolios_vinculados', 
                 childPkField: 'id_portafolio',
                 records: [pReal]
            });
        }
    });

    await frame.locator('body').evaluate(() => {
        const target = Array.from(document.querySelectorAll('ion-button')).find(b => b.textContent.includes('Guardar Unidad'));
        if(target) { target.disabled = false; target.click(); }
    });

    let someToast = frame.locator('ion-toast').filter({ hasText: /éxito/i }).first();
    await someToast.waitFor({ state: 'attached', timeout: 25000 });
    await frame.locator('ion-toast').evaluateAll(toasts => toasts.forEach(t => t.remove()));

    // GUARDADO 2: Guardar EXACTAMENTE el mismo formulario sin mutaciones adicionales
    // Este fue el epicentro del falso positivo: Colisión de Hermanos
    await page.waitForTimeout(1500); // Emular pausa humana

    await frame.locator('body').evaluate(() => {
        const target = Array.from(document.querySelectorAll('ion-button')).find(b => b.textContent.includes('Guardar Unidad'));
        if(target) { target.disabled = false; target.click(); }
    });
    
    // Verificamos explícitamente que NO existan Colisiones Fantasma
    const toastColision = frame.locator('ion-toast').filter({ hasText: /Colisión/i });
    await expect(toastColision).toHaveCount(0);
    
    // Y debemos recibir el Toast o Plafaforma Sincronizada que demuestre que el ciclo asimétrico transcurrió sano.
    const toastFinal = frame.locator('ion-toast').filter({ hasText: /éxito|sincronizada/i }).first();
    await toastFinal.waitFor({ state: 'attached', timeout: 25000 });
  });

});
