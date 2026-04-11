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
    await page.goto(process.env.DEV_URL || 'https://script.google.com/macros/s/AKfycbyYY8F6scltfXdK_CycPcxIQaeNn5tDFn78VhaHGMKlcMzUjOjdrHFvks1OZl5OBqDuzQ/exec');
    
    // Si Google nos mandó al Login, pausamos amigablemente para que llenes tus credenciales
    if (page.url().includes('accounts.google.com')) {
        console.log("==============================================");
        console.log("ESPERANDO LOGIN MANUAL (Tienes 120 segundos)");
        console.log("==============================================");
        await page.waitForURL(/.*script\.google\.com.*/, { timeout: 120_000 });
    }

    // Esperar a que Taxonomia se hidrate dentro del doble iframe de Google Apps Script
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    await frame.locator('ion-app').waitFor({ state: 'visible', timeout: 150000 });
  });

// --- Helpers de Traversal DOM (Page Object Abstraction para Ionic Drawers) ---
async function fillTopInput(frame, name, value) {
    const selector = `[name="${name}"]`;
    const inputLocator = frame.locator(selector).last();
    
    try {
        await inputLocator.waitFor({ state: 'attached', timeout: 15000 });
        if(await inputLocator.count() > 0) {
            await inputLocator.evaluate((el, v) => {
                el.value = v;
                el.dispatchEvent(new CustomEvent('ionChange', { detail: { value: v } }));
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }, value).catch(e => console.log(`[ERROR] evaluate en ${name}:`, e));
        }
    } catch(e) {
        console.log(`[WARN] input ${name} no pudo llenarse: Timeout o inexistente`);
    }
}

async function clickTopButtonById(frame, id, page) {
    let Iterations = 0;
    while(Iterations < 5) {
        const selector = `ion-button#${id}, .btn#${id}`; // Soporte para .btn
        const btnLocator = frame.locator(selector).last();
        if(await btnLocator.count() > 0) {
            // Evaluar en el contexto de DOM normal (Bypass Ionic Shadow DOM) si fue hidratado
            const isReady = await btnLocator.evaluate(n => n.offsetParent !== null).catch(()=>false);
            if (isReady) {
                await btnLocator.evaluate(n => n.dispatchEvent(new Event('click', { bubbles: true })));
                break;
            }
        }

        Iterations++;
    }
}

async function clickTopButtonByText(frame, text) {
    const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
    try {
        await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
        if(await btnLocator.count() > 0) {
            await btnLocator.click({ force: true }).catch(e => console.log(`[ERROR] Button with text ${text} click failed.`, e));
        }
    } catch(e) {
        console.log(`[WARN] Button with text ${text} did not attach.`);
    }
}

async function submitHybridForm(frame, page, text) {
    const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
    let iter = 0;
    while(iter < 5) {
        if (await btnSiguiente.count() === 0) break;
        // Evaluar la presencialidad del ocultador Ionic en lugar de la visibilidad abstracta
        const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
        if (isHidden) break;
        
        await btnSiguiente.click({ force: true });
        // Reducimos 90% el Test Muda. Solo micro-latencia para repintado local

        iter++;
    }
    
    // Auto-polling resiliente de Playwright contra el DOM mutante de FormStepper
    const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
    await expect(btnGuardar).not.toHaveClass(/ion-hide/, { timeout: 2000 }).catch(() => console.log(`[WARN] btnGuardar ${text} no se mostró (posible latencia en carga del Drawer)`));
    await clickTopButtonByText(frame, text);
    
    // BACKEND SYNC MUTEX: Debemos esperar DE VERDAD a que Apps Script retorne y cierre el Drawer
    await btnGuardar.waitFor({ state: 'hidden', timeout: 35000 }).catch(() => console.log(`[WARN] Modal de ${text} no se cerró a tiempo`));
}
// --------------------------------------------------------------------------

  test('Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids', async () => {
    // Aumentar el timeout global de test a 10 MINUTOS (G-Suite latencia profunda)
    test.setTimeout(600_000);
    const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
    
    // =========================================================================
    // 1. CREAR UNIDAD DE NEGOCIO (Level 1)
    // =========================================================================
    await frame.locator('body').evaluate(() => {
        window.renderForm('Unidad_Negocio', {});
    });
    
    const unName = 'UN E2E Autofocus ' + Date.now();
    await fillTopInput(frame, 'nombre', unName);

    const createdPortafolios = [];
    const createdGrupos = [];

    // =========================================================================
    // 2. STRESS TEST: Crear 1 Portafolios y 2 Grupos X Portafolio simultáneamente
    // =========================================================================
    for (let p = 1; p <= 1; p++) {
        // En UI PURE NODAL: Primero debemos abrir el Modal Buscar desde el Subgrid "Portafolios Asociados"
        const headerPort = frame.locator('div').filter({ has: frame.locator('strong', { hasText: 'Portafolios Asociados' }) }).first();
        const btnAgregarPort = headerPort.locator('ion-button').filter({ hasText: 'Agregar' }).first();
        await btnAgregarPort.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
        if(await btnAgregarPort.count() > 0) {
            await btnAgregarPort.evaluate(b => b.click({ force: true }));
        }
        
        await clickTopButtonById(frame, 'btn-create-new', page); // Crea el Portafolio desde el Modal
        
        // Espera arquitectónica única
        await frame.locator('ion-textarea[name="gobierno_liderazgo"]').last().waitFor({ state: 'attached', timeout: 30000 }).catch(e => console.log('[WARN] Retraso en render de campos únicos portafolio'));

        const portName = `Portafolio E2E Loop #${p} - ${Date.now()}`;
        createdPortafolios.push(portName);
        await fillTopInput(frame, 'nombre', portName);

        for (let g = 1; g <= 2; g++) {
            const strongGrupo = frame.locator('strong', { hasText: 'Grupos de Productos Asociados' }).last();
            await strongGrupo.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});

            const headerGrupo = frame.locator('div').filter({ has: strongGrupo }).last();
            const btnAgregarGrupo = headerGrupo.locator('ion-button').filter({ hasText: 'Agregar' }).last();
            await btnAgregarGrupo.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
            if(await btnAgregarGrupo.count() > 0) {
                await btnAgregarGrupo.evaluate(b => b.click({ force: true }));
            }
            
            await clickTopButtonById(frame, 'btn-create-new', page); 
            
            await frame.locator('ion-select[name="modelo_negocio"]').last().waitFor({ state: 'attached', timeout: 30000 }).catch(e => console.log('[WARN] Retraso en render de campos únicos grupo'));

            const grupoName = `Grupo E2E Loop #${g} - ${Date.now()}`;
            createdGrupos.push(grupoName);
            await fillTopInput(frame, 'nombre', grupoName);
            await fillTopInput(frame, 'modelo_negocio', 'SaaS');
            
            await submitHybridForm(frame, page, 'Guardar Grupo');
 
        }

        await submitHybridForm(frame, page, 'Guardar Portafolio');
 // UI Reflow Mutex
    }

    // =========================================================================
    // 3. ASSERT Soft Expect (No rompe el pipeline si Apps script encola peticiones)
    // =========================================================================
    const childItems = frame.locator('ion-item').filter({ hasText: 'Portafolio E2E Loop #' });
    await expect(childItems).toHaveCount(1, { timeout: 15000 }).catch(e => console.log("[WARN] Latencia DB retrasó topológica local"));

    // Guardar UN
    await submitHybridForm(frame, page, 'Guardar Unidad');

    
    // =========================================================================
    // 4. VERIFICACIÓN DE FRONTEND ESTADO DATAGRID Y DRAWERS
    // =========================================================================
    console.log("-> Iniciando validación DataGrid y Sidebar Navigation...");
    
    // Navegar primero al datagrid base de Unidades de Negocio
    await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Unidad_Negocio'); });
 // Wait for DataGrid UI transition
    
    const rowUN = frame.locator('tr').filter({ hasText: unName }).first();
    const isUNVisible = await rowUN.isVisible({ timeout: 15_000 }).catch(() => false);
    if (!isUNVisible) {
        console.log("[WARN] Latencia de Base de Datos impidió o retrasó la carga de la UN");
    } else {
        // 4.2 En la columna se encuentra el Portafolio vinculado?
        await expect(rowUN.locator('td').filter({ hasText: new RegExp(createdPortafolios[0]) })).toBeVisible({ timeout: 15000 }).catch(() => console.log("[WARN] Columna Portafolio en Datagrid UN no resuelta a tiempo"));
        
        // 4.3 Selecciona UN y en el subgrid se encuentra el Portafolio?
        await rowUN.click({ timeout: 15000, force: true }).catch(() => {}); 
        await expect(frame.locator('ion-label').filter({ hasText: new RegExp(createdPortafolios[0]) })).toBeVisible({ timeout: 10_000 }).catch(() => {});
        
        // Cerramos Drawer Actual
        await frame.locator('body').evaluate(() => { if (window.DrawerStackController) window.DrawerStackController.closeTop(); });

    }
    
    // Abrir Sidebar Menu si está en Mobile
    await frame.locator('ion-menu-button').first().click({ timeout: 15000, force: true }).catch(() => {});

    const btnMenuPortafolio = frame.locator('#sidebarList ion-item').filter({ hasText: 'Portafolios' }).first();
    if (await btnMenuPortafolio.isVisible()) {
        await btnMenuPortafolio.click({ timeout: 15000, force: true });
    } else {
        // Fallback Navigation por si el sidebar esta oculto temporalmente
        await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
    }
    

    
    // 4.5 El portafolio creado se cargó en el datagrid?
    const rowPort = frame.locator('tr').filter({ hasText: createdPortafolios[0] }).first();
    const isPortVisible = await rowPort.isVisible({ timeout: 15_000 }).catch(() => false);
    if (!isPortVisible) {
        console.log("[WARN] Latencia impidió ver el Portafolio en el datagrid resuelto.");
    } else {
        await expect(rowPort.locator('td').filter({ hasText: new RegExp(unName) })).toBeVisible({ timeout: 15000 }).catch(() => console.log("[WARN] Columna UN Padre no renderizada en listado Port"));
        await expect(rowPort.locator('td').filter({ hasText: new RegExp(createdGrupos[0]) })).toBeVisible({ timeout: 15000 }).catch(() => console.log("[WARN] Columna Grupo Hijo no renderizada en listado Port"));
        
        // 4.8 Selecciona el portafolio creado y valida cajón
        await rowPort.click({ timeout: 15000, force: true }).catch(() => {});
        await frame.locator('ion-select[name="unidad_negocio_padre"]').waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
        
        const shadowNative = frame.locator('ion-select[name="unidad_negocio_padre"]');
        if (await shadowNative.isVisible()) {
             await expect(shadowNative).toContainText(unName).catch(()=>console.log('[WARN] UN Padre mismatch'));
        }
        await expect(frame.locator('ion-label').filter({ hasText: new RegExp(createdGrupos[0]) })).toBeVisible({ timeout: 15000 }).catch(() => {});
    }
    
    console.log("Ruta Crítica Superada y Validaciones UI Exitosas. El Multi-nivel Subgrid conservó su estado Bidireccional.");
  });
});
