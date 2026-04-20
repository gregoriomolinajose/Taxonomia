import { test, expect } from '@playwright/test';

test.describe('E42: Form Optimistic Sync (Zero-Latency Rendering)', () => {
    test.beforeEach(async ({ page }) => {
        if (!process.env.PLAYWRIGHT_TEST_URL) return;
        await page.goto(process.env.PLAYWRIGHT_TEST_URL);
    });

    test('DataStore expone la firma reconcileOptimisticPatch', async ({ page }) => {
        if (!process.env.PLAYWRIGHT_TEST_URL) return;
        // Esperemos hidratación de la SPA Local dentro del iFrame
        const frame = page.frameLocator('iframe').first();
        await frame.locator('#app-container').waitFor({ state: 'attached', timeout: 15000 });
        
        // Esta especificación evalúa si el parcheo dinámico sigue vivo
        const isExposed = await frame.evaluate(() => typeof window.DataStore !== 'undefined' && typeof window.DataStore.reconcileOptimisticPatch === 'function');
        expect(isExposed).toBe(true);
    });
});
