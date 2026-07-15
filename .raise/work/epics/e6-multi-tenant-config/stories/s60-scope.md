# S60 — Scope: Config_System Entity Schema

## In Scope

- Definir la entidad `Config_System` en `Schema_Engine.js` con campo `adapter: 'config'` en su metadata.
- Incluir los 6 campos funcionales: `db_adapter_id`, `spreadsheet_id`, `tenant_name`, `allowed_domains`, `app_title`, `favicon_url`.
- Configurar `showInMenu: true` con sección `ADMINISTRACIÓN` en la barra lateral.
- Agregar routing condicional en `Engine_DB.js`: cuando `schema.metadata.adapter === 'config'`, delegar a `Adapter_Config` (aunque el adaptador aún no exista — el routing se prepara con un guard claro).
- Establecer `showInSchemaStudio: false` para excluir la entidad del Blueprint Composer.
- Usar lenguaje white-label: "Tenant A/B", no nombres de empresa específicos.

## Out of Scope

- La implementación real de `Adapter_Config.js` → S61.
- La migración de los ajustes actuales → S62.
- La UI de branding (formulario de apariencia) ya existe en Schema Studio; solo se reemplaza su destino de persistencia en S62.

## Done Criteria (Observable)

- [ ] La opción "Configuración del Sistema" aparece en el menú lateral bajo una sección de administración.
- [ ] Al hacer clic, el formulario se renderiza con los 6 campos correctamente tipificados.
- [ ] Al intentar guardar, el sistema ejecuta el branch de routing hacia `Adapter_Config` (aunque devuelva un error temporal de "adaptador no encontrado" — el guard es visible en logs).
- [ ] `Config_System` NO aparece en la lista de entidades del Schema Studio Composer.
- [ ] No hay strings con nombres de empresa o dominios específicos en el schema definido.
