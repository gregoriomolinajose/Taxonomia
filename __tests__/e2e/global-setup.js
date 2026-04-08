const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const authFile = path.resolve('.auth/user.json');

module.exports = async (config) => {
    // Si el archivo ya existe, saltamos la autenticación de Google interactiva.
    if (fs.existsSync(authFile)) {
        console.log(`[E2E Setup] Archivo de sesión OAuth encontrado: ${authFile}. Bypass activo.`);
        return;
    }

    console.log(`\n======================================================`);
    console.log(`[E2E Setup] ¡ESTADO DE SESIÓN GOOGLE AUSENTE!`);
    console.log(`Abriendo un navegador interactivo para que inicies sesión.`);
    console.log(`Playwright esperará hasta que "Taxonomía" cargue en el DOM.`);
    console.log(`======================================================\n`);

    fs.mkdirSync('.auth', { recursive: true });

    const browser = await chromium.launch({ headless: false }); // Debe ser visible para permitir 2FA/Passwords
    const page = await browser.newPage();
    
    const baseUrl = config.projects[0].use.baseURL;
    
    // Abrimos la URL de GAS. Google forzará log-in si no hay sesión activa en este perfil.
    await page.goto(baseUrl);

    console.log(`Por favor, inicia sesión con Google. Tienes 120 segundos...`);

    try {
        // Taxonomia injects <ion-app> or <ion-menu> or <ion-header> into the DOM
        // We will wait for #app-container or ion-app as proof of successful 302 redirect & loading
        await page.waitForSelector('ion-app', { timeout: 120000 });
        console.log(`[E2E Setup] SPA de Taxonomía Montado Exitosamente.`);
        
        // Guardamos las cookies de oauth2
        await page.context().storageState({ path: authFile });
        console.log(`[E2E Setup] Sesión guardada de forma segura en: ${authFile}`);
    } catch (err) {
        console.error(`[E2E Setup] Falló la Captura de Identidad.`, err);
    } finally {
        await browser.close();
    }
};
