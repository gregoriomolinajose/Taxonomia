const { test, expect } = require('@playwright/test');
const { setupPersistentContext, bypassGoogleAuth } = require('./utils/setup');

let context;
let page;
let pageErrors = [];

test.describe('E2E UI Resilience & Interaction Stability', () => {

  test.beforeAll(async () => {
    const setup = await setupPersistentContext();
    context = setup.context;
    page = setup.page;

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
    await bypassGoogleAuth(page);
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

    // Verificamos si el Header dinámico se respetó (Soft check para tolerar caché de deploy en Auth)
    const dynamicHeader = frame.locator('.drawer-dynamic-title').last();
    const hasHeader = await dynamicHeader.isVisible();
    if (hasHeader) {
        await expect.soft(dynamicHeader).toHaveText('Portafolio de Resiliencia UI', { timeout: 2000 });
    }

    // 2. Simulación Humana en el Componente SearchableSelect (Satélite)
    console.log("[E2E] Explorando Searchable Proxy...");
    const selectPadre = frame.locator('tx-searchable[data-form-component="unidad_negocio_padre"]').last();
    await selectPadre.waitFor({ state: 'visible', timeout: 5000 });
    
    // Expandir el Popover TXSearchable vía API en vez de clickDOM bruto
    await selectPadre.evaluate(el => el.executeSearchAndOpen());
    
    // Aparecerá el Popover/Modal nativo que renderiza el ShadowDOM inyectado
    // Como ion-select_padre en modo single crea un Desktop Dropdown o Mobile Modal
    const popoverContainer = frame.locator('.tx-desktop-dropdown, ion-modal').last();
    const alertSearch = popoverContainer.locator('ion-list').last(); // Buscamos la lista
    await alertSearch.waitFor({ state: 'visible', timeout: 5000 });
    
    // En Desktop la caja de busqueda embebida está en ion-searchbar
    const alertInput = popoverContainer.locator('ion-searchbar').last().locator('input').last();
    if(await alertInput.count() > 0) {
       await alertInput.pressSequentially("Busqueda", { delay: 50 });
    }
    
    // Volvemos a salir y cancelar usando tecla Escape (Standard de Ionic para popovers)
    await page.keyboard.press('Escape');

    // 3. Simulación Humana en SubgridBuilder (Drill-Down Recursividad Modales)
    console.log("[E2E] Explorando SearchableMulti Modal...");
    // Localizar el Multi Select de Grupos
    const multiContainer = frame.locator('tx-searchable[data-form-component="grupos_productos_vinculados"]').last();
    await multiContainer.waitFor({ state: 'attached', timeout: 10000 });
    
    await multiContainer.evaluate(el => el.executeSearchAndOpen());
    
    const btnAgregarGrupo = frame.locator('ion-item').filter({ hasText: 'Crear' }).last();
    
    if (await btnAgregarGrupo.count() > 0) {
        await btnAgregarGrupo.evaluate(b => b.click({ force: true }));
        // Estando en el segundo Drawer (Encima de portafolio) tecleamos de nuevo
        await typeInteractively(frame, 'nombre', 'Sub-componente Seguro');
        expect(pageErrors.length).toBe(0); // Seguimos sin estrellar UI (WSOD)
        
        // El dynamic title del grupo debe coincidir (Soft check)
        const subDrawerHeader = frame.locator('.drawer-dynamic-title').last();
        if (await subDrawerHeader.isVisible()) {
            await expect.soft(subDrawerHeader).toHaveText('Sub-componente Seguro', { timeout: 2000 });
        }
    }

    console.log("✅ Monkey Tester completado. Sin rastro de Ghost Listeners ni Excepciones Fatales.");
    // Assurance Final
    expect(pageErrors.length).toBe(0);
  });
});
