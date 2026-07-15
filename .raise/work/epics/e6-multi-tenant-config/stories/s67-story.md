# S67 · Multi-Account Clasp Auth

## Story

**Como** desarrollador que despliega desde la cuenta Coppel,  
**quiero** que `deploy.js` seleccione automáticamente las credenciales correctas según el entorno destino,  
**para que** pueda hacer push a dev (Gmail), prod (Coppel) y tenantB (Bancoppel) desde una sola máquina sin cambiar manualmente el login de clasp.

---

## Contexto

Actualmente `clasp push` siempre usa el token activo en `~/.clasprc.json` (una sola cuenta). El nuevo flujo requiere que la cuenta Coppel sea la deployadora principal, pero los proyectos GAS de destino pertenecen a cuentas diferentes:

- `dev` → Script ID propiedad de Gmail (`1ZjGYDS...`)  
- `prod` → Script ID propiedad de Coppel (`14oIjG_...`)  
- `tenantB` → Script ID propiedad de Bancoppel (pendiente)

Clasp soporta `--creds <path>` para especificar el archivo de credenciales por invocación. Esta story modifica `deploy.js` para usar ese flag.

---

## Acceptance Criteria

```gherkin
Scenario: Deploy a dev usando creds de Gmail
  Given que existe ~/.clasp-gmail.json con un token válido
  When ejecuto npm run deploy:dev:auto
  Then clasp push usa --creds ~/.clasp-gmail.json
  And el push llega al Script ID de dev

Scenario: Deploy a prod usando creds de Coppel
  Given que existe ~/.clasp-coppel.json con un token válido
  When ejecuto npm run deploy:prod:auto
  Then clasp push usa --creds ~/.clasp-coppel.json
  And el push llega al Script ID de prod

Scenario: Archivo de creds no encontrado — fallback graceful
  Given que ~/.clasp-coppel.json NO existe
  When ejecuto npm run deploy:prod:auto
  Then deploy.js imprime un warning con instrucciones
  And continúa usando el token default de ~/.clasprc.json (no falla el proceso)

Scenario: Entorno sin creds configuradas — comportamiento anterior
  Given que CREDS_FILE[env] no tiene entrada
  When ejecuto el deploy
  Then clasp push se invoca sin --creds (comportamiento actual preservado)
```

---

## Design Notes

### Mapa de credenciales en `deploy.js`

```js
const os = require('os');

const CREDS_FILE = {
  'dev':     path.join(os.homedir(), '.clasp-gmail.json'),
  'prod':    path.join(os.homedir(), '.clasp-coppel.json'),
  'tenantB': path.join(os.homedir(), '.clasp-coppel.json'),
};
```

### Invocación con --creds

```js
const credsPath = CREDS_FILE[env];
const credsFlag = (credsPath && fs.existsSync(credsPath))
  ? `--creds "${credsPath}"`
  : '';

if (credsPath && !fs.existsSync(credsPath)) {
  console.warn(`[Deploy] WARNING: Credentials file not found: ${credsPath}`);
  console.warn(`[Deploy] Run: npx clasp login --creds ${credsPath} --no-localhost`);
  console.warn(`[Deploy] Falling back to default ~/.clasprc.json token.`);
}

execSync(`npx clasp push -f ${credsFlag}`, { encoding: 'utf8', stdio: 'pipe' });
```

### También en clasp deploy (prod auto-version)

El mismo flag `--creds` debe pasarse al `clasp deploy -i ...` de prod.

---

## Files to Modify

| Archivo | Cambio |
|---------|--------|
| `deploy.js` | Agregar `require('os')`, mapa `CREDS_FILE`, lógica `--creds` en push y deploy |

## Size: S · Depends on: S63 (done)
