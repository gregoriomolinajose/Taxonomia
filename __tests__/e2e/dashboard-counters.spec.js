const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E28: Dashboard Counters Visibility', () => {

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
    // Navigate to web app
    await page.goto('https://script.google.com/macros/s/AKfycbz1wK6yVfTuUe3kv35k45IULLBVya51t6HDXUZHNP-6rI9Nh_PEctWZseGyoQiQ2HxkIw/exec');
    
    if (page.url().includes('accounts.google.com')) {
        console.log("ESPERANDO LOGIN MANUAL...");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 60000 });
    
    // Ensure dashboard is active
    await frame.locator('ion-item').filter({ hasText: 'Inicio' }).click();
    await page.waitForTimeout(1000);
  });

  test('Los contadores del dashboard deben renderizar datos númericos en lugar de spinners (... o vacíos)', async () => {
      const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
      
      // Select the Portafolios Card
      const portafoliosCard = frame.locator('ion-card').filter({ hasText: 'Portafolios' });
      await expect(portafoliosCard).toBeVisible();

      const portafoliosTotal = portafoliosCard.locator('[data-dsh-total]');
      await expect(portafoliosTotal).toBeVisible();

      // Wait max 10s for the spinner '...' to turn into a number or '-'
      await expect(portafoliosTotal).not.toHaveText('...', { timeout: 10000 });
      
      // Verify that it is an integer >= 0, or '-' if completely empty
      const text = await portafoliosTotal.textContent();
      const numPattern = /^(\d+|-1)$/;
      expect(text.trim()).toMatch(numPattern);

      const equiposCard = frame.locator('ion-card').filter({ hasText: 'Equipos' });
      const equiposTotal = equiposCard.locator('[data-dsh-total]');
      await expect(equiposTotal).not.toHaveText('...', { timeout: 5000 });
      expect((await equiposTotal.textContent()).trim()).toMatch(numPattern);

      const personasCard = frame.locator('ion-card').filter({ hasText: 'Personas' });
      const personasTotal = personasCard.locator('[data-dsh-total]');
      await expect(personasTotal).not.toHaveText('...', { timeout: 5000 });
      expect((await personasTotal.textContent()).trim()).toMatch(numPattern);
  });

  test('El bootstrap del dashboard no debe emitir errores de deserialización IPC', async () => {
      let deserializeErrorSeen = false;
      page.on('console', msg => {
          if (msg.text().includes('deserialize threw error') || msg.text().includes('dropping postMessage')) {
              deserializeErrorSeen = true;
          }
      });

      // Recarga forzada para capturar todo el flujo
      await page.goto('https://script.google.com/macros/s/AKfycbz1wK6yVfTuUe3kv35k45IULLBVya51t6HDXUZHNP-6rI9Nh_PEctWZseGyoQiQ2HxkIw/exec');
      const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
      await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 60000 });

      // Verificar dashboard cards resolve
      await frame.locator('ion-card').filter({ hasText: 'Portafolios' }).locator('[data-dsh-total]').waitFor({ state: 'visible' });
      await page.waitForTimeout(5000); // 5s headroom para que deserialize asome si existiese

      expect(deserializeErrorSeen).toBe(false);
  });
});
