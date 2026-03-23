# Reglas de QA y Control de Calidad (Testing & Validation)

## 1. Cobertura de Contrato (E2E Integration)
- **Ley de Integridad de Referencia:** Toda entidad CRUD debe contar con una prueba de "Ciclo de Vida Completo": Crear -> Listar -> Seleccionar para Editar -> Guardar Cambios.
- **Validación de Metadata-Match:** El motor de pruebas DEBE validar que la llave primaria (`primaryKey`) definida en el esquema sea exactamente la misma que el componente de UI (`DataView`) utiliza para disparar la función de edición.

## 2. Protocolo de Renombrado (Safe Rename)
- PROHIBIDO renombrar una columna en el esquema sin ejecutar una prueba de regresión en las vistas de listado y edición. 
- Si se cambia una llave (ej. `id_unidad` a `id_unidad_negocio`), el QA debe verificar que el mapeo de columnas en la Google Sheet sea actualizado en el mismo ciclo de despliegue.

## 3. Manejo de Errores y "Fail-Safe"
- **Ley del Protector de Nulls:** Ninguna función de búsqueda de registros (como `openEditForm`) puede asumir que los datos existen. DEBE implementar bloques `if (!data) { throw Error(...) }` o `try-catch` con mensajes descriptivos en la consola para facilitar el debugging.
- Todo error de "Undefined" detectado en consola durante el desarrollo es considerado un **Bloqueador de Despliegue**.

## 4. Pruebas de Humo (Smoke Tests)
- Antes de cada `deploy:prod`, el agente o desarrollador debe realizar un Smoke Test manual o automatizado:
  1. Cargar la página de Inicio (verificar que las Cards carguen).
  2. Entrar a la nueva entidad (verificar que el "Empty State" sea el correcto).
  3. Crear un registro de prueba y verificar que el ID generado siga la **Regla 6 de DB** (Prefijo-UUID).

## 5. Validación de Consistencia Visual
- El QA debe verificar que tras cada cambio en el esquema, no existan "Fugas de Snake Case" (Guiones bajos) en los títulos, headers o botones, respetando la **Sección 7 de rules_ui.md**.

## 6. Estándares de Performance y Latencia
- **Ley de Lectura en Bloque (Batching):** Queda terminantemente prohibido realizar llamadas a la API de SpreadsheetApp (`getValue`, `getRange`, `setRow`) dentro de ciclos iterativos (`for`, `map`, `forEach`). Todo procesamiento debe hacerse sobre arreglos en memoria tras una única llamada de lectura masiva.
- **Threshold de Aceptación:** Cualquier `callback` de lectura de datos que supere los 2.0 segundos en un entorno de desarrollo con menos de 100 registros debe ser marcado para refactorización inmediata de latencia.

## 7. Integridad de Pruebas en Capa de Datos (Anti-Mocking)
- **Prohibición de Mocks Superficiales:** Queda ESTRICTAMENTE PROHIBIDO mockear (simular) métodos del `Adapter_Sheets` en las pruebas de integración (`Engine_DB`). Si una prueba valida la persistencia de datos, debe ejecutar el código real del adaptador contra un entorno de base de datos de prueba (Test Environment) o memoria, para garantizar que la firma de la función realmente existe y opera.

## 8. Pruebas de Estado UI y Mutaciones Secuenciales (Zero-Latency QA)
- **Ley de la Doble Inserción (Anti-Stale State):** Toda prueba E2E o QA manual de un formulario de creación DEBE incluir la inserción de **dos registros consecutivos** sin recargar la página (Sin F5). 
- **Criterio de Aceptación:** Si el primer registro se guarda pero el segundo falla, muere silenciosamente, o sobrescribe al primero, se considera un **Fallo Crítico de Arquitectura (Detached DOM Nodes o Stale Closure)** y el despliegue queda rechazado.
- **Auditoría de Caché Raíz:** El motor de pruebas (o el desarrollador) DEBE verificar en la consola del navegador que `window.__APP_CACHE__[entityName]` incrementa su longitud (`length`) de manera inmutable y que la tabla HTML se redibuja en < 0.1s tras cada inserción.