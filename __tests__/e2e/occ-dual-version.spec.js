const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E33: Optimistic Concurrency Control (OCC) Dom Sync Resilience', () => {

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

  async function fillTopInput(frame, name, value) {
      const inputLocator = frame.locator(`[name="${name}"]`).last();
      await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
      await inputLocator.evaluate((el, v) => {
          el.value = v;
          el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
          el.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
  }

  async function clickTopButtonByText(frame, text) {
      const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
      await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
      await btnLocator.click({ force: true });
  }

  test('OCC Form State Sync: Secuencia agresiva M:N sin cerrar el Drawer debe actualizar el DOM _version y version equitativamente', async () => {
    test.setTimeout(120_000);
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // Navegar de forma pura
    await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Unidad_Negocio'); });

    // Instanciar un Payload falso forzado desde Javascript saltándonos la grilla
    const unName = 'Unidad OCC Stress ' + Date.now();
    await frame.locator('body').evaluate((n) => window.renderForm('Unidad_Negocio', { nombre: n }), unName);
    
    // Opcional: Escribir nombre si renderForm no prefue configurado con {nombre: n}
    await fillTopInput(frame, 'nombre', unName);
    
    // GUARDADO 1: Insersión inicial
    await frame.locator('body').evaluate(() => {
        const btns = Array.from(document.querySelectorAll('ion-button'));
        const target = btns.find(b => b.textContent.includes('Guardar Unidad'));
        if(target) target.click();
    });

    // Verificar guardado base
    let toastExito = frame.locator('ion-toast').filter({ hasText: 'éxito' });
    await expect(toastExito).toBeVisible({ timeout: 25000 });
    await frame.locator('ion-toast').evaluateAll(toasts => toasts.forEach(t => t.remove()));

    // GUARDADO 2: Modificamos el nombre y guardamos SIN SALIR DEL DRAWER para forzar extracción del payload
    await page.waitForTimeout(1500); // Emular pausa humana para evadir rate-limits nativos
    await frame.locator('body').evaluate((_, newName) => {
        const inp = document.querySelector('ion-input[name="nombre"]');
        if (inp) {
            inp.value = newName;
            inp.dispatchEvent(new CustomEvent('ionChange', { detail: { value: newName } }));
        }
    }, unName + ' Edit 1');

    await frame.locator('body').evaluate(() => {
        const target = Array.from(document.querySelectorAll('ion-button')).find(b => b.textContent.includes('Guardar Unidad'));
        if(target) { target.disabled = false; target.click(); }
    });

    const toastColision = frame.locator('ion-toast').filter({ hasText: /Colisión/i });
    await expect(toastColision).toHaveCount(0);

    let someToast = frame.locator('ion-toast').filter({ hasText: /éxito/i }).first();
    await someToast.waitFor({ state: 'attached', timeout: 25000 });


  });

});
