# S60 — Plan: Config_System Entity Schema

**Story:** S60 · **Size:** S · **Date:** 2026-05-26  
**Design:** [s60-design.md](s60-design.md) · **Epic:** E6

---

## Tareas

### T1 · Agregar `Config_System` al Schema_Engine.js
**Tamaño:** XS · **Depende de:** —

**Archivos:** `src/Schema_Engine.js`

**Qué hacer:**
- Insertar la entrada `Config_System` en el objeto `APP_SCHEMAS` antes de `_UI_CONFIG`
- 7 campos: `config_id` (PK readonly), `tenant_name`, `db_adapter_id` (select), `spreadsheet_id`, `allowed_domains`, `app_title`, `favicon_url`
- Metadata con `adapter: 'config'`, `showInMenu: true`, `showInSchemaStudio: false`, `section: 'ADMINISTRACIÓN'`, `order: 99`, `requireStrictMatrixAccess: true`
- SIN `ESTADO_FIELD` ni `AUDIT_FIELDS`

**Verificación:** Grep `Config_System` en Schema_Engine.js. Confirmar que el objeto tiene `adapter: 'config'` en metadata.

**AC ref:** AC1, AC2, AC5

---

### T2 · Guard de routing en `Engine_DB.js`
**Tamaño:** XS · **Depende de:** T1

**Archivos:** `src/Engine_DB.js`

**Qué hacer:**
- En `Engine_DB.list()`: ANTES del bloque de CacheService, leer `schema.metadata.adapter`. Si es `'config'` → delegar a `Adapter_Config.asListResponse()` o retornar `{ headers: [], rows: [] }` con log de warning si aún no existe el adaptador.
- En `Engine_DB.save()` (método `orchestrateNestedSave`): AL INICIO, antes del desempaquetado de relaciones, mismo check. Si es `'config'` → delegar a `Adapter_Config.setAll(payload)` o lanzar error descriptivo.
- El guard es idempotente: si `Adapter_Config` no existe, nunca crashea silenciosamente.

**Verificación:** Grep `adapter.*config` en Engine_DB.js. Revisar que el guard esté en ambas rutas (list y save).

**AC ref:** AC3

---

### T3 · Limpieza de textos hardcodeados en Schema_Workspace
**Tamaño:** XS · **Depende de:** —  
*(Paralelo con T1 — diferente bloque del schema)*

**Archivos:** `src/Schema_Engine.js`

**Qué hacer:**
- En `Config_Workspace`, cambiar los `helpText` que referencian `@coppel.com` y `@bancoppel.com` por ejemplos genéricos: `@tenantA.com`, `@tenantB.com`
- Aplica el principio white-label desde ahora sin esperar S64

**Verificación:** Grep `@coppel` y `@bancoppel` en Schema_Engine.js → debe retornar 0 resultados.

**AC ref:** AC5

---

### T4 · Test de integración manual (E2E)
**Tamaño:** XS · **Depende de:** T1, T2, T3

**Verificación completa:**
1. Desplegar a dev (`npm run deploy:dev:auto`)
2. Solicitar recarga manual al usuario
3. Confirmar que "Configuración del Sistema" aparece en el menú lateral
4. Confirmar que el formulario renderiza los 7 campos correctamente
5. Intentar guardar → verificar en logs de Apps Script que el guard de routing se ejecuta
6. Abrir Schema Studio → confirmar que `Config_System` NO aparece en el Composer

---

## Orden de Ejecución

```
T1 (Schema) ──┐
              ├──► T4 (E2E)
T3 (Cleanup) ─┘
              ▲
T2 (Engine) ──┘  (T2 depende de T1, pero T3 es paralelo a T1)
```

Orden real: **T1 → T2** (en el mismo commit puede ir T3 que es cosmético)

---

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|-----------|
| El menu sidebar no reconoce el nuevo campo `section: 'ADMINISTRACIÓN'` | Media | Verificar en T4 el primer despliegue; ajustar la clave si el sidebar usa otro campo |
| `showInSchemaStudio` no está implementado en el Schema Studio Composer | Media | Verificar en el código del Composer cómo filtra entidades; puede requerir un ajuste menor |

---

## Tracking

| Tarea | Status | Inicio | Fin |
|-------|--------|--------|-----|
| T1 - Schema Config_System | Pending | — | — |
| T2 - Guard Engine_DB | Pending | — | — |
| T3 - Cleanup helpText | Pending | — | — |
| T4 - E2E Manual | Pending | — | — |
