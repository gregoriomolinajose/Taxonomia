# Epic 23 Architecture Design: Enterprise Identity & Zero-Trust SSO

## 1. Domain Modeling
Para acomodar el despliegue multi-inqulino, el modelo central del frontend delegará configuraciones conectivas al propio backend (DataView).
Se levantará la entidad abstracta `Settings_Workspace` que existirá en el diccionario general `APP_SCHEMAS`.

## 2. API Design & Hydration Strategy (S23.1 / S23.2)
El "Admin SDK Wrapper" en el framework GAS será el proxy autorizado. En vez de depender de variables de entorno duras, buscará la tabla `Settings_Workspace`.
* **Caché:** Para evadir la política de ratelimitación de Google Directory API, el JS en cliente construirá el Map: `Map<email, photoUrl>`.

## 3. Disparador Universal de Reactividad (S23.3)
**Antes:** `window.debounce((params) => draw(), 500)` inyectado dispersamente.
**Después:** `global.AppEventBus.emit('UI_ACTION_SEARCH', payload, { debounceMs: 500 })`.
El bus instanciará los timeouts localmente cancelando los disparos previos asociando el ID único del tipo de evento.

## 4. Estrictés y Mocks (S23.4)
Los parámetros inyectados de configuraciones asíncronas no pueden carecer de typings.
El frontend despojará el flag `MOCK_ENV` y `session_force=true` protegiendo las compuertas de autenticación de todo el SPA.
