# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: css-purity.spec.js >> CSS Purity & Design System Coverage >> El DOM dinámico de la app compilada rechaza atributos in-line fijos de color o fondos
- Location: __tests__\e2e\css-purity.spec.js:12:9

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 60000ms exceeded.
Call log:
  - waiting for locator('iframe').first().contentFrame().locator('#app-container')
    - waiting for" https://accounts.google.co.ve/accounts/SetSID?ssdc=1&sidt=ALWU2ctqK9GYGnC1lWE4kD4AlSHvaX3wUAt%2BCkKLfxsHRCu%2BUFsZIX2iSqSSY1Jg%2BD3dzFbhynO8scIXNfylUbItMbv7kIXqH/7Q85BnI%2B98vRqCkbUTdqnq0L564800ubFH0…" navigation to finish...
    - navigated to "https://script.google.com/macros/s/AKfycbwqj4uQA67maFDe1vsF-wvLH6pGs5-1j7U83YD-R2yY/dev?authuser=0"

```

# Page snapshot

```yaml
- table [ref=e2]:
  - rowgroup [ref=e3]:
    - row "Un usuario de Google Apps Script creó esta aplicación" [ref=e4]:
      - cell "Un usuario de Google Apps Script creó esta aplicación" [ref=e5]:
        - banner "Un usuario de Google Apps Script creó esta aplicación" [ref=e6]:
          - generic [ref=e7]:
            - generic [ref=e8]:
              - img [ref=e10]
              - alert [ref=e12]: Un usuario de Google Apps Script creó esta aplicación
            - generic [ref=e13]:
              - link "Denunciar abuso" [ref=e14] [cursor=pointer]:
                - /url: https://drive.google.com/abuse?id=AKkXjoz7yW8_w7p27NThZzdu62hPALWG_jqabXaudaGr3acOsrbcJX-mvBWw347mcyoe8Ob4cQLnHS3EAPXwN5jDc3D_Mx4z55iZCFBs%3A0&docurl=https%3A%2F%2Fscript.google.com%2Fmacros%2Fs%2FAKfycbwqj4uQA67maFDe1vsF-wvLH6pGs5-1j7U83YD-R2yY%2Fdev%3Fauthuser%3D0
              - link "Más información" [ref=e15] [cursor=pointer]:
                - /url: https://developers.google.com/apps-script
          - button "Descartar" [ref=e16]:
            - img [ref=e17]
    - row [ref=e19]:
      - cell [ref=e20]:
        - iframe [active] [ref=e21]:
          - iframe [active] [ref=f5e2]:
            - generic [ref=f6e3]:
              - generic:
                - navigation "menu" [ref=f6e4]:
                  - generic [ref=f6e5]:
                    - generic:
                      - generic [ref=f6e6]:
                        - img [ref=f6e8]:
                          - img [ref=f6e10]
                        - generic [ref=f6e13]: Sistema de Taxonomía
                      - list [ref=f6e17]:
                        - generic [ref=f6e18]: PRINCIPAL
                        - generic "Inicio" [ref=f6e19] [cursor=pointer]:
                          - img [ref=f6e20]:
                            - img [ref=f6e22]
                          - generic [ref=f6e27]: Inicio
                        - generic "Visualizador de Capacidad" [ref=f6e28] [cursor=pointer]:
                          - img [ref=f6e29]:
                            - img [ref=f6e31]
                          - generic [ref=f6e33]: Mapa E2E
                        - generic [ref=f6e34]: ENTIDADES
                        - generic "Unidades de Negocio" [ref=f6e35] [cursor=pointer]:
                          - img [ref=f6e36]:
                            - img [ref=f6e38]
                          - generic [ref=f6e43]: Unidades de Negocio
                        - generic "Portafolios" [ref=f6e44] [cursor=pointer]:
                          - img [ref=f6e45]:
                            - img [ref=f6e47]
                          - generic [ref=f6e50]: Portafolios
                        - generic "Dominios" [ref=f6e51] [cursor=pointer]:
                          - img [ref=f6e52]:
                            - img [ref=f6e54]
                          - generic [ref=f6e59]: Dominios
                        - generic "Grupos de Producto" [ref=f6e60] [cursor=pointer]:
                          - img [ref=f6e61]:
                            - img [ref=f6e63]
                          - generic [ref=f6e66]: Grupos de Producto
                        - generic "Productos" [ref=f6e67] [cursor=pointer]:
                          - img [ref=f6e68]:
                            - img [ref=f6e70]
                          - generic [ref=f6e73]: Productos
                        - generic "Capacidades" [ref=f6e74] [cursor=pointer]:
                          - img [ref=f6e75]:
                            - img [ref=f6e77]
                          - generic [ref=f6e80]: Capacidades
                        - generic "Equipos" [ref=f6e81] [cursor=pointer]:
                          - img [ref=f6e82]:
                            - img [ref=f6e84]
                          - generic [ref=f6e89]: Equipos
                        - generic "Personas" [ref=f6e90] [cursor=pointer]:
                          - img [ref=f6e91]:
                            - img [ref=f6e93]
                          - generic [ref=f6e96]: Personas
                      - contentinfo [ref=f6e97]:
                        - generic [ref=f6e98]:
                          - generic [ref=f6e99]:
                            - img [ref=f6e100]:
                              - img [ref=f6e102]
                            - text: v1.2.19 - 2604181720
                          - generic [ref=f6e107]: "sha: dynamic · dev-build"
                - generic [ref=f6e108]:
                  - banner [ref=f6e109]:
                    - generic [ref=f6e111]:
                      - button [ref=f6e114] [cursor=pointer]:
                        - generic [ref=f6e115]:
                          - generic:
                            - img:
                              - generic:
                                - img
                      - search [ref=f6e118]:
                        - generic [ref=f6e119]:
                          - searchbox "search text" [ref=f6e120]
                          - img:
                            - generic:
                              - img
                      - generic [ref=f6e121]:
                        - generic "Cambiar Tema" [ref=f6e122]:
                          - button [ref=f6e123] [cursor=pointer]:
                            - generic [ref=f6e124]:
                              - generic:
                                - img:
                                  - generic:
                                    - img
                        - button "G" [ref=f6e126] [cursor=pointer]:
                          - generic [ref=f6e128]: G
                  - main [ref=f6e129]:
                    - generic [ref=f6e133]:
                      - generic:
                        - generic [ref=f6e134]:
                          - generic:
                            - generic [ref=f6e138]:
                              - img [ref=f6e140]:
                                - img [ref=f6e142]
                              - generic [ref=f6e147]:
                                - generic [ref=f6e148]: Portafolios
                                - generic [ref=f6e149]: "48"
                            - generic [ref=f6e153]:
                              - img [ref=f6e155]:
                                - img [ref=f6e157]
                              - generic [ref=f6e162]:
                                - generic [ref=f6e163]: Productos
                                - generic [ref=f6e164]: "4"
                            - generic [ref=f6e168]:
                              - img [ref=f6e170]:
                                - img [ref=f6e172]
                              - generic [ref=f6e179]:
                                - generic [ref=f6e180]: Equipos
                                - generic [ref=f6e181]: "9"
                            - generic [ref=f6e185]:
                              - img [ref=f6e187]:
                                - img [ref=f6e189]
                              - generic [ref=f6e194]:
                                - generic [ref=f6e195]: Personas
                                - generic [ref=f6e196]: "5"
                        - generic [ref=f6e205] [cursor=pointer]:
                          - generic [ref=f6e206]:
                            - generic [ref=f6e207]: TODOS LOS PORTAFOLIOS
                            - button "TODOS LOS PORTAFOLIOS" [ref=f6e208]
                          - img [ref=f6e209]:
                            - img [ref=f6e211]
                        - generic [ref=f6e213]:
                          - generic:
                            - generic [ref=f6e215]:
                              - generic:
                                - heading "Distribución Metodológica" [level=2] [ref=f6e217]:
                                  - generic: Distribución Metodológica
                                - generic [ref=f6e220]:
                                  - application "donut chart with 1 data series" [ref=f6e221]:
                                    - generic [ref=f6e227]:
                                      - generic:
                                        - generic: 100.0%
                                  - button "Otro, visible. Press Enter or Space to toggle." [ref=f6e231] [cursor=pointer]:
                                    - generic [ref=f6e232]:
                                      - img
                                    - generic [ref=f6e233]: Otro
                                  - text: ●
                            - generic [ref=f6e235]:
                              - generic:
                                - heading "Capacidad por Equipo" [level=2] [ref=f6e237]:
                                  - generic: Capacidad por Equipo
                                - generic [ref=f6e240]:
                                  - application "bar chart with 1 data series" [ref=f6e241]:
                                    - generic [ref=f6e243]:
                                      - generic [ref=f6e247]:
                                        - generic:
                                          - generic:
                                            - generic: "3"
                                          - generic:
                                            - generic: "1"
                                          - generic:
                                            - generic: "0"
                                          - generic:
                                            - generic: "0"
                                          - generic:
                                            - generic: "0"
                                          - generic:
                                            - generic: "0"
                                          - generic:
                                            - generic: "0"
                                          - generic:
                                            - generic: "0"
                                          - generic:
                                            - generic: "0"
                                      - generic [ref=f6e252]:
                                        - generic "Desconocido" [ref=f6e253]
                                        - generic "Desconocido" [ref=f6e254]
                                        - generic "Desconocido" [ref=f6e255]
                                        - generic "Desconocido" [ref=f6e256]
                                        - generic "Desconocido" [ref=f6e257]
                                        - generic "Desconocido" [ref=f6e258]
                                        - generic "Desconocido" [ref=f6e259]
                                        - generic "Desconocido" [ref=f6e260]
                                        - generic "Desconocido" [ref=f6e261]
                                      - generic [ref=f6e263]:
                                        - generic "3.0" [ref=f6e264]
                                        - generic "2.5" [ref=f6e265]
                                        - generic "2.0" [ref=f6e266]
                                        - generic "1.5" [ref=f6e267]
                                        - generic "1.0" [ref=f6e268]
                                        - generic "0.5" [ref=f6e269]
                                        - generic "0.0" [ref=f6e270]
                                  - tooltip: ●
                                  - generic [ref=f6e271]:
                                    - button "Menu" [ref=f6e272] [cursor=pointer]:
                                      - img
                                    - menu:
                                      - menuitem "Download SVG"
                                      - menuitem "Download PNG"
                                      - menuitem "Download CSV"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('CSS Purity & Design System Coverage', () => {
  4  |     test.beforeEach(async ({ page }) => {
  5  |         if (!process.env.PLAYWRIGHT_TEST_URL) {
  6  |             test.skip('No DEV URL configured in .env', () => {});
  7  |             return;
  8  |         }
  9  |         await page.goto(process.env.PLAYWRIGHT_TEST_URL);
  10 |     });
  11 | 
  12 |     test('El DOM dinámico de la app compilada rechaza atributos in-line fijos de color o fondos', async ({ page }) => {
  13 |         // En adición estático a Stylelint (npm run lint:css), validamos que JS no ensucie el render.
  14 |         const frame = page.frameLocator('iframe').first();
> 15 |         await frame.locator('#app-container').waitFor({ state: 'attached' });
     |                                               ^ Error: locator.waitFor: Test timeout of 60000ms exceeded.
  16 | 
  17 |         const violations = await frame.evaluate(() => {
  18 |             const forbiddenColors = /color\s*:\s*(#|rgb)/i;
  19 |             const elements = document.querySelectorAll('*');
  20 |             const fails = [];
  21 | 
  22 |             elements.forEach(el => {
  23 |                 const style = el.getAttribute('style') || '';
  24 |                 if (forbiddenColors.test(style)) {
  25 |                     fails.push(el.outerHTML.substring(0, 60));
  26 |                 }
  27 |             });
  28 |             return fails;
  29 |         });
  30 | 
  31 |         // Esperar 0 violaciones detectadas
  32 |         expect(violations).toEqual([]);
  33 |     });
  34 | });
  35 | 
```