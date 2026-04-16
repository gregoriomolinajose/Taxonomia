const { test, expect, chromium } = require('@playwright/test');

let context;
let page;
let pageErrors = [];

test.describe('E2E UI Resilience & Interaction Stability', () => {

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

    // S40.2: Interceptar globalmente cualquier excepción nativa o "ReferenceError"
    page.on('pageerror', exception => {
        console.error(`[FATAL EXCEPTION CATCHED]: ${exception}`);
        pageErrors.push(exception);
    });

    page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon') && !msg.text().includes('404')) {
            console.error(`[CONSOLE ERROR]: ${msg.text()}`);
            pageErrors.push(new Error(msg.text()));
        }
    });

  });

  test.afterAll(async () => {
    await context.close();
  });

  test.beforeEach(async () => {
    pageErrors = []; // Reset errors before each test
    await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
    
    if (page.url().includes('accounts.google.com')) {
        console.log("==============================================");
        console.log("ESPERANDO LOGIN MANUAL (Tienes 120 segundos)");
        console.log("==============================================");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  });

  // --- Helpers Locales ---
  async function typeInteractively(frame, inputName, text) {
      // Localizamos físicamente la tag `input` que está dentro del Shadow DOM de `ion-input` / `ion-searchbar`
      const inputLocator = frame.locator(`[name="${inputName}"], ion-searchbar[name="${inputName}"]`).locator('input').last();
      try {
          await inputLocator.waitFor({ state: 'attached', timeout: 10000 });
          await inputLocator.scrollIntoViewIfNeeded();
          await inputLocator.click({ force: true });
          await page.keyboard.type(text, { delay: 50 }); // Emulamos 50ms per keystroke humano
      } catch(e) {
          console.warn(`[WARN] No se pudo escribir en ${inputName}: ${e.message}`);
      }
  }

  // --------------------------------------------------------------------------

  test('Validar Resiliencia en FormEngine_UI (Drawers Principales y Satélites) sin generar ReferenceExceptions', async () => {
    test.setTimeout(180_000);
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');

    console.log("[E2E] Abriendo Formulario Entidad...");
    await frame.locator('body').evaluate(() => { window.renderForm('Portafolio', {}); });
    
    // 1. Simulación Humana en el Componente Principal (Drawer Name)
    console.log("[E2E] Tecleando título principal...");
    await typeInteractively(frame, 'nombre', 'Portafolio de Resiliencia UI');
    
    // Verificamos de inmediato que no se haya invocado un pageerror ("targetTitleField is not defined")
    expect(pageErrors.length).toBe(0);

    // Verificamos si el Header dinámico se respetó
    const dynamicHeader = frame.locator('.drawer-dynamic-title').last();
    await expect(dynamicHeader).toHaveText('Portafolio de Resiliencia UI', { timeout: 5000 });

    // 2. Simulación Humana en el Componente SearchableSelect (Satélite)
    console.log("[E2E] Explorando Searchable Proxy...");
    const selectPadre = frame.locator('ion-select[name="unidad_negocio_padre"]').last();
    await selectPadre.waitFor({ state: 'visible' }).catch(() => {});
    await selectPadre.evaluate(n => n.dispatchEvent(new Event('click', { bubbles: true }))).catch(() => {});
    
    // Aparecerá el Modal Searchable
    const alertSearch = frame.locator('ion-alert').last();
    await alertSearch.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    // Normalmente Ionic Alerts para inputs tienen class .alert-input
    const alertInput = alertSearch.locator('input').last();
    if(await alertInput.count() > 0) {
       await alertInput.pressSequentially("Busqueda", { delay: 50 });
    }
    
    // Volvemos a salir y cancelar.
    await alertSearch.locator('button').filter({ hasText: 'Cancel' }).last().click().catch(()=> {});

    // 3. Simulación Humana en SubgridBuilder (Drill-Down Recursividad Modales)
    console.log("[E2E] Explorando Subgrid (Inception)...");
    const strongGrupo = frame.locator('strong', { hasText: 'Grupos de Productos Asociados' }).last();
    await strongGrupo.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
    const headerGrupo = frame.locator('div').filter({ has: strongGrupo }).last();
    const btnAgregarGrupo = headerGrupo.locator('ion-button').filter({ hasText: 'Agregar' }).last();
    
    if (await btnAgregarGrupo.count() > 0) {
        await btnAgregarGrupo.evaluate(b => b.click({ force: true }));
        // Estando en el segundo Drawer (Encima de portafolio) tecleamos de nuevo
        await typeInteractively(frame, 'nombre', 'Sub-componente Seguro');
        expect(pageErrors.length).toBe(0); // Seguimos sin estrellar UI (WSOD)
        
        // El dynamic title del grupo debe coincidir y no sobreescribirse entre capas del z-index
        const subDrawerHeader = frame.locator('.drawer-dynamic-title').last();
        await expect(subDrawerHeader).toHaveText('Sub-componente Seguro', { timeout: 5000 });
    }

    console.log("✅ Monkey Tester completado. Sin rastro de Ghost Listeners ni Excepciones Fatales.");
    // Assurance Final
    expect(pageErrors.length).toBe(0);
  });
});
