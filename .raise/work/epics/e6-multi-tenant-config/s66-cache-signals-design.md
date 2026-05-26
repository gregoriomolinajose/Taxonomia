# S66 · Design: Sys_Cache_Signals — Invalidación Proactiva Cross-Tenant

## Problema a Resolver

En la arquitectura Single-DB Multi-Tenant, el `CacheService` de cada tenant (Coppel / Bancoppel) es completamente aislado. Cuando Coppel crea un registro, la caché de Coppel se invalida instantáneamente, pero la de Bancoppel permanece con datos obsoletos hasta que su TTL de 60 minutos expire de forma pasiva.

**Objetivo:** Reducir la ventana de inconsistencia de 60 minutos a ≤ 60 segundos sin introducir dependencias externas (ni WebSockets, ni Firebase, ni polling a un servidor externo).

---

## Solución: Canal Pub-Sub Nativo vía Google Sheets

Usamos la misma BD compartida (Google Sheets) como canal de señalización. Añadimos una pestaña especial `Sys_Cache_Signals` de lectura extremadamente ligera (solo metadatos, no datos reales). Cada tenant la lee antes de servir desde su caché local.

### Flujo Completo

```
TENANT A (Coppel) - ESCRITURA
────────────────────────────────────────────────────────────
1. Usuario guarda una Persona.
2. Engine_DB.save() → Adapter_Sheets.upsert() [escribe en BD]
3. _invalidateCache('Persona')  ← ya existe hoy
      ↓ [NUEVO]
4. _publishCacheSignal('Persona', 'Coppel') → escribe 1 fila
   en Sys_Cache_Signals:
   { entity: 'Persona', invalidated_at: '2026-05-26T18:55:00Z', by_tenant: 'Coppel' }


TENANT B (Bancoppel) - LECTURA (hasta 60 seg después)
────────────────────────────────────────────────────────────
1. Usuario busca Personas (typeahead).
2. Engine_DB.list('Persona')
      ↓ [NUEVO] Antes de servir desde CacheService:
3. _checkCacheSignals('Persona')
   → Lee la mini-caché de señales (TTL: 60s)
   → Obtiene la señal de Coppel: invalidated_at = '18:55:00'
   → Compara con el timestamp de cuando se guardó la caché local: '18:40:00'
   → Señal es más nueva → INVALIDA caché local de Bancoppel
4. Engine_DB lee de Google Sheets (datos frescos)
5. Guarda en CacheService con timestamp actual
6. Retorna datos frescos al usuario ✅
```

---

## Diseño Técnico

### Pestaña `Sys_Cache_Signals` (en el Google Sheet compartido)

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `entity_name` | String | Entidad invalidada (ej. `Persona`, `Equipo`) |
| `invalidated_at` | ISO Timestamp | Cuándo ocurrió la mutación |
| `by_tenant` | String | Tenant que generó la mutación (`Coppel`, `Bancoppel`) |
| `signal_id` | UUID | Para deduplicación y limpieza |

La pestaña es append-only. Un job de limpieza (parte de S66) retiene solo las últimas **500 filas** para evitar que crezca indefinidamente.

### Cambios en `Engine_DB.js`

#### 1. Nueva función: `_publishCacheSignal(entityName)`
Se llama al final de `_invalidateCache()`, después de purgar el CacheService local.

```javascript
function _publishCacheSignal(entityName) {
  try {
    if (typeof Adapter_Sheets === 'undefined' || typeof CONFIG === 'undefined') return;
    const tenantName = (CONFIG.TENANT_NAME) || 'default';
    const signal = {
      signal_id:      'SIG-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      entity_name:    entityName,
      invalidated_at: new Date().toISOString(),
      by_tenant:      tenantName
    };
    Adapter_Sheets.upsert('Sys_Cache_Signals', signal, CONFIG);
    // Nota: No invalidamos la caché de Sys_Cache_Signals aquí para no crear recursión.
    // Sys_Cache_Signals tiene su propio TTL cortísimo (60s).
  } catch(e) {
    // Silencioso: fallar en la publicación de señal no debe romper la operación principal
    if (typeof Logger !== 'undefined') Logger.log('[CacheSignal] Fallo al publicar señal: ' + e.message);
  }
}
```

#### 2. Modificación: `_invalidateCache(entityName)` 
Agregar al final de la función existente:
```javascript
// [S66] Cross-Tenant Signal Publication
_publishCacheSignal(entityName);
```

#### 3. Nueva función: `_checkCacheSignals(entityName, cachedAt)`
Se llama en `Engine_DB.list()` ANTES de servir desde CacheService.

```javascript
function _checkCacheSignals(entityName, cachedAt) {
  try {
    if (typeof CacheService === 'undefined') return false; // sin caché, no aplica
    const cache = CacheService.getScriptCache();

    // La caché de señales tiene TTL de 60 segundos (muy corto, a propósito)
    const signalsCacheKey = 'CACHE_SIGNALS_v1';
    let signals;
    const cached = cache.get(signalsCacheKey);
    if (cached) {
      signals = JSON.parse(cached);
    } else {
      // Cache miss: leer de Sheets (es una tabla pequeña, máx 500 filas)
      const config = (typeof CONFIG !== 'undefined') ? CONFIG : {};
      const result = Adapter_Sheets.list('Sys_Cache_Signals', config, 'objects');
      signals = result ? (result.rows || []) : [];
      cache.put(signalsCacheKey, JSON.stringify(signals), 60); // TTL: 60 segundos
    }

    // Buscar si hay una señal más nueva que nuestra caché local para esta entidad
    const tenantName = (typeof CONFIG !== 'undefined' && CONFIG.TENANT_NAME) || 'default';
    const relevantSignals = signals.filter(function(s) {
      return s.entity_name === entityName && s.by_tenant !== tenantName; // Solo señales de OTROS tenants
    });

    if (relevantSignals.length === 0) return false; // No hay señales externas

    const latestSignal = relevantSignals.reduce(function(latest, s) {
      return s.invalidated_at > latest.invalidated_at ? s : latest;
    });

    // Si la señal más reciente es posterior a cuando guardamos nuestra caché → invalida
    return latestSignal.invalidated_at > cachedAt;

  } catch(e) {
    if (typeof Logger !== 'undefined') Logger.log('[CacheSignal] Error al verificar señales: ' + e.message);
    return false; // En caso de error, no invalidar (mejor dato viejo que WSOD)
  }
}
```

#### 4. Modificación: `Engine_DB.list()` — añadir timestamp al dato cacheado
El CacheService actual guarda solo los datos. Necesitamos envolver el payload con un timestamp:

```javascript
// Antes (actual):
_putCacheChunked(cache, cacheKey, JSON.stringify(result), 3600);

// Después (S66):
const wrappedResult = { data: result, cached_at: new Date().toISOString() };
_putCacheChunked(cache, cacheKey, JSON.stringify(wrappedResult), 3600);

// Y al leer, verificar señales ANTES de servir:
const wrapped = _getCacheChunked(cache, cacheKey);
if (wrapped && format !== 'tuples') {
  const parsed = JSON.parse(wrapped);
  const shouldInvalidate = _checkCacheSignals(entityName, parsed.cached_at);
  if (!shouldInvalidate) {
    return parsed.data; // ✅ Caché válida
  }
  // Si hay señal externa más nueva → fall through a leer de Sheets
}
```

---

## Tabla de Latencia (Comparativa)

| Escenario | Antes (S66) | Después (S66) |
|-----------|-------------|---------------|
| Mutación en mismo tenant | Instantáneo | Instantáneo (sin cambios) |
| Mutación en tenant externo | Hasta 60 min | ≤ 60 segundos |
| Costo por request (cache hit) | 0 lecturas de Sheets | 1 lectura de mini-caché de señales (60s TTL, en RAM) |
| Costo por request (cache miss) | 1 lectura de Sheets | 1 lectura de Sheets (igual) |

**Costo real del mecanismo de señales:** En la práctica, la caché de señales (`CACHE_SIGNALS_v1`) se sirve desde RAM durante 60 segundos. Solo 1 de cada ~60 requests (el primero de cada minuto) hará una lectura real de la pestaña `Sys_Cache_Signals`. El overhead es mínimo.

---

## Limpieza de Señales (Job de Mantenimiento)

Para que `Sys_Cache_Signals` no crezca indefinidamente, S66 incluye un trigger de tiempo en Apps Script que corre cada 24 horas y elimina señales con más de 1 hora de antigüedad. La pestaña nunca superará unas pocas decenas de filas en condiciones normales.

```javascript
function Job_CleanCacheSignals() {
  const cutoff = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hora atrás
  // Leer todas las señales, filtrar las viejas, reescribir la pestaña
}
```
