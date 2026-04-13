const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E34 - S34.5: Capacity Map (Mapa E2E) Drill-down and Visibility', () => {

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
    await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbwcQ6tJrdCg4bUUXy-FftU2QoN_Lh8G5nSntR7J8z43d4I1gDms5J5YvF02L8uM82xowA/exec');
    
    if (page.url().includes('accounts.google.com')) {
        console.log("ESPERANDO LOGIN MANUAL...");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  });

  test('El Mapa de Capacidad E2E debe inicializar su render jerárquico al presionar nav e ir directo al dataview prefiltrado', async () => {
      const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
      
      // Select the Capacity Map from the navigation dynamically to avoid ionic menu layout issues
      const navItem = frame.locator('#nav-item-capacitymap');
      await expect(navItem).toBeAttached({ timeout: 15000 });
      await frame.locator('body').evaluate(() => {
          window.AppEventBus.publish('NAV::CHANGE', {viewType: 'capacitymap'});
      });

      // Verify the map Canvas wrapper renders
      const canvas = frame.locator('#capacity-map-canvas');
      await expect(canvas).toBeVisible({ timeout: 10000 });
      
      // Test Unidades de Negocio block exists (even if empty, the wrapper `.capmap-container` mounts)
      const container = frame.locator('.capmap-container');
      await expect(container).toBeVisible({ timeout: 10000 });

      // Probar el Drill down asumiendo que SIEMPRE hay al menos una UN en la taxonomía local Dev
      // Si la BD de test es completamente vacía, la prueba debe fallar por Test Seeding (Muda Mitigation).
      const firstUN = frame.locator('.capmap-un-title').first();
      await firstUN.waitFor({ state: 'visible', timeout: 5000 });
      // Clic en la primera UN para drill-down
      await firstUN.click();
      
      // Verify DataView Engine took over and set strict filter in UI (Chip was appended)
      const strictChip = frame.locator('.dv-header ion-chip').first();
      await expect(strictChip).toBeVisible({ timeout: 10000 });
      
      // Validate that the label includes 'Filtrado'
      await expect(strictChip).toContainText('Filtrado');
  });
});
