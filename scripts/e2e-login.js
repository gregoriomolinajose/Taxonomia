const { chromium } = require('@playwright/test');
const path = require('path');

async function login() {
    const authDir = process.env.TEST_CHROME_PROFILE || path.resolve('.auth/chrome-profile');
    
    console.log('\n======================================================');
    console.log('🚀 Iniciando Browser de Configuración de E2E (Playwright)');
    console.log(`📂 Perfil Local: ${authDir}`);
    console.log('======================================================\n');
    console.log('INSTRUCCIONES:');
    console.log('1. El navegador se abrirá automáticamente.');
    console.log('2. Inicia sesión con tu cuenta de Google Workspace.');
    console.log('3. Una vez que hayas ingresado exitosamente, cierra el navegador manualmente.');
    console.log('4. Las cookies quedarán guardadas para futuras pruebas E2E en DEV.\n');

    const context = await chromium.launchPersistentContext(authDir, {
        headless: false,
        channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox'
        ]
    });

    const page = await context.newPage();
    await page.goto('https://accounts.google.com/signin');

    console.log('Esperando a que cierres el navegador...');
    
    context.on('close', () => {
        console.log('\n✅ Navegador cerrado. El perfil de autenticación se ha guardado localmente.');
        console.log('Ya puedes ejecutar las pruebas E2E automatizadas usando:');
        console.log('npx playwright test __tests__/e2e/delete-operations.spec.js\n');
        process.exit(0);
    });
}

login().catch(err => {
    console.error('Error durante el login:', err);
    process.exit(1);
});
