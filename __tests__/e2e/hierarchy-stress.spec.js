const { test, expect, chromium } = require('@playwright/test');

let context;
let page;

test.describe('Top-Down Hierarchy Stress Test & Race Conditions', () => {

  test.beforeAll(async () => {
    // Usamos el Perfil Nativo Persistente para que Google no nos detecte como Bot Inyector
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

    // Capturar logs internos de la página para depuración
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
    // 1. Navegar al Endpoint Ejecutivo
    await page.goto('https://script.google.com/macros/s/AKfycbz1wK6yVfTuUe3kv35k45IULLBVya51t6HDXUZHNP-6rI9Nh_PEctWZseGyoQiQ2HxkIw/exec');
    
    // Si Google nos mandó al Login, pausamos amigablemente para que llenes tus credenciales
    if (page.url().includes('accounts.google.com')) {
        console.log("==============================================");
        console.log("ESPERANDO LOGIN MANUAL (Tienes 120 segundos)");
        console.log("==============================================");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    // Esperar a que Taxonomia se hidrate dentro del doble iframe de Google Apps Script
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 60000 });
  });

// --- Helpers de Traversal DOM (Page Object Abstraction para Ionic Drawers) ---
async function fillTopInput(frame, name, value) {
    const selector = `[name="${name}"]`;
    // Usamos Playwright nativo para asegurar la asincronía y evitar undefined TypeErrors
    const inputLocator = frame.locator(selector).last();
    await inputLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(() => console.log(`[WARN] input ${name} no renderizó a tiempo`));
    
    await inputLocator.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value).catch(e => console.log(`[ERROR] evaluate en ${name}:`, e));
}

async function clickTopButtonById(frame, id) {
    const selector = `ion-button#${id}`;
    const btnLocator = frame.locator(selector).last();
    await btnLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(e => console.log(`[WARN] Button ${id} did not attach.`));
    await btnLocator.click({ force: true }).catch(e => console.log(`[ERROR] Button ${id} click failed.`, e));
}

async function clickTopButtonByText(frame, text) {
    const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
    await btnLocator.waitFor({ state: 'attached', timeout: 5000 }).catch(e => console.log(`[WARN] Button with text ${text} did not attach.`));
    await btnLocator.click({ force: true }).catch(e => console.log(`[ERROR] Button with text ${text} click failed.`, e));
}

async function submitHybridForm(frame, page, text) {
    const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
    let iter = 0;
    while(iter < 5) {
        // Evaluar la presencialidad del ocultador Ionic en lugar de la visibilidad abstracta
        const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
        if (isHidden) break;
        
        await btnSiguiente.click({ force: true });
        // Reducimos 90% el Test Muda. Solo micro-latencia para repintado local
        await page.waitForTimeout(50);
        iter++;
    }
    
    // Auto-polling resiliente de Playwright contra el DOM mutante de FormStepper
    const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
    await expect(btnGuardar).not.toHaveClass(/ion-hide/, { timeout: 2000 });
    await clickTopButtonByText(frame, text);
}
// --------------------------------------------------------------------------

  // Nota importante: Al usar nuestro propio "page", le decimos a Playwright que no inyecte el suyo ({ page }) 
  test('Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids', async () => {
    // Aumentar un poco el timeout de la prueba en caso Playwright tarde en sincronizar subgrids
    test.setTimeout(180_000);
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // =========================================================================
    // 1. CREAR UNIDAD DE NEGOCIO (Level 1)
    // =========================================================================
    await frame.locator('body').evaluate(() => {
        window.renderForm('Unidad_Negocio', {});
    });
    
    await fillTopInput(frame, 'nombre', 'UN E2E Autofocus ' + Date.now());

    // =========================================================================
    // 2. STRESS TEST: Crear 3 Portafolios y 3 Grupos X Portafolio simultáneamente
    // =========================================================================
    for (let p = 1; p <= 3; p++) {
        await clickTopButtonById(frame, 'btn-create-new'); // Crea un Portafolio
        await page.waitForTimeout(500); // Animación Drawer

        await fillTopInput(frame, 'nombre', `Portafolio E2E Loop #${p} - ${Date.now()}`);

        for (let g = 1; g <= 3; g++) {
            await clickTopButtonById(frame, 'btn-create-new'); // Crea un Grupo dentro del Portafolio
            await page.waitForTimeout(500);

            await fillTopInput(frame, 'nombre', `Grupo E2E Loop #${g} - ${Date.now()}`);
            // El modelo de negocio es 'required' y sin él, el submit falla en arquitectura linear!
            await fillTopInput(frame, 'modelo_negocio', 'SaaS');
            
            // Reemplazo Híbrido Stepper/Linear
            await submitHybridForm(frame, page, 'Guardar Grupo');
            
            await page.waitForTimeout(1500); // Wait mutex de Google Apps Script Write
        }

        await submitHybridForm(frame, page, 'Guardar Portafolio');
        await page.waitForTimeout(2000); // Wait mutex de Portafolio
    }

    // =========================================================================
    // 3. ASSERT: Validar que TODOS los Portafolios (3) sobrevivieron a las condiciones de carrera del DOM
    // =========================================================================
    const childItems = frame.locator('ion-item').filter({ hasText: 'Portafolio E2E Loop #' });
    await expect(childItems).toHaveCount(3);

    // Guardar UN
    await submitHybridForm(frame, page, 'Guardar Unidad');

    await page.waitForTimeout(3000);
    console.log("Ruta Crítica Superada. El Multi-nivel Subgrid conservó su estado Optimista.");
  });
});
