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

## X. Mutación de Caché Zero-Latency (CRUD Completo)
- **Prohibición de Refetching:** Queda ESTRICTAMENTE PROHIBIDO que la navegación entre listados del menú lateral dispare llamadas al servidor (`google.script.run`) si los datos ya existen en `window.__APP_CACHE__[entityName]`. La latencia al cambiar de pestaña debe ser de 0.0s.
- **Sincronización Estricta de RAM:** Toda operación de mutación (Crear, Editar, **ELIMINAR**) debe actualizar OBLIGATORIAMENTE el arreglo raíz en la memoria del cliente en el milisegundo exacto en que el servidor confirma el éxito. 
  - Al **Editar**: Buscar el índice en `window.__APP_CACHE__` y reemplazar el objeto.
  - Al **Eliminar**: Filtrar y remover el objeto de `window.__APP_CACHE__` (ej. usando `.filter(r => r[idField] !== deletedId)`) o actualizar su propiedad `deleted_at` si el frontend maneja filtros de Soft-Delete.
- Si el frontend oculta un elemento visualmente del DOM pero no actualiza el `__APP_CACHE__`, se considerará un "Fallo Crítico de Desincronización".