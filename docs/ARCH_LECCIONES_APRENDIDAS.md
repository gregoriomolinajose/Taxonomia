# Archivo de Lecciones Aprendidas (Knowledge Loop)

Registro continuo de desafíos técnicos, causas raíz y patrones maestros descubiertos durante el desarrollo del proyecto.

## Hito: Persistencia de Portafolio e Integración Frontend-Backend en GAS

- **Punto de Falla (Root Cause):** El fallo de los mensajes visuales (toasts) en el éxito de la persistencia se debió a la incompatibilidad del `toastController` global de Ionic dentro del entorno aislado de Google Apps Script, sumado a las condiciones de carrera o validación prematura de promesas asíncronas en el servidor (V8). En resumen, `google.script.run` no maneja bien la serialización de Promesas pendientes ni la inyección asíncrona de componentes Shadow DOM de Ionic si el controlador no está explícitamente anidado en el contexto dinámico actual.
- **Solución Maestra (Golden Pattern):** Creación directa y estricta de componentes web vainilla `document.createElement('ion-toast')` con asignación de clases nativas de CSS (ej. `toast.color = 'success'`). En el backend, migración a una Arquitectura Síncrona bloqueante en `Engine_DB` y `Adapter_Sheets` para asegurar que el callback frontend reciba un objeto resolutivo final explícito, evitando caer en zonas muertas de asincronía.
- **Regla Preventiva de Diseño:** Bloqueo de Interfaz Gráfica (Loading state & Button Disable) obligatorio y estricto en el cliente en cualquier evento de post/guardado, junto con banderas concurrentes (`isSaving = true`) para evitar la duplicidad de registros y las reentradas (click-spamming) detectadas en las pruebas de UAT iniciales.
