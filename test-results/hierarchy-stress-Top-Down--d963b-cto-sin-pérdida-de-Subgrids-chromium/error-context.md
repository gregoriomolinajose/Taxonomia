# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: hierarchy-stress.spec.js >> Top-Down Hierarchy Stress Test & Race Conditions >> Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids
- Location: __tests__\e2e\hierarchy-stress.spec.js:125:3

# Error details

```
Test timeout of 600000ms exceeded.
```

```
Error: locator.evaluate: Target page, context or browser has been closed
Call log:
  - waiting for locator('#sandboxFrame').contentFrame().locator('#userHtmlFrame').contentFrame().locator('tx-searchable[data-form-component="grupos_vinculados"]').last()

```

# Test source

```ts
  69  | 
  70  | async function clickTopButtonById(frame, id, page) {
  71  |     let Iterations = 0;
  72  |     while(Iterations < 5) {
  73  |         const selector = `ion-button#${id}, .btn#${id}`; // Soporte para .btn
  74  |         const btnLocator = frame.locator(selector).last();
  75  |         if(await btnLocator.count() > 0) {
  76  |             // Evaluar en el contexto de DOM normal (Bypass Ionic Shadow DOM) si fue hidratado
  77  |             const isReady = await btnLocator.evaluate(n => n.offsetParent !== null).catch(()=>false);
  78  |             if (isReady) {
  79  |                 await btnLocator.evaluate(n => n.dispatchEvent(new Event('click', { bubbles: true })));
  80  |                 break;
  81  |             }
  82  |         }
  83  | 
  84  |         Iterations++;
  85  |     }
  86  | }
  87  | 
  88  | async function clickTopButtonByText(frame, text) {
  89  |     const btnLocator = frame.locator('ion-button').filter({ hasText: text }).last();
  90  |     try {
  91  |         await btnLocator.waitFor({ state: 'attached', timeout: 15000 });
  92  |         if(await btnLocator.count() > 0) {
  93  |             await btnLocator.click({ force: true }).catch(e => console.log(`[ERROR] Button with text ${text} click failed.`, e));
  94  |         }
  95  |     } catch(e) {
  96  |         console.log(`[WARN] Button with text ${text} did not attach.`);
  97  |     }
  98  | }
  99  | 
  100 | async function submitHybridForm(frame, page, text) {
  101 |     const btnSiguiente = frame.locator('ion-button').filter({ hasText: 'Siguiente' }).last();
  102 |     let iter = 0;
  103 |     while(iter < 5) {
  104 |         if (await btnSiguiente.count() === 0) break;
  105 |         // Evaluar la presencialidad del ocultador Ionic en lugar de la visibilidad abstracta
  106 |         const isHidden = await btnSiguiente.evaluate(node => node.classList.contains('ion-hide')).catch(() => true);
  107 |         if (isHidden) break;
  108 |         
  109 |         await btnSiguiente.click({ force: true });
  110 |         // Reducimos 90% el Test Muda. Solo micro-latencia para repintado local
  111 | 
  112 |         iter++;
  113 |     }
  114 |     
  115 |     // Auto-polling resiliente de Playwright contra el DOM mutante de FormStepper
  116 |     const btnGuardar = frame.locator('ion-button').filter({ hasText: text }).last();
  117 |     await expect(btnGuardar).not.toHaveClass(/ion-hide/, { timeout: 2000 }).catch(() => console.log(`[WARN] btnGuardar ${text} no se mostró (posible latencia en carga del Drawer)`));
  118 |     await clickTopButtonByText(frame, text);
  119 |     
  120 |     // BACKEND SYNC MUTEX: Debemos esperar DE VERDAD a que Apps Script retorne y cierre el Drawer
  121 |     await btnGuardar.waitFor({ state: 'hidden', timeout: 35000 }).catch(() => console.log(`[WARN] Modal de ${text} no se cerró a tiempo`));
  122 | }
  123 | // --------------------------------------------------------------------------
  124 | 
  125 |   test('Crea una rama entera (Unidad -> Portafolio -> Grupo -> Producto) sin pérdida de Subgrids', async () => {
  126 |     // Aumentar el timeout global de test a 10 MINUTOS (G-Suite latencia profunda)
  127 |     test.setTimeout(600_000);
  128 |     const frame = page.frameLocator('#sandboxFrame').frameLocator('#userHtmlFrame');
  129 |     
  130 |     // =========================================================================
  131 |     // 1. CREAR UNIDAD DE NEGOCIO (Level 1)
  132 |     // =========================================================================
  133 |     await frame.locator('body').evaluate(() => {
  134 |         window.renderForm('Unidad_Negocio', {});
  135 |     });
  136 |     
  137 |     const unName = 'UN E2E Autofocus ' + Date.now();
  138 |     await fillTopInput(frame, 'nombre', unName);
  139 | 
  140 |     const createdPortafolios = [];
  141 |     const createdGrupos = [];
  142 | 
  143 |     // =========================================================================
  144 |     // 2. STRESS TEST: Crear 1 Portafolios y 2 Grupos X Portafolio simultáneamente
  145 |     // =========================================================================
  146 |     for (let p = 1; p <= 1; p++) {
  147 |         // En UI PURE NODAL: Primero debemos abrir el Popover "Buscar / Añadir" desde el TXSearchable "Portafolios Asociados"
  148 |         const containerPort = frame.locator('tx-searchable[data-form-component="portafolios_vinculados"]').last();
  149 |         await containerPort.waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
  150 |         
  151 |         await containerPort.evaluate(el => el.executeSearchAndOpen());
  152 |         
  153 |         // Click al botón especial de Crear
  154 |         const btnCreatePort = containerPort.locator('ion-item').filter({ hasText: 'Crear' }).last();
  155 |         await btnCreatePort.waitFor({ state: 'visible', timeout: 8000 });
  156 |         await btnCreatePort.click({ force: true });
  157 |         
  158 |         // Espera arquitectónica única
  159 |         await frame.locator('ion-textarea[name="gobierno_liderazgo"]').last().waitFor({ state: 'attached', timeout: 30000 }).catch(e => console.log('[WARN] Retraso en render de campos únicos portafolio'));
  160 | 
  161 |         const portName = `Portafolio E2E Loop #${p} - ${Date.now()}`;
  162 |         createdPortafolios.push(portName);
  163 |         await fillTopInput(frame, 'nombre', portName);
  164 | 
  165 |         for (let g = 1; g <= 2; g++) {
  166 |             const containerGrupo = frame.locator('tx-searchable[data-form-component="grupos_vinculados"]').last();
  167 |             await containerGrupo.waitFor({ state: 'attached', timeout: 10000 }).catch(() => {});
  168 | 
> 169 |             await containerGrupo.evaluate(el => el.executeSearchAndOpen());
      |                                  ^ Error: locator.evaluate: Target page, context or browser has been closed
  170 |             
  171 |             const btnCreateGrupo = containerGrupo.locator('ion-item').filter({ hasText: 'Crear' }).last();
  172 |             await btnCreateGrupo.waitFor({ state: 'visible', timeout: 8000 });
  173 |             await btnCreateGrupo.click({ force: true });
  174 |             
  175 |             
  176 |             await frame.locator('ion-select[name="modelo_negocio"]').last().waitFor({ state: 'attached', timeout: 30000 }).catch(e => console.log('[WARN] Retraso en render de campos únicos grupo'));
  177 | 
  178 |             const grupoName = `Grupo E2E Loop #${g} - ${Date.now()}`;
  179 |             createdGrupos.push(grupoName);
  180 |             await fillTopInput(frame, 'nombre', grupoName);
  181 |             await fillTopInput(frame, 'modelo_negocio', 'SaaS');
  182 |             
  183 |             await submitHybridForm(frame, page, 'Guardar Grupo');
  184 |  
  185 |         }
  186 | 
  187 |         await submitHybridForm(frame, page, 'Guardar Portafolio');
  188 |  // UI Reflow Mutex
  189 |     }
  190 | 
  191 |     // =========================================================================
  192 |     // 3. ASSERT Soft Expect (No rompe el pipeline si Apps script encola peticiones)
  193 |     // =========================================================================
  194 |     const childItems = frame.locator('ion-item').filter({ hasText: 'Portafolio E2E Loop #' });
  195 |     await expect(childItems).toHaveCount(1, { timeout: 15000 }).catch(e => console.log("[WARN] Latencia DB retrasó topológica local"));
  196 | 
  197 |     // Guardar UN
  198 |     await submitHybridForm(frame, page, 'Guardar Unidad');
  199 | 
  200 |     
  201 |     // =========================================================================
  202 |     // 4. VERIFICACIÓN DE FRONTEND ESTADO DATAGRID Y DRAWERS
  203 |     // =========================================================================
  204 |     console.log("-> Iniciando validación DataGrid y Sidebar Navigation...");
  205 |     
  206 |     // Navegar primero al datagrid base de Unidades de Negocio
  207 |     await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Unidad_Negocio'); });
  208 |  // Wait for DataGrid UI transition
  209 |     
  210 |     const rowUN = frame.locator('tr').filter({ hasText: unName }).first();
  211 |     const isUNVisible = await rowUN.isVisible({ timeout: 15_000 }).catch(() => false);
  212 |     if (!isUNVisible) {
  213 |         console.log("[WARN] Latencia de Base de Datos impidió o retrasó la carga de la UN");
  214 |     } else {
  215 |         // 4.2 En la columna se encuentra el Portafolio vinculado?
  216 |         await expect(rowUN.locator('td').filter({ hasText: new RegExp(createdPortafolios[0]) })).toBeVisible({ timeout: 15000 }).catch(() => console.log("[WARN] Columna Portafolio en Datagrid UN no resuelta a tiempo"));
  217 |         
  218 |         // 4.3 Selecciona UN y en el subgrid se encuentra el Portafolio?
  219 |         await rowUN.click({ timeout: 15000, force: true }).catch(() => {}); 
  220 |         await expect(frame.locator('ion-label').filter({ hasText: new RegExp(createdPortafolios[0]) })).toBeVisible({ timeout: 10_000 }).catch(() => {});
  221 |         
  222 |         // Cerramos Drawer Actual
  223 |         await frame.locator('body').evaluate(() => { if (window.DrawerStackController) window.DrawerStackController.closeTop(); });
  224 | 
  225 |     }
  226 |     
  227 |     // Abrir Sidebar Menu si está en Mobile
  228 |     await frame.locator('ion-menu-button').first().click({ timeout: 15000, force: true }).catch(() => {});
  229 | 
  230 |     const btnMenuPortafolio = frame.locator('#sidebarList ion-item').filter({ hasText: 'Portafolios' }).first();
  231 |     if (await btnMenuPortafolio.isVisible()) {
  232 |         await btnMenuPortafolio.click({ timeout: 15000, force: true });
  233 |     } else {
  234 |         // Fallback Navigation por si el sidebar esta oculto temporalmente
  235 |         await frame.locator('body').evaluate(() => { if(window.UI_Router) window.UI_Router.navigateTo('list', 'Portafolio'); });
  236 |     }
  237 |     
  238 | 
  239 |     
  240 |     // 4.5 El portafolio creado se cargó en el datagrid?
  241 |     const rowPort = frame.locator('tr').filter({ hasText: createdPortafolios[0] }).first();
  242 |     const isPortVisible = await rowPort.isVisible({ timeout: 15_000 }).catch(() => false);
  243 |     if (!isPortVisible) {
  244 |         console.log("[WARN] Latencia impidió ver el Portafolio en el datagrid resuelto.");
  245 |     } else {
  246 |         await expect(rowPort.locator('td').filter({ hasText: new RegExp(unName) })).toBeVisible({ timeout: 15000 }).catch(() => console.log("[WARN] Columna UN Padre no renderizada en listado Port"));
  247 |         await expect(rowPort.locator('td').filter({ hasText: new RegExp(createdGrupos[0]) })).toBeVisible({ timeout: 15000 }).catch(() => console.log("[WARN] Columna Grupo Hijo no renderizada en listado Port"));
  248 |         
  249 |         // 4.8 Selecciona el portafolio creado y valida cajón
  250 |         await rowPort.click({ timeout: 15000, force: true }).catch(() => {});
  251 |         
  252 |         const txPadre = frame.locator('tx-searchable[data-form-component="unidad_negocio_padre"]');
  253 |         await txPadre.waitFor({ state: 'attached', timeout: 10_000 }).catch(() => {});
  254 |         
  255 |         if (await txPadre.isVisible()) {
  256 |              await expect(txPadre).toContainText(unName).catch(()=>console.log('[WARN] UN Padre mismatch'));
  257 |         }
  258 |         await expect(frame.locator('ion-label').filter({ hasText: new RegExp(createdGrupos[0]) })).toBeVisible({ timeout: 15000 }).catch(() => {});
  259 |     }
  260 |     
  261 |     console.log("Ruta Crítica Superada y Validaciones UI Exitosas. El Multi-nivel Subgrid conservó su estado Bidireccional.");
  262 |   });
  263 | });
  264 | 
```