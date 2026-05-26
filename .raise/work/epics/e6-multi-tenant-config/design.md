# E6 · Design: Multi-Tenant Architecture & Config Governance

## Gemba (Estado Actual)

### Config Actual (Dispersa)
Las configuraciones del sistema están distribuidas en al menos 3 capas:
1. **`environments/Config.*.js`** → `SPREADSHEET_ID_DB`, `ALLOWED_DOMAINS`, `APP_VERSION`. Solo accesible en build-time.
2. **`PropertiesService` (Script Properties)** → `ENV_CONFIG`, `WHITE_LABEL_CONFIG`. Accesible en runtime pero sin UI admin.
3. **Schema Studio > Ajustes Globales** → UI manual que escribe al `PropertiesService`. Acoplada al Schema Studio, difícil de descubrir.

### Despliegue Actual (Single-Tenant)
```
package.json
├── deploy:dev:auto     → environments/Config.dev.js   + .clasprc_dev.json
├── deploy:prod:auto    → environments/Config.prod.js  + .clasprc_prod.json
```

---

## Target Architecture

### Modelo Single-DB Multi-Tenant

```
┌─────────────────────────────┐     ┌─────────────────────────────┐
│    TENANT A (Coppel)        │     │    TENANT B (Bancoppel)     │
│  ┌─────────────────────┐    │     │  ┌─────────────────────┐    │
│  │  Apps Script         │    │     │  │  Apps Script         │    │
│  │  (coppel.com)        │    │     │  │  (bancoppel.com)     │    │
│  │  ┌───────────────┐  │    │     │  │  ┌───────────────┐  │    │
│  │  │ Config_System  │  │    │     │  │  │ Config_System  │  │    │
│  │  │ (Props local)  │  │    │     │  │  │ (Props local)  │  │    │
│  │  └───────────────┘  │    │     │  │  └───────────────┘  │    │
│  └──────────┬──────────┘    │     │  └──────────┬──────────┘    │
└─────────────┼───────────────┘     └─────────────┼───────────────┘
              │  SPREADSHEET_ID_DB (mismo en ambos)│
              └──────────────┬──────────────────────┘
                             ▼
                  ┌──────────────────────┐
                  │  Google Sheets DB    │
                  │  (Compartida)        │
                  │  propietario: Coppel │
                  │  acceso: Bancoppel   │
                  └──────────────────────┘
```

### Config_System: Diseño del Adaptador Especial

La entidad `Config_System` requiere un adaptador que rompe el patrón estándar de la arquitectura hexagonal de forma controlada: en lugar de persistir en Google Sheets, lo hace en `PropertiesService`.

```
UI (FormRenderer) → API_Universal.save('Config_System', data)
                              ↓
                    Adapter_Config.js (NUEVO)
                    ├── read()  → PropertiesService.getScriptProperties()
                    └── write() → PropertiesService.setProperties()
```

**Intercepción en `Engine_DB.js`:** Cuando el `entityName === 'Config_System'`, el motor redirige a `Adapter_Config` en lugar de `Adapter_Sheets`.

### Pipeline Multi-Tenant (Despliegue)

```
package.json (nuevos comandos)
├── deploy:bancoppel:auto  → environments/Config.bancoppel.js + credenciales bancoppel
└── deploy:all:auto        → [dev, prod, bancoppel] en secuencia
```

Cada tenant requiere su propio archivo `.clasprc_bancoppel.json` con el `scriptId` del proyecto Apps Script de Bancoppel. Este archivo es ignorado por `.gitignore` (nunca al repositorio).

---

## Key Contracts (Interfaces)

### Config_System Schema Fields

| Campo | Tipo | Persistido en | Descripción |
|-------|------|--------------|-------------|
| `db_adapter_id` | `select` | PropertiesService → `ENV_CONFIG.DB_ADAPTER` | `sheets` / `clouddb` |
| `spreadsheet_id` | `text` | PropertiesService → `ENV_CONFIG.SPREADSHEET_ID_DB` | ID del Google Sheet |
| `allowed_domains` | `text` | PropertiesService → `ENV_CONFIG.ALLOWED_DOMAINS` | CSV de dominios SSO |
| `app_title` | `text` | PropertiesService → `WHITE_LABEL_CONFIG.title` | Título del navegador |
| `favicon_url` | `text` | PropertiesService → `WHITE_LABEL_CONFIG.faviconUrl` | URL del ícono |
| `tenant_name` | `text` | PropertiesService → `ENV_CONFIG.TENANT_NAME` | Nombre del Tenant (ej. "Coppel") |

### Adapter_Config.js Interface

```javascript
const Adapter_Config = {
  get: function(key)              // Lee de PropertiesService
  set: function(key, value)      // Escribe en PropertiesService
  getAll: function()             // Retorna objeto con toda la config actual
  setAll: function(obj)          // Escribe múltiples keys a la vez (transaccional)
  asListResponse: function()     // Retorna formato compatible con API_Universal (1 solo "registro")
}
```

### environments/Config.bancoppel.js

```javascript
const ENV = {
  SPREADSHEET_ID_DB: '[MISMO_ID_QUE_COPPEL]',  // BD Compartida
  CLASP_SCRIPT_ID:   '[SCRIPT_ID_BANCOPPEL]',   // Proyecto Apps Script de Bancoppel
  APP_VERSION:       'v1.x.x',
  TENANT_NAME:       'Bancoppel',
  ALLOWED_DOMAINS:   ['@bancoppel.com']
}
```
