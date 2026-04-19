import { test, expect } from '@playwright/test';

test.describe('CSS Purity & Design System Coverage', () => {
    test.beforeEach(async ({ page }) => {
        if (!process.env.PLAYWRIGHT_TEST_URL) {
            test.skip('No DEV URL configured in .env', () => {});
            return;
        }
        await page.goto(process.env.PLAYWRIGHT_TEST_URL);
    });

    test('El DOM dinámico de la app compilada rechaza atributos in-line fijos de color o fondos', async ({ page }) => {
        // En adición estático a Stylelint (npm run lint:css), validamos que JS no ensucie el render.
        const frame = page.frameLocator('iframe').first();
        await frame.locator('#app-container').waitFor({ state: 'attached' });

        const violations = await frame.evaluate(() => {
            const forbiddenColors = /color\s*:\s*(#|rgb)/i;
            const elements = document.querySelectorAll('*');
            const fails = [];

            elements.forEach(el => {
                const style = el.getAttribute('style') || '';
                if (forbiddenColors.test(style)) {
                    fails.push(el.outerHTML.substring(0, 60));
                }
            });
            return fails;
        });

        // Esperar 0 violaciones detectadas
        expect(violations).toEqual([]);
    });
});
