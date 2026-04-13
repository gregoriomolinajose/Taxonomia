const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('E34 - S34.4: Dashboard Charts Visibility', () => {

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
    await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
    
    if (page.url().includes('accounts.google.com')) {
        console.log("ESPERANDO LOGIN MANUAL...");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
    
    // Wait for the framework to be ready and dashboard to be active
    await frame.locator('ion-card').first().waitFor({ state: 'attached', timeout: 30000 }).catch(() => {});
  });

  test('El chart "chart-topology" (Distribución Metodológica) debe renderizar un SVG evitando fallos', async () => {
      const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
      
      // Select the Doughnut Chart Container
      const topologyChart = frame.locator('#chart-topology');
      await expect(topologyChart).toBeVisible({ timeout: 15000 });

      // Verify that ApexCharts rendered the inner SVG, which means it didn't stay empty
      const svgGraphic = topologyChart.locator('svg.apexcharts-svg');
      await expect(svgGraphic).toBeVisible();
      
      // Validate Donut specific inner elements (e.g., slices if any team exists)
      const slices = svgGraphic.locator('.apexcharts-pie-series');
      // If there are teams, slices count > 0, otherwise it renders empty grid but no error.
      // We just ensure the SVG is mounted.
      expect(await svgGraphic.count()).toBeGreaterThan(0);
  });
});
