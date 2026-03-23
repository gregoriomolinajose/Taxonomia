# Archivo de Lecciones Aprendidas (Knowledge Loop)

Registro continuo de desafíos técnicos, causas raíz y patrones maestros descubiertos durante el desarrollo del proyecto.

## Hito: Persistencia de Portafolio e Integración Frontend-Backend en GAS

- **Punto de Falla (Root Cause):** El fallo de los mensajes visuales (toasts) en el éxito de la persistencia se debió a la incompatibilidad del `toastController` global de Ionic dentro del entorno aislado de Google Apps Script, sumado a las condiciones de carrera o validación prematura de promesas asíncronas en el servidor (V8). En resumen, `google.script.run` no maneja bien la serialización de Promesas pendientes ni la inyección asíncrona de componentes Shadow DOM de Ionic si el controlador no está explícitamente anidado en el contexto dinámico actual.
- **Solución Maestra (Golden Pattern):** Creación directa y estricta de componentes web vainilla `document.createElement('ion-toast')` con asignación de clases nativas de CSS (ej. `toast.color = 'success'`). En el backend, migración a una Arquitectura Síncrona bloqueante en `Engine_DB` y `Adapter_Sheets` para asegurar que el callback frontend reciba un objeto resolutivo final explícito, evitando caer en zonas muertas de asincronía.
- **Regla Preventiva de Diseño:** Bloqueo de Interfaz Gráfica (Loading state & Button Disable) obligatorio y estricto en el cliente en cualquier evento de post/guardado, junto con banderas concurrentes (`isSaving = true`) para evitar la duplicidad de registros y las reentradas (click-spamming) detectadas en las pruebas de UAT iniciales.

## [UI/Frontend] Consolidación FormEngine (Sprint 2)

- **Golden Pattern 1: Linear Wizard (Mobile First).** Está PROHIBIDO usar `<ion-segment>` (pestañas) para flujos de varios pasos en móvil porque crea un "Frankenstein UX". Todo wizard debe usar un flujo lineal (Botones Anterior/Siguiente) controlando el display del Grid dinámicamente.
- **Golden Pattern 2: Componente 'chip-input'.** Para campos de múltiples etiquetas, el estándar del motor es el tipo `chip-input` definido en la metadata JSON. Renderiza un contenedor híbrido que inyecta/elimina `<ion-chip>`s y construye un array en memoria para el Payload.
- **Golden Pattern 3: Soft Reset Global.** Todo formulario de entidad debe invocar una limpieza profunda de estado tras un *Success Handler*. Esto implica: reiniciar el índice del Wizard a 0, limpiar `<ion-input>`s, vaciar contenedores de chips temporales y regenerar el UUID dinámico. Prohibido usar `window.location.reload()`.
- **Golden Pattern 4: UUID Híbrido Autogenerado.** Los campos que el Core DB requiera pero sean `readonly: true` y comiencen con `id_` deben ser resueltos en tiempo de ejecución por el Frontend. El motor genera un UUID corto para precargar el input durante el Mount() del formulario.

## [UI/Frontend] Single Source of Truth para Menús Dinámicos (Sidebar Amnesia)

- **Punto de Falla (Root Cause):** La renderización de listas en el menú principal y contextual (`Index.html`) estaba implementada con arreglos de objetos *hardcodeados* que no estaban sincronizados con la metadata oficial (`ENTITY_META`). Esto provocaba que entidades agregadas tardíamente (como `Capacidad`) desaparecieran del DOM al cambiar a `DataView`. A esto se sumó la mecánica de los _deploy scripts_ que sobreescribe `Global_Config.js`, impidiendo invalidar el caché si no se editaban los archivos en `environments/`.
- **Solución Maestra (Golden Pattern):** Migrar y centralizar toda metadata visual (`APP_SCHEMAS`, `ENTITY_META`) como objetos inyectados dinámicamente en el `<head>` del HTML principal de Apps Script, estabilizando el contexto antes de la hidratación de los motores Frontend. Extraer la lista iterando dinámicamente sobre esa variable unificada (SSOT) basándose siempre en una propiedad determinista `order`.
- **Regla Preventiva de Diseño:** Toda interfaz de navegación que agrupe entidades operacionales del modelo de negocio DEBE iterar dinámicamente sobre variables globales declaradas en el Root. Prohibido construir menús usando arreglos `const links = [...]` locales.
