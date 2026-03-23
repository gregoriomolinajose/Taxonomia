## 1. Mutaciones Sincronizadas y Zero-Latency Routing (Server-Confirmed UI)
- **Prohibición de Datos Fantasma (Anti-Optimistic UI):** Queda ESTRICTAMENTE PROHIBIDO actualizar la interfaz de usuario asumiendo que un guardado (Insert/Update) será exitoso antes de que el servidor responda.
- **Idempotencia y UI Lock:** Al iniciar una mutación, el botón de acción debe deshabilitarse (`disabled=true`) y la pantalla debe bloquearse con un `<ion-loading>` irrompible para prevenir envíos duplicados.
- **Inyección Segura:** Solo al recibir la respuesta confirmada del Backend (con la PK real), el Frontend inyectará el registro en la memoria RAM y forzará un redibujado instantáneo del `DataViewEngine`. Esto garantiza una navegación de 0.0 segundos de regreso al listado sin necesidad de un re-fetch de red completo.

## 2. Inmutabilidad Estructural (Root Array Cache Injection)
- **Estructura del Caché:** El caché global para los datos de la cuadrícula reside directamente en el arreglo raíz de la entidad: `window.__APP_CACHE__[entityName]`. NO se debe usar una propiedad fantasma `.data` para los registros.
- **Mutación Cero-Latencia:** Para inyectar registros NUEVOS (Inserts), se debe clonar el arreglo raíz, insertar el nuevo registro en la primera posición (`unshift` inmutable) y sobrescribir el caché global.

**❌ ANTI-PATRÓN (Crea registros invisibles/fantasmas):**
\`\`\`javascript
// MAL: Inyectar en una propiedad .data inexistente o anidada.
window.__APP_CACHE__[entityName].data = [newRecord, ...staleCache];
\`\`\`

**✅ PATRÓN CORRECTO (Inmutabilidad Raíz):**
\`\`\`javascript
// BIEN: Inyectar directamente en el arreglo raíz que lee la tabla.
const freshCache = window.__APP_CACHE__[entityName] || [];
window.__APP_CACHE__[entityName] = [newRecord, ...freshCache];
DataViewEngine.render(); // Redibujado instantáneo
\`\`\`

## 3. Lectura Just-In-Time (JIT) y Prevención de Nodos Fantasma (Stale Closures)
- **Extracción de Payload JIT:** Al guardar un formulario, queda PROHIBIDO utilizar referencias globales o `NodeLists` cacheados para leer los inputs. Los datos deben extraerse consultando el DOM fresco en el milisegundo exacto de la ejecución (`document.getElementById()`).
- **Limpieza de Estado Inicial:** Al abrir un formulario para creación, se debe asegurar la limpieza explícita de variables de estado anteriores (ej. `currentEditId = null`) para evitar que un *Insert* se convierta accidentalmente en un *Update* por memoria sucia.