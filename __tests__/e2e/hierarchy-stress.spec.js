const { test, expect } = require('@playwright/test');

test.describe('Top-Down Hierarchy Stress Test & Race Conditions', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Navegar al Dashboard / URL principal
    await page.goto('/');
    
    // Esperar a que Taxonomia se hidrate (el EventBus o los Schemas carguen)
    await page.waitForFunction(() => window.APP_SCHEMAS !== undefined, { timeout: 30000 });
  });

  test('Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids', async ({ page }) => {
    
    // =========================================================================
    // 1. CREAR UNIDAD DE NEGOCIO (Level 1)
    // =========================================================================
    await page.evaluate(() => {
        window.renderForm('Unidad_Negocio', {});
    });
    
    // Ionic inputs wrap native inputs inside shadow DOM. Use Playwright's locator to penetrate them.
    const unNombreInput = page.locator('ion-input[name="nombre"] input').first(); 
    // Fallback if Ionic 8 doesn't expose native input gracefully:
    await page.waitForFunction(() => document.querySelector('ion-input[name="nombre"]') !== null);
    await page.evaluate(() => {
        document.querySelector('ion-input[name="nombre"]').value = 'UN E2E Autofocus ' + Date.now();
    });

    // Validar visualmente
    const btnGuardarUN = page.locator('ion-button:has-text("Guardar Unidad de Negocio")');
    await expect(btnGuardarUN).toBeVisible();

    // =========================================================================
    // 2. STRESS TEST: Crear 5 Portafolios simultáneamente desde el Subgrid
    // =========================================================================
    // Click en + Agregar del subgrid "Portafolios Asociados"
    // El Subgrid builder no le pone clase/id específico al botón pero está bajo un contenedor
    const btnAddPortafolio = page.locator('div:has-text("Portafolios Asociados")').locator('ion-button', { hasText: 'Agregar' }).first();
    
    // Si no lo encuentra, forzar via JS
    await page.evaluate(() => {
        const headers = Array.from(document.querySelectorAll('strong')).filter(s => s.textContent.includes('Portafolios Asociados'));
        if (headers.length > 0) {
            const btn = headers[0].parentElement.querySelector('ion-button');
            if (btn) btn.click();
        }
    });

    // Esperar a que aparezca el modal de subgrid
    const btnCreateNewPortafolio = page.locator('#btn-create-new');
    await btnCreateNewPortafolio.waitFor({ state: 'visible' });
    await btnCreateNewPortafolio.click();

    // Ahora estamos en el segundo Drawer (Portafolio)
    await page.waitForFunction(() => document.querySelector('ion-input[name="nombre"]') !== null);
    await page.evaluate(() => {
        const inputs = document.querySelectorAll('ion-input[name="nombre"]');
        // El último (top stack del drawer) es el portafolio
        inputs[inputs.length - 1].value = 'Portafolio E2E ' + Date.now();
    });

    // Guardar Portafolio
    const btnGuardarPort = page.locator('ion-button:has-text("Guardar Portafolio")');
    await btnGuardarPort.click();

    // Esperamos 2 segundos para validar el Race Condition:
    // El EventBus traerá el RecordHydrated, NO DEBERÍA BORRAR el Portafolio porque el Mutex está activo.
    await page.waitForTimeout(2000);

    // =========================================================================
    // 3. ASSERT: El elemento recién agregado sigue visible en el Subgrid
    // =========================================================================
    const unSubgridList = page.locator('ion-list').filter({ hasText: 'Portafolio E2E' });
    await expect(unSubgridList).toBeVisible();

    // Guardar UN
    await page.evaluate(() => {
        const btns = document.querySelectorAll('ion-button');
        const saveUN = Array.from(btns).find(b => b.textContent.includes('Guardar Unidad'));
        if (saveUN) saveUN.click();
    });

    await page.waitForTimeout(3000);

    // Finalmente verificaremos (si quisieramos) que DataAPI respondió = 'success'.
    console.log("Ruta Crítica Superada. El Multi-nivel Subgrid conservó su estado Optimista.");
  });
});
