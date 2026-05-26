# S63 — Retrospectiva

**Story:** S63 · Pipeline Tenant B
**Fecha inicio:** 2026-05-26 · **Fecha cierre:** 2026-05-26
**Estimado:** M (90 min) · **Real:** ~20 min
**Epic:** E6

---

## Resumen de lo Implementado

- `environments/Config.tenantB.js` — Config de Tenant B, white-label:
  - `ALLOWED_DOMAINS: []` — vacío, se resuelve en runtime desde `Adapter_Config`
  - `ENV: 'tenantB'`
  - Runtime override por `PropertiesService.getProperty('ENV_CONFIG')` (patrón idéntico a dev/prod)
- `deploy.js` extendido:
  - Acepta `tenantB` como tercer environment válido
  - `SCRIPT_IDS['tenantB']` lee de `process.env.TENANT_B_SCRIPT_ID` (CI/CD-friendly) o placeholder
  - `DEPLOYMENT_IDS['tenantB']` idem para web app deployment
  - Guardia anti-despliegue accidental: bloquea si el Script ID es el placeholder
- `package.json`:
  - Nuevos scripts: `deploy:tenantB` y `deploy:tenantB:auto`
- `environments/Config.dev.js` y `Config.prod.js`:
  - Eliminados `@coppel.com` y `@bancoppel.com` de `ALLOWED_DOMAINS`
  - Comentario explicativo: dominios reales vienen de `Adapter_Config`
- Pipeline dev validado: sigue funcionando tras los cambios (86 archivos, 0 errores)

---

## Qué salió bien

- El diseño de deploy.js era muy limpio — agregar un tercer environment tomó 3 chunks de edición
- La variable de entorno `TENANT_B_SCRIPT_ID` hace el pipeline CI/CD-ready sin hardcodear el ID
- El guardia de placeholder fue la decisión correcta — evita despliegues silenciosos a ningún proyecto

## Qué mejorar

- Hubiera sido ideal tener el Script ID real de Tenant B para validar un deploy end-to-end
  En la práctica, el operador lo configura cuando crea el proyecto GAS de Tenant B

---

## Heutagogical Checkpoint

1. **¿Qué aprendiste?**
   Los pipelines de deploy multi-tenant son esencialmente un problema de parametrización:
   el mismo código, el mismo proceso, pero apuntando a un `scriptId` diferente.
   La clave es el guardia que previene el despliegue accidental.

2. **¿Qué cambiarías del proceso?**
   En el futuro, crear el proyecto GAS de Tenant B antes de arrancar S63 para poder
   validar el deploy end-to-end. El Script ID debería ser parte del scope inicial.

3. **¿Mejoras al framework?**
   El proceso de `rai-story-start` debería incluir un checklist explícito para historias
   de infrastructure: "¿Tienes las credenciales/IDs necesarios para validar end-to-end?"

---

## AR / QR

- **AR Verdict:** PASS — mínima adición al pipeline, sin duplicación, patrón consistente con dev/prod
- **QR Verdict:** PASS — guardia anti-despliegue, CI/CD-friendly via env vars, dominio white-label limpio
