# E6 · Scope: Multi-Tenant Architecture & Config Governance (v2 - Revisado)

## Objective

Transformar Taxonomía en una plataforma Multi-Tenant lista para producción que soporte múltiples instancias corporativas (ej. Coppel + Bancoppel) operando con **código aislado por dominio** pero sobre una **única base de datos Google Sheets compartida**. Simultáneamente, centralizar todas las configuraciones del sistema en un panel CRUD nativo y añadir un mecanismo de **invalidación proactiva de caché cross-tenant** para mantener la consistencia de datos en tiempo cuasi-real.

**Value:** Escalar Taxonomía a cualquier dominio corporativo sin fricción de red. La configuración unificada reduce el onboarding de un nuevo tenant de días a minutos. La caché proactiva elimina la ventana de inconsistencia de 15 minutos y hace la plataforma sentirse como un sistema centralizado para el usuario final.

---

## Correcciones Arquitectónicas Incorporadas (Post-Challenge)

| # | Problema Detectado | Corrección |
|---|-------------------|------------|
| 1 | `Adapter_Config` interceptado hardcodeando nombre de entidad en `Engine_DB` | Declarar `adapter: 'config'` en el Schema; `Engine_DB` lo resuelve genéricamente |
| 2 | `S64` omitía validación en `deploy.js` contra despliegues accidentales cross-tenant | Agregar guard en `deploy.js` que verifique coherencia tenant/entorno |
| 3 | `S65 (Wizard)` detectaba config vacía en Frontend (después del WSOD) | Mover detección a `Code.js` (backend); retornar template `FirstRun.html` si no hay config |
| 4 | Caché cross-tenant con retraso de hasta 15 min sin señalización | Implementar `Sys_Cache_Signals` como canal de pub-sub nativo (ver S66) |
| 5 | Sin Row-Level Tenancy (cualquier tenant puede mutar datos de otro) | Decisión informada: **Se permite mutación cross-tenant** (por diseño). Documentado en ADR-006 |

---

## In Scope (MUST)

- **Config_System CRUD con Adapter Schema-Driven:** Entidad especial con campo `adapter: 'config'` en su schema. `Engine_DB` resuelve el routing genéricamente sin hardcodear nombres de entidades.
- **Deprecar Ajustes Globales del Schema Studio:** Migrar funcionalidades activas al nuevo panel `Config_System`.
- **First-Run Detection en Backend (`Code.js`):** Si `SPREADSHEET_ID_DB` está vacío, `doGet` retorna `FirstRun.html` (setup wizard) en lugar de `Index.html`.
- **Pipeline de despliegue Bancoppel:** Nuevo entorno `environments/Config.bancoppel.js` + comandos `deploy:bancoppel:auto` + guard de coherencia tenant/entorno en `deploy.js`.
- **Hardcode Audit & Cleanup:** Eliminar `@coppel.com` hardcodeado en lógica de negocio y fallbacks de `Index.html`.
- **`Sys_Cache_Signals` (Invalidación Proactiva Cross-Tenant):** Nueva pestaña en la BD compartida como canal de pub-sub. `_invalidateCache` escribe señales; `Engine_DB.list` las verifica antes de servir desde caché.

## In Scope (SHOULD)

- **Config_System: sección Adaptadores DB:** Campos para registrar futuras conexiones a BD externas respetando la arquitectura hexagonal.

## Out of Scope

| Item | Razón | Deferral |
|------|-------|----------|
| Migración a CloudDB / Postgres | Requiere su propia épica de infraestructura | E7 (futuro) |
| Dashboard de métricas cross-tenant | Necesita consolidador (Looker Studio) | Backlog post-E6 |
| Row-Level Tenancy (restricción de mutación) | Decisión informada: cross-tenant mutations permitidas | ADR-006 |

---

## Stories

| ID | Nombre | Descripción | Tamaño | Depende de |
|----|--------|-------------|--------|------------|
| S60 | Config_System Schema (adapter-driven) | Schema con campo `adapter: 'config'`; routing genérico en `Engine_DB` | S | — |
| S61 | Adapter_Config (PropertiesService) | `Adapter_Config.js` para leer/escribir en `PropertiesService` | M | S60 |
| S62 | Migración de Ajustes Globales | Deprecar pestaña; mover todo a `Config_System` | S | S61 |
| S63 | Pipeline Tenant Bancoppel | Entorno, comandos deploy y guard anti-despliegue-cruzado | M | — |
| S64 | Hardcode Audit & Cleanup | Eliminar dominios hardcodeados; mover fallbacks a `Config_System` | S | S61 |
| S65 | First-Run Wizard (Backend-First) | Detección en `Code.js`; retornar `FirstRun.html` si no hay `SPREADSHEET_ID_DB` | M | S62 |
| S66 | Sys_Cache_Signals (Caché Proactiva) | Nueva tab en BD compartida como canal pub-sub; integración en `_invalidateCache` y `Engine_DB.list` | L | S63 |

---

## Definition of Done

- [ ] `Config_System` es accesible desde el menú lateral y permite leer/guardar sin errores.
- [ ] La pestaña "Ajustes Globales" del Schema Studio ha sido eliminada o redireccionada.
- [ ] Un tenant sin `SPREADSHEET_ID_DB` ve el Wizard de primer arranque (no una pantalla en blanco).
- [ ] `npm run deploy:bancoppel:auto` empuja código exitosamente y falla con error descriptivo si el entorno no coincide.
- [ ] Un administrador de Bancoppel puede instalar Taxonomía apuntando al mismo `SPREADSHEET_ID_DB` de Coppel y ver los mismos datos.
- [ ] Cuando Coppel crea o modifica un registro, la caché de Bancoppel se invalida en ≤ 60 segundos.
- [ ] No existen referencias al dominio `@coppel.com` en lógica de negocio.

---

## Risks

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Admin de Bancoppel no tiene acceso "Editor" al Google Sheet | Media | Alto | Wizard (S65) documenta el paso de compartir como requisito previo |
| `Sys_Cache_Signals` crece indefinidamente y ralentiza lecturas | Media | Medio | S66 incluye un job de limpieza (retain últimas 500 señales) |
| El guard de deploy bloquea CI/CD legítimos con variables de entorno mal configuradas | Baja | Medio | Guard consultivo (warn) en CI, bloqueante solo en local |

---

## Implementation Plan

### Story Sequence & Rationale

| Pos | ID | Nombre | Tamaño | Estrategia | Habilita |
|:---:|----|--------|:------:|-----------|---------|
| 1 | **S60** | Config_System Schema (adapter-driven) | S | Walking Skeleton — prueba el contrato del campo `adapter` antes de escribir adaptadores | S61 (hard) |
| 2 | **S61** | Adapter_Config (PropertiesService) | M | Walking Skeleton — completa el E2E de lectura/escritura; el artefacto central de la épica | S62, S64, S65 (hard) |
| 3 | **S63** | Pipeline Tenant B | M | Paralelo con S61 — sin dependencia de código nuevo; usa solo scripts de despliegue y config | — |
| 4 | **S62** | Migración de Ajustes Globales | S | Dependency-driven — requiere S61 para persistir; elimina la pestaña obsoleta | S65 (soft) |
| 5 | **S64** | Hardcode Audit & Cleanup | S | Dependency-driven — requiere S61 para saber dónde leer config; limpieza del codebase | — |
| 6 | **S65** | First-Run Wizard (Backend-First) | M | Dependency-driven — necesita que `Config_System` exista y que los fallbacks estén limpios (S62+S64) | S66 (soft) |
| 7 | **S66** | Sys_Cache_Signals (Caché Proactiva) | L | Risk-first — historia más novedosa; se ejecuta al final para que los tenants A y B ya estén desplegados y puedan validarse en vivo | — |

**Oportunidad paralela confirmada:** S60+S61 y S63 pueden ejecutarse en paralelo (diferente área del codebase: schema/adaptador vs scripts de despliegue). Reduce el tiempo de entrega del M1 en ~2 días.

**Ruta crítica:** S60 → S61 → S62 → S64 → S65 → S66

---

### Milestones

#### M1: Walking Skeleton ✦
**Stories:** S60 + S61 (+ S63 en paralelo)
**Criterio de éxito:** Un administrador puede abrir `Config_System` en el menú lateral, guardar el `SPREADSHEET_ID_DB` y ver el valor persistido tras recargar (sin Google Sheets de por medio). Tenant B tiene un comando `deploy:tenantb:auto` funcional.
**Demo capability:** Formulario Config_System → Guardar → Recargar → Valor persistido ✅

#### M2: Core MVP ✦
**Stories:** S62 + S64 + S65
**Criterio de éxito:** La pestaña "Ajustes Globales" del Schema Studio ha desaparecido. Un tenant nuevo (sin `SPREADSHEET_ID_DB`) ve el Wizard de primer arranque en lugar de una pantalla blanca. No existen strings `@[dominio-especifico]` en lógica de negocio.
**Demo capability:** Tenant B nuevo → Primer despliegue → Ve Wizard → Configura Sheet ID → Carga la app ✅

#### M3: Feature Complete + E2E Integration ✦
**Stories:** S66
**Criterio de éxito:** Tenant A crea un registro → en ≤ 60 segundos el usuario de Tenant B ve el registro actualizado sin refrescar manualmente. `Sys_Cache_Signals` existe en la BD compartida.
**Demo capability:** Mutación en Tenant A → Búsqueda en Tenant B → Resultado fresco ✅

#### M4: Epic Complete ✦
Todos los DoD checkeados + ADR-006 actualizado con las decisiones finales tomadas durante la implementación.

---

### Parallel Work Streams

```
Stream 1 (Core):  S60 ──► S61 ──► S62 ──► S65 ──► S66
Stream 2 (Infra): S63 (paralelo con S61)
Stream 3 (Audit): S64 (paralelo con S62, después de S61)
```

---

### Sequencing Risks

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| `Adapter_Config` (S61) requiere cambios en `Engine_DB.js` que afectan el routing de todas las entidades | Alto | Implementar con feature flag; prueba en QA antes de activar en prod |
| El pipeline de Tenant B (S63) necesita que el admin de Tenant B cree el Apps Script project primero | Medio | Documentar en S63 el prerequisito; crear script de validación de credenciales |
| `Sys_Cache_Signals` (S66) puede introducir reads adicionales que afecten el rendimiento bajo carga alta | Bajo | Benchmark antes y después; revertible con un feature flag en `Engine_DB.list` |

---

### Progress Tracking

| # | Story | Size | Status | Actual | Velocity | Notes |
|:-:|-------|:----:|--------|--------|----------|-------|
| 1 | S60 — Config_System Schema | S | **Done** | 45min | 1.3x | AR: PASS · QR: PASS (1 fix) |
| 2 | S61 — Adapter_Config | M | Pending | — | — | Paralelo con S63 |
| 3 | S63 — Pipeline Tenant B | M | Pending | — | — | Paralelo con S61 |
| 4 | S62 — Migración Ajustes Globales | S | Pending | — | — | |
| 5 | S64 — Hardcode Audit | S | Pending | — | — | Paralelo con S62 |
| 6 | S65 — First-Run Wizard | M | Pending | — | — | |
| 7 | S66 — Sys_Cache_Signals | L | Pending | — | — | Requiere Tenant B activo |

**Velocidad asumida (baseline):** XS=0.5d, S=1d, M=2d, L=3-4d  
**Esfuerzo total estimado:** ~12-14 días de desarrollo  
**Reducción con paralelismo:** ~9-10 días efectivos

