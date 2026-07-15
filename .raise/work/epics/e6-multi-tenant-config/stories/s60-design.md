# S60 — Design: Config_System Entity Schema

## Problema & Valor

Las configuraciones del sistema (ID de Google Sheet, dominios SSO, branding) están dispersas entre archivos de código (`Config.*.js`), `PropertiesService` sin UI, y la pestaña oculta "Ajustes Globales" del Schema Studio. Un nuevo tenant no tiene ningún panel estándar para configurar su instancia.

**Valor:** Con esta historia, cualquier administrador de cualquier tenant puede configurar el sistema desde el menú lateral con el mismo Blueprint CRUD que usa para editar Personas o Portafolios — cero acceso a código.

---

## Enfoque

Declarar `Config_System` como una entidad de schema estándar pero con una propiedad especial `adapter: 'config'` en su metadata. El `Engine_DB` lee ese campo y delega a `Adapter_Config` en lugar de `Adapter_Sheets`. El formulario funciona exactamente igual que cualquier otra entidad en la UI.

### Componentes afectados

| Componente | Archivo | Cambio |
|-----------|---------|--------|
| `Schema_Engine` | `src/Schema_Engine.js` | **modify** — Agregar entrada `Config_System` al objeto `APP_SCHEMAS` |
| `Engine_DB` | `src/Engine_DB.js` | **modify** — Agregar guard de routing en `list()` y `save()` para `adapter: 'config'` |

---

## Ejemplos Concretos

### Schema resultante en `Schema_Engine.js`

```javascript
Config_System: {
  metadata: {
    adapter: 'config',                    // ← KEY: indica routing especial
    showInMenu: true,
    showInSchemaStudio: false,            // ← Excluye del Blueprint Composer
    order: 99,
    iconName: 'settings-outline',
    color: 'medium',
    label: 'Configuración del Sistema',
    section: 'ADMINISTRACIÓN',
    titleField: 'tenant_name',
    idField: 'config_id',
    fkField: null,
    requireStrictMatrixAccess: true       // Solo SUPER_ADMIN
  },
  primaryKey: 'config_id',
  fields: [
    { name: 'config_id', type: 'text', primaryKey: true, readonly: true, label: 'ID Configuración', width: 6 },
    { name: 'tenant_name', type: 'text', label: 'Nombre del Tenant', required: true, width: 6,
      helpText: 'Identificador White-Label de esta instancia. Ej: Tenant A' },
    { name: 'db_adapter_id', type: 'select', label: 'Adaptador de Base de Datos', required: true, width: 6,
      options: [
        { value: 'sheets', label: 'Google Sheets' },
        { value: 'clouddb', label: 'Cloud Database' }
      ],
      helpText: 'Motor de almacenamiento de datos activo.' },
    { name: 'spreadsheet_id', type: 'text', label: 'ID de Google Sheet (Base de Datos)', required: false, width: 12,
      helpText: 'El ID del archivo Google Sheets que actúa como base de datos compartida.' },
    { name: 'allowed_domains', type: 'text', label: 'Dominios SSO Permitidos (CSV)', required: false, width: 6,
      helpText: 'Correos permitidos para acceder al sistema. Ej: @tenantA.com,@tenantB.com' },
    { name: 'app_title', type: 'text', label: 'Título de la Aplicación', required: false, width: 6,
      helpText: 'Texto que aparece en la pestaña del navegador.' },
    { name: 'favicon_url', type: 'text', label: 'URL del Favicon', required: false, width: 12,
      helpText: 'URL pública del ícono de la aplicación.' }
  ]
}
```

### Guard de routing en `Engine_DB.js`

```javascript
// En Engine_DB.list() — ANTES del bloque de CacheService
const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[entityName] : null;
if (schema && schema.metadata && schema.metadata.adapter === 'config') {
  if (typeof Adapter_Config !== 'undefined') {
    return Adapter_Config.asListResponse();
  }
  Logger.log('[Engine_DB] WARN: Adapter_Config no disponible aún. Retornando vacío.');
  return { headers: [], rows: [] };
}

// En Engine_DB.save() — AL INICIO antes del dispatch a Sheets
if (schema && schema.metadata && schema.metadata.adapter === 'config') {
  if (typeof Adapter_Config !== 'undefined') {
    return Adapter_Config.setAll(payload);
  }
  throw new Error('[Engine_DB] Adapter_Config requerido para guardar Config_System.');
}
```

---

## Criterios de Aceptación (Refinados)

**MUST:**
- AC1: "Configuración del Sistema" visible en menú lateral, solo para SUPER_ADMIN
- AC2: Formulario renderiza los 7 campos (incluyendo `config_id`) con tipos y etiquetas correctas
- AC3: Engine_DB enruta correctamente cuando `metadata.adapter === 'config'`
- AC4: `Config_System` no aparece en Schema Studio Composer
- AC5: Schema 100% white-label (sin dominios ni empresas específicas)

**SHOULD:**
- El campo `db_adapter_id` muestra las opciones `sheets` y `clouddb` como selector visual

**MUST NOT:**
- El schema de `Config_System` NO debe tener `ESTADO_FIELD` ni `AUDIT_FIELDS` (son campos de negocio, no de configuración de sistema)
- NO crear hojas en Google Sheets para esta entidad
