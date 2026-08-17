# Archivo de Lecciones Aprendidas (Knowledge Loop)

Este archivo es de lectura OBLIGATORIA para cualquier agente que inicie una sesión en el proyecto (macro `init`). Documenta las decisiones arquitectónicas clave y puntos de falla superados para prevenir regresiones.

## Hito: Implementación de Caching Frontend y App Bootstrap (S1.1 y S1.2)
- **Punto de Falla (Root Cause):** Latencia de ~2.5s por cada navegación de vistas debido a las continuas llamadas de `google.script.run`. El cache se destruía al navegar. Adicionalmente, el frontend esperaba objetos pero existía riesgo de que el backend devolviera tuplas para ahorrar peso, quebrando el renderizado del DataView.
- **Solución Maestra (Golden Pattern):** 
  - Centralizar el almacenamiento local en `window.__APP_CACHE__`.
  - Crear el endpoint `getAppBootstrapPayload` en el Backend que se ejecuta **una única vez** al autorizar el inicio de sesión (`AuthManager.handleAuthResponse`).
  - **Sanitización Crítica:** Aplicar obligatoriamente `JSON.parse(JSON.stringify(payload))` en el backend para destuir Proxies nativos antes de devolver la data al Frontend. Además, asegurar el desempacado orgánico (tuples a objetos completos) *en el backend* antes de enviarlo.
- **Regla Preventiva de Diseño:** Ninguna vista nueva debe hacer peticiones de lectura nativa (`google.script.run`) durante la inicialización. Siempre DEBE consultar `window.__APP_CACHE__[entityName]` primero para lograr transiciones "Zero-Latency". Las llamadas de lectura a backend deben reservarse únicamente para forzar sincronizaciones bajo demanda.

## Hito: Blueprint V2 de Esquemas Dinámicos (S1.3)
- **Punto de Falla (Root Cause):** Se detectó que el motor de `Schema_Engine.gs` mezclaba dos modelos para la definición de los metadatos de las columnas de UI: el formato anticuado basado en Diccionarios (V1) y el estricto basado en Arreglos de Campos (V2). Esto creaba un peligro masivo de inestabilidad al procesar formularios.
- **Solución Maestra (Golden Pattern):** Se obligó a que todas las entidades operen bajo el formato estricto:
  ```javascript
  Entidad: {
    primaryKey: "id_...",
    titleField: "nombre_...",
    fields: [
       { name: "id_...", type: "text", required: true, primaryKey: true, ... },
       ...
    ]
  }
  ```
- **Regla Preventiva de Diseño:** Queda estrictamente PROHIBIDO escribir nuevos esquemas de base de datos bajo el formato V1 (diccionarios directos). Siempre se debe encapsular el mapeo de columnas dentro de un array `fields: []` y declarar `primaryKey` y `titleField` al mismo nivel de raíz. 

## Hito: Corrección de Desincronización de Caché en Eliminación (Zero-Latency Rule)
- **Punto de Falla (Root Cause):** Al eliminar un registro exitosamente desde el frontend, el bloque `withSuccessHandler` estaba ejecutando un destructivo `delete window.__APP_CACHE__[_state.entityName]`. Esto aniquilaba la data local y provocaba que, al navegar de nuevo hacia la vista de esa entidad, el frontend hiciera un *refetch* bloqueante hacia el servidor, rompiendo la experiencia de latencia cero.
- **Solución Maestra (Golden Pattern):** En lugar de purgar todo el array de la entidad, se aplicó una mutación inmutable por filtrado que respeta la configuración dinámica del esquema:
  ```javascript
  if (window.__APP_CACHE__ && window.__APP_CACHE__[_state.entityName]) {
      const idField = (ENTITY_META[_state.entityName] || { idField: 'id' }).idField;
      window.__APP_CACHE__[_state.entityName] = window.__APP_CACHE__[_state.entityName].filter(row => row[idField] !== id);
  }
  _rerenderData();
  ```
- **Regla Preventiva de Diseño:** Queda estrictamente prohibido usar la instrucción `delete` sobre las llaves principales de `window.__APP_CACHE__` al ejecutar un CRUD exitoso. Toda operación (Create, Update, Delete) debe actualizar el array de la entidad en memoria de forma optimista o inmutable y forzar un `_rerenderData()`, preservando así el "Zero-Latency" en las transiciones de vista.
