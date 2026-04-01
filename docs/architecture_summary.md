# Resumen Central de Decisiones de Arquitectura (ADR & Golden Patterns)

Este documento condensa nuestro núcleo arquitectónico extraído de las lecciones aprendidas en el repositorio (`governance/ARCH_LECCIONES_APRENDIDAS.md`) y nuestros registros formales de decisión (ADRs). Sirve como guía de consulta rápida para el equipo técnico.

## 1. Patrones de la Interfaz Gráfica (UI/Frontend)

- **GP-1 (Linear Wizard Mobile-First):** Prohibidas las pestañas (`<ion-segment>`) para Múltiples Pasos en móvil. La decisión estructurada es usar Flujos Lineales (Botones Anterior/Siguiente) inyectados con un `Grid` dinámico.
- **GP-3 (Soft Reset Global):** Tras un Post exitoso, está prohibido usar `window.location.reload()`. La decisión es limpiar el estado reseteando secuencialmente el índice del Wizard, el contenedor de Chips y forzando la re-generación de los UUIDs precargados.
- **GP-5 y 6 (Aislamiento de Shadow DOM y Reflow):** Para forzar diseños inmutables como el "Mini Sidebar" y sobreponernos al Shadow DOM de Ionic, la arquitectura dicta forzar anulaciones bases (`!important`) y ejecutar desencadenadores artificiales asíncronos (`window.dispatchEvent(new Event('resize'))`) empacados a `>350ms` para obligar a librerías como ApexCharts a recalcular sus escalas responsivamente.

## 2. Patrones de Topología y Persistencia (Backend)

- **Rigor de Aprovisionamiento (Flat Schemas):** Las entidades configuradas de forma plana auto-descubrirán su estructura recorriendo las llaves del objeto raíz en `APP_SCHEMAS`. Nunca se debe inicializar ni tocar una hoja de Google Sheets sin haber inyectado primero estas cabeceras derivadas.
- **Seguridad Transaccional (Upsert Inmutable):** Durante cualquier operación de actualización de datos a Sheets (`Engine_DB`), la autoridad recae absoloutamente en el backend. El servidor intercepta OBLIGATORIAMENTE el payload, extrae el registro primigenio (`existingRow`) y **reinyecta `created_at` inmutablemente**, asegurando que un vector malicioso de cliente jamás corrompa la línea histórica de la auditoría original.
- **Select Relacional Hidratado (Zero-Touch Selects):** Los esquemas relacionales padres NO declaran strings vacíos para denotar dependencias. Deben declarar rigurosamente la clave `type: 'select'` atada a un `lookupSource`. `API_Universal` efectúa el mapeo iterativo en el servidor y retorna el diccionario de Opciones resuelto.
- **Diccionario de Topologías (SCD-2) [ADR-002]:** `Engine_Graph.js` intercepta las transacciones y valida la cardinalidad jerárquica consultando el "Diccionario de Topologías Organizacionales" para cerrar fechas de caducidad `valido_hasta` e invalidar nodos simultáneos padre previniendo colisiones lógicas.

## 3. Patrones de Latencia y Serialización (Performance)

- **Clonación Dura para Aplanado (Sanitización Universal MALS):** Antes de que un controlador del Backend (`google.script.run`) escupa el payload final al frontend, la arquitectura exige que el objeto pase por la sentencia: `JSON.parse(JSON.stringify(response))`. Este proceso aplanador destruye objetos nativos (`Date`) desterrando completamente crasheos fatales del parser de deserialización de Ionic ("Malformed JSON").
- **Inyección Inmutable en RAM (Zero-Latency UI):** Tras confirmar un guardado exitoso desde la Base de Datos, la decisión central es inquebrantable: **SE PROHÍBE EL RE-FETCH** de tablas de catálogo. Apps Script no debe volver a descargar la base de datos por red. El motor del UI localiza el almacenamiento `window.__APP_CACHE__[entityName]`, inyecta el nuevo vector vía inmutabilidad (`unshift()`) y repinta el DOM instantáneamente (`< 0.1s`).

## 4. Patrones de Control de Calidad y Pruebas (Test Environment)

- **Inyección de Contexto Global (Jest Dual-Write):** Node.js opera en vacío y desconoce el ecosistema en Nube de Google (GAS). Para resguardar la cordura del framework, se diseñó el `jest.setup.js` que inyecta variables simuladas globales de Google (`SpreadsheetApp`, `Logger`) garantizando que los Tests Lógicos NUNCA corrompan los "workers" de validación. Quedan expresamente prohibidos los "mock asíncronos" engañosos si la naturaleza funcional atómica requerida por GAS es síncrona.
- **Regla de Soft-Delete Dirigido:** Por reglamento de Trazabilidad, jamás ejecutamos sentencias de borrado físico profundo (`deleteRow()`). Protegemos las auditorías históricas mutando el estado interno a la bandera `Eliminado` e instruimos que el controlador de Frontend aplique inmediatamente un optimista `.filter(r => r.estado !== 'Eliminado')` suprimiéndolo así de las vistas en la interfaz gráfica del usuario.
