## 1. Mutaciones y Sincronización de Caché (Zero-Latency Routing)
- **Prohibición de Datos Fantasma:** Queda PROHIBIDO que el Frontend actualice la interfaz de usuario asumiendo que una operación de guardado (Insert/Update) será exitosa antes de que el servidor responda (Optimistic UI).
- **Inyección Confirmada por Servidor:** Tras una operación exitosa de guardado, la interfaz de usuario debe bloquearse (`<ion-loading>`) hasta recibir la confirmación y el registro final verificado del Backend. Solo al recibir esta confirmación, el Frontend empujará (push/update) el registro directamente al caché global (`window.__APP_CACHE__`) y procederá al enrutamiento de regreso a la vista de listado.
- **Forzado de Reactividad del DOM:** Al retornar al listado de listado, el motor de UI DEBE forzar un redibujado total (re-render) de la cuadrícula o tabla de datos, garantizando que los datos visuales estén sincronizados al 100% con la memoria RAM, sin realizar un re-fetch de red completo. Esto garantiza un retorno de 0.0 segundos pero con datos verificados.

## 2. Mutaciones y Sincronización de Caché (Server-Confirmed Updates)
- **Prohibición de Datos Fantasma (Anti-Optimistic UI):** Queda ESTRICTAMENTE PROHIBIDO que el Frontend actualice la interfaz de usuario o la memoria RAM (`window.__APP_CACHE__`) asumiendo que una operación de guardado (Insert/Update) será exitosa antes de que el servidor responda.
- **Inyección Segura de Estado (Zero-Latency Routing):** Tras una operación CRUD, la UI debe bloquearse (Loading state). El sistema DEBE esperar la confirmación de éxito y el registro final devuelto por el Backend. Solo al recibir esta confirmación, el Frontend inyectará el registro en el caché local y realizará la transición a la vista de listado. Esto garantiza una navegación instantánea (sin re-fetch de red) sin comprometer la integridad de la base de datos.

## 3. Preservación del Contenedor de Estado (Structural Immutability)
- **Estructura del Caché:** El caché global de la aplicación (`window.__APP_CACHE__[entityName]`) NO es un arreglo plano de registros. Es un **Objeto Contenedor** estricto que posee múltiples propiedades críticas de infraestructura: `{ data: Array, schema: Object, lookups: Object }`.
- **Prohibición de Destrucción del Esquema:** Queda ESTRICTAMENTE PROHIBIDO sobrescribir o reasignar el objeto contenedor principal en su totalidad. 
- **Mutación Segura:** Toda actualización inmutable de registros (Insert, Update, Delete) DEBE apuntar exclusivamente a la propiedad `.data` del contenedor, preservando intactas las propiedades `.schema`, `.lookups` y cualquier otro metadato del nivel superior.

**❌ ANTI-PATRÓN (Lo que rompe la UI):**
\`\`\`javascript
// MAL: Destruye el esquema y los lookups.
window.__APP_CACHE__[entityName] = [...cache.slice(0, idx), newRecord, ...cache.slice(idx + 1)];
\`\`\`

**✅ PATRÓN CORRECTO (Inmutabilidad Segura):**
\`\`\`javascript
// BIEN: Solo actualiza el arreglo de datos, preservando el contenedor.
const cacheData = window.__APP_CACHE__[entityName].data;
window.__APP_CACHE__[entityName].data = [...cacheData.slice(0, idx), newRecord, ...cacheData.slice(idx + 1)];
\`\`\`