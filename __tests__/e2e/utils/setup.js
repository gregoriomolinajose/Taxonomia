const { chromium } = require('@playwright/test');

/**
 * Lanza un Persistent Context pre-cargado con el perfil de Auth local
 * para saltar barreras como el SSO de Apps Script.
 */
async function setupPersistentContext() {
    const authDir = process.env.TEST_CHROME_PROFILE || '.auth/chrome-profile';
    const context = await chromium.launchPersistentContext(authDir, {
        headless: false,
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
        ]
    });
    const page = await context.newPage();
    return { context, page };
}

/**
 * Navega a la app, espera o captura el Login de Google si es necesario, 
 * y retorna el frame interno montado para iniciar pruebas.
 */
async function bypassGoogleAuth(page) {
    if (!process.env.DEV_URL) {
        throw new Error("[Setup Fatal Error] DEV_URL environment variable is strictly required to run E2E Tests.");
    }
    const url = process.env.DEV_URL;
    await page.goto(url);
    
    if (page.url().includes('accounts.google.com')) {
        console.log("==============================================");
        console.log("ESPERANDO LOGIN MANUAL (Tienes 120 segundos)");
        console.log("==============================================");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    // Esperamos a que Ionic inicialice en el App Container
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
    return frame;
}

module.exports = { setupPersistentContext, bypassGoogleAuth };
