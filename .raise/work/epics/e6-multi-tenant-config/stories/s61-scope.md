# S61 — Scope: Adapter_Config (PropertiesService)

## In Scope

- Crear `src/Adapter_Config.js` con dos métodos públicos:
  - `Adapter_Config.setAll(payload)` — persiste todos los campos de `Config_System` en `PropertiesService.getScriptProperties()`
  - `Adapter_Config.asListResponse()` — lee desde `PropertiesService` y retorna el formato `{ headers[], rows[] }` que espera el `FormRenderer` (idéntico al de `Adapter_Sheets.list`)
- La config es un **singleton** — no existe concepto de múltiples registros. Siempre hay exactamente una fila con `config_id = 'SYS-CONFIG-001'`
- Los campos de `Config_System` se derivan del schema (`APP_SCHEMAS.Config_System.fields`) para garantizar que el adaptador esté siempre sincronizado con el schema
- Valores default: todos los campos vacíos excepto `config_id` que siempre es `'SYS-CONFIG-001'`
- El adaptador es invisible para el `Engine_DB` una vez conectado — el motor simplemente lo llama

## Out of Scope

- Migración de los valores actuales de `Config.*.js` hacia `PropertiesService` → S62
- UI de branding o apariencia → S62
- Wizard de primer arranque → S65
- Soporte a múltiples registros de config → nunca (es un singleton por diseño de la épica)

## Done Criteria (Observable)

- [ ] `src/Adapter_Config.js` existe y exporta `Adapter_Config` al scope global de GAS
- [ ] `Engine_DB.list('Config_System')` retorna un objeto `{ headers, rows }` válido (sin errores) desde el panel de administración
- [ ] `Engine_DB.save('Config_System', payload)` guarda en `PropertiesService` sin escribir en Sheets
- [ ] La configuración persiste al recargar la app (se lee de PropertiesService)
- [ ] Los tests unitarios del adaptador pasan (con mocks de PropertiesService)
