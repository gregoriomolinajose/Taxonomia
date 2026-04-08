const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const authDir = process.env.TEST_CHROME_PROFILE ? path.resolve(process.env.TEST_CHROME_PROFILE) : path.resolve('.auth');
const authFile = path.join(authDir, 'user.json');

module.exports = async (config) => {
    // Si el archivo ya existe y tiene cookies reales, saltamos la autenticación de Google interactiva.
    if (fs.existsSync(authFile)) {
        try {
            const authState = JSON.parse(fs.readFileSync(authFile, 'utf8'));
            if (authState && authState.cookies && authState.cookies.length > 0) {
                console.log(`[E2E Setup] Sesión OAuth Válida encontrada: ${authFile}. Bypass activo.`);
                return;
            }
        } catch(e) {}
    }

    // Zero-Trust Gate Requerido por Calidad:
    // Detenemos el framework si no hay sesión para evitar correr aserciones sobre ventanas de autenticación falsas.
    throw new Error(`\n[E2E Setup - Zero-Trust Gate] ¡ESTADO DE SESIÓN GOOGLE AUSENTE!\nVerifica que exite un profile en: ${authDir}\nEjecuta el login interactivo independientemente o ajusta tu variable TEST_CHROME_PROFILE.\n`);

};
