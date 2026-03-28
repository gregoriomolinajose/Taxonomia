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

## [UI/Frontend] Resoluciones de Zero-Touch UI en Ionic Shadow DOM (Sprint 3)

- **Golden Pattern 5: Aislamiento CSS de Shadow DOM (Fuerza Bruta).** Queda documentado que variables CSS de Ionic (como `--padding-start`) conllevan especificidad extrema dentro de componentes Shadow (`<ion-item>`). Para invalidar el comportamiento nativo y acatar redimensionamientos dinámicos estrictos (como `.shell-mini` en el Sidebar a 72px), es MANDATORIO el uso de anulaciones base `!important` y redefiniciones del display (`display: flex !important; justify-content: center !important`).
- **Golden Pattern 6: Sincronización de Layout JS (Hack de Reflow OBLIGATORIO).** Al alternar clases CSS que desencadenan transiciones espaciales drásticas, el viewport no lo notifica automáticamente a librerías de terceros. Es OBLIGATORIO (Regla 13) despachar un `window.dispatchEvent(new Event('resize'))` empacado asíncronamente en un `setTimeout` superior a `350ms` (tiempo de la transición CSS) logrando el recálculo simétrico de gráficas ApexCharts y Grids adjuntas.
- **Golden Pattern 7: Inyección Inmutable ("Zero-Touch Grid").** La pureza del componente central del Dashboard exige que no haya manipulación manual del marcado (`<ion-row>`, `<ion-col>`) para arreglar desplomes visuales. Todo ajuste debe ser inducido desde la envoltura (layout) mediante eventos sintéticos de reflow, dejando el Grid inalterado.
- **Golden Pattern 8: Regla de Soft-Delete.** Se reafirma el Golden Pattern de que los Motores CRUD deben operar sobre borrado lógico en las entidades (Soft-Delete) empleando marcadores de estado; bajo estricta prohibición moral de eliminar la data operativa directamente de BD para mantener el ecosistema relacional (referencias de metadata).

## Hito: Implementación de Auditoría Inmutable (Audit Trail)
- **Hito:** Seguridad Transaccional en Google Sheets (Upsert Inmutable)
- **Punto de Falla (Root Cause):** Al ejecutar la operación `setValues([rowToInsert])` para actualizar un registro, existía el riesgo de sobrescribir accidentalmente las fechas de creación (`created_at`, `created_by`) si el payload del frontend contuviese basura, o si la función no distinguiera entre Insert y Update.
- **Solución Maestra (Golden Pattern):** Patrón de *Inmutabilidad Matemática por Consolidación Estática*.
  ```javascript
  // 1. Antes de cualquier Update, leer explícitamente la fila pre-existente desde la Base de Datos
  let existingRow = sheet.getRange(foundRowIndex, 1, 1, normalizedHeaders.length).getValues()[0];
  
  // 2. Durante el mapeo de columnas, forzar la copia dura de los campos 'created'
  if (headerName === 'created_at' || headerName === 'created_by') {
      rowToInsert.push(existingRow[i]); // Reinyectar el dato exacto preexistente, ignorando el payload
  } else if (headerName === 'updated_at') {
      rowToInsert.push(new Date().toISOString()); // Autoridad del Servidor
  }
  ```
- **Regla Preventiva de Diseño:** *Regla de Autoridad del Backend.* Jamás confíes en las fechas de auditoría que provengan del cliente (`payload`). Durante todo Update síncrono a una base plana como Sheets, el Sistema DEBE recuperar el registro anterior y preservar dogmáticamente los metadatos de creación inyectándolos de vuelta en el array de actualización.

---

## Hito: Estabilización Sistémica de Testing (Jest Dual-Write)
- **Hito:** Prevención de "Fatal Crashes" en Jest Workers
- **Punto de Falla (Root Cause):** Las suites de pruebas de Jest (`__tests__/`) colapsaban devolviendo `Jest worker encountered 4 child process exceptions`. El problema radicaba en que el entorno de Node.js no reconocía las variables globales exclusivas de Google Apps Script (`Logger`, `Session`, `SpreadsheetApp`), detonando excepciones no controladas antes de que las pruebas lograran correr. Adicionalmente, tratar las promesas rechazadas (`mockRejectedValueOnce`) sobre código estritactamente síncrono propiciaba fugas que Jest catalogaba como letales.
- **Solución Maestra (Golden Pattern):** Inyección de un Contexto Global Homogéneo.
  1. Crear `jest.setup.js`:
  ```javascript
  global.Logger = { log: jest.fn() };
  global.Session = { getActiveUser: jest.fn().mockReturnValue({ getEmail: jest.fn() }) };
  global.SpreadsheetApp = { ... };
  ```
  2. Modificar obligatoriamente `jest.config.js`:
  ```javascript
  module.exports = {
      setupFiles: ['<rootDir>/jest.setup.js'],
      // ...
  };
  ```
  3. Mapear retornos síncronos mediante `.mockReturnValueOnce` en vez del resolutor de Promesas.
- **Regla Preventiva de Diseño:** *Agnosticismo de Testing.* Todo simulador (Mock) de un componente de Google Apps Script debe ser inyectado obligatoriamente en la fase de `setupFiles` de Jest, jamás dentro del bloque individual. Además, si el diseño original es `sync` en GAS, el test debe mockear su fallo usando `.mockImplementationOnce(() => { throw new Error(...) })` y no Promesas Asíncronas filtradas que corrompan los Workers.

---

## Hito: Implementación de Borrado Seguro (Soft Delete) y Filtro UI
- **Hito:** Prevención de pérdida de datos transaccionales mediante Soft Delete.
- **Punto de Falla (Root Cause):** El borrado físico de registros (`deleteRow()`) destruía el historial inmutable de auditoría (`created_at`, `created_by`, etc.) requerido por el modelo SAFe 6.0, perdiendo completamente la trazabilidad de quién y cuándo se eliminó un dato.
- **Solución Maestra (Golden Pattern):** Transformación del Delete a Update Dirigido.
  1. El Backend intersecta la solicitud de borrado realizando una mutación in-place de la columna `estado` al valor `Eliminado`.
  2. El Backend protege agresivamente `created_at` manteniéndolo intacto e inyecta `updated_by` y `updated_at` captando los datos del actor en vivo.
  3. El Frontend aplica un filtro optimista y estático `data.filter(r => r.estado !== 'Eliminado')` inmediatamente al recibir el payload, aislando visualmente el dato sin corromper el almacén real.
- **Regla Preventiva de Diseño:** *Inmortalidad del Registro.* Ninguna operación de negocio en el Backend debe eliminar filas físicas del almacenamiento persistente. Todo borrado debe ser ejecutado como un método que muta el "estado" a un flag de desactivación y delega al Frontend la responsabilidad de ocultar/ofuscar la data de la capa de UI.

---

## Hito: Flexibilidad Estructural con Portfolio Canvas (Array vs Object Schemas)
- **Hito:** Refactorización dinámica del generador de UI (`FormEngine_UI.html`) para interpretar esquemas orientados a configuración pura (Objetos JS en vez de Arrays restrictivos).
- **Punto de Falla (Root Cause) previo:** Anteriormente, el motor estaba acoplado a leer un array `fields: []` dentro de `APP_SCHEMAS`. Al requerirse una vista tipo "Portfolio Canvas", estructurar todos los metadatos en un array resultaba repetitivo y rompía el control visual para el Developer/Architect; además, se introdujeron deudas técnicas como `API_Auth` fallando en CI/CD por falta del `CONFIG` global en el sandbox de Jest.
- **Solución Maestra (Golden Pattern):** Polimorfismo de Schemas y Mocking Inclusivo.
  1. Se agregó detección polimórfica en el generador de UI para procesar como Objeto todo aquello que carece de `.fields` o no es Array: `Object.keys(schemaDef).map(k => ({ name: k, ...schemaDef[k] }))`.
  2. Map-reduce para normalizar la clave `group` en `step`, reutilizando el motor del "Line Wizard" que originalmente mapeaba por el nodo `step`. Transparencia para toda lógica posterior.
  3. Soporte agnóstico e inmediato al grid para campos invisibles (`field.type === 'hidden'`).
  4. La deuda técnica de tests dependientes del dominio en entorno virtualizado se saneó inyectando variables configuracionales en el bloque `beforeAll` (`global.CONFIG.ALLOWED_DOMAINS`) exclusivo para Jest.
- **Regla Preventiva de Diseño:** *Solidaridad y Polimorfismo en Motor UI.* Un motor dinámico que escupe UI basándose en Diccionarios de Datos, NUNCA debe asumir una única estructura. Debe normalizar entradas agnósticamente para garantizar retrocompatibilidad. Las pruebas unitarias de Seguridad y Dominio (como correos permitidos) DEBEN ser aisladas parametrizando un mock en el hook principal del framework y jamás dejarse con variables indefinidas si el fallback rechaza configuraciones por diseño.

---

## Hito: Sanitización Universal MALS (Pre-Serialization Hook)
- **Hito:** Prevención de Error "Malformed JSON" en la Sincronización Mobile/Web Bridge.
- **Punto de Falla (Root Cause):** Al devolver datos desde Google Apps Script (`google.script.run`) hacia la UI Mobile/Web, si el objeto `responseData` contiene tipos de datos nativos de GAS (específicamente ojetos `Date` de auditoría), el motor de serialización de Ionic/WebView puede fallar silenciosamente o lanzar excepciones de "Malformed JSON" debido a la incapacidad de serializar el prototipo del objeto `Date` dentro de un objeto anidado.
- **Solución Maestra (Golden Pattern):** Patrón de *Clonación Dura para Aplanado de Prototipos*.
  ```javascript
  // En el controlador (API_Universal.gs), antes de retornar el payload final:
  return JSON.parse(JSON.stringify(responseData));
  ```
- **Regla Preventiva de Diseño:** *Agnosticismo de Serialización.* Ningún controlador de Backend debe devolver objetos nativos o prototipados directamente a la red. Todo objeto de respuesta DEBE pasar por una fase de "Stringify-Parse" para garantizar que el payload sea JSON puro (texto e ints únicamente), eliminando referencias circulares y tipos no soportados antes de cruzar el puente de red.

---

## Hito: Auto-Aprovisionamiento Dinámico para Esquemas Planos (Flat Schemas)
- **Hito:** Robustez en la Creación Automática de Pestañas (Refactor `Adapter_Sheets`).
- **Punto de Falla (Root Cause):** El motor original de aprovisionamiento de encabezados (`_ensureSheetExists`) buscaba estrictamente un nodo `fields` (Array). Al introducir entidades configuradas como objetos de configuración plana (como `Capacidad` o `Dominio`), la lógica fallaba, dejando la hoja de Google Sheets creada pero sin encabezados. Esto causaba pérdida silenciosa de datos al intentar escribir en una hoja sin estructura.
- **Solución Maestra (Golden Pattern):** Mapeo de Cabeceras por Extracción de Claves con Filtro de Metadatos.
  ```javascript
  // Si no hay .fields, extraer llaves del objeto raíz filtrando flags internos
  schemaFields = Object.keys(APP_SCHEMAS[tableName]).filter(k => 
      typeof APP_SCHEMAS[tableName][k] === 'object' && !['uiBehavior', 'relationType'].includes(k)
  );
  ```
- **Regla Preventiva de Diseño:** *Provisionamiento Agresivo Basado en Llaves.* Si una entidad no declara un array explícito de campos, el sistema debe ser capaz de auto-descubrir su estructura recorriendo las claves del objeto primario. Jamás se debe permitir que un adaptador devuelva una hoja de base de datos sin inyectar preventivamente los nombres de columnas derivados del esquema.

---

## Hito: Integridad Relacional en FormEngine (Zero-Touch Selects)
- **Hito:** Refactorización Arquitectónica de Dependencias 1:N (Select Asíncrono Delegado).
- **Punto de Falla (Root Cause):** Durante el aprovisionamiento de entidades relacionales (ej. `Equipo`), el esquema declaraba erróneamente dependencias usando `type: "lookup"` e `lookupTarget`. El FormEngine compila esto como un input de texto ciego (`readonly: true`) sin lógica adjunta de modal, rompiendo la capacidad de interactuar y seleccionar las foráneas como el Scrum Master.
- **Solución Maestra (Golden Pattern):** Patrón de *Select Relacional Hidratado*.
  ```javascript
  // 1. En Schema_Engine.gs: Declaración nativa apuntando al endpoint Resolutor
  { name: "scrum_master", type: "select", options: [], lookupSource: "getPersonasOptions" }
  
  // 2. En API_Universal.gs: Retornar Array purificado de tuplas {value, label}
  function getPersonasOptions() {
      const result = Engine_DB.list('Persona');
      const options = result.rows.map(row => ({ value: row.id_persona, label: row.nombre_completo }));
      return JSON.parse(JSON.stringify(options)); // Destrucción MALS requerida (Regla 10)
  }
  ```
- **Regla Preventiva de Diseño:** *Fidelidad al Motor Selectivo UI.* Al provisionar nuevos CRUDs bajo el Blueprint V2, el agente NUNCA debe alucinar el tipo `lookup` para relaciones parentales o listas simples. Toda dependencia Foránea ("Pertenece a") debe ser modelada inquebrantablemente mediante `type: "select"`, vinculando un `lookupSource` que resuelva al vuelo desde el servidor. Esto acopla la vista sin inyectar HTML explícito.

---

## Hito: Inyección Inmutable en RAM (Zero-Latency UI)
- **Hito:** Prevención de Re-Fetch (latencia 2-3s) tras operaciones CRUD exitosas.
- **Punto de Falla (Root Cause):** Al guardar una entidad (Crear o Editar) en `FormEngine_UI`, el *success handler* estaba acoplado a invocar `window.DataViewEngine.render(...)`, lo cual forzaba a Apps Script a descargar toda la base de datos de nuevo provocando latencias severas, consumo de cuota e interrupciones del hilo visual.
- **Solución Maestra (Golden Pattern):** Patrón de *Inyección Pura de Frontend Cache (Optimistic UI)*.
  1. El servidor responde estrictamente la Primary Key afectada y su valor (`response.pk`, `response.pkValue`).
  2. El cliente ubica el caché `window.__APP_CACHE__[entityName]`, genera una copia del arreglo `[...liveData]` y aplica un `splice` in-place (o destructuración pre/post índice) sin mutar la referencia de Reactividad.
  3. Los registros nuevos se inyectan `unshift()` (prepends) para que el grid los renderice inmediatamente de primeros.
- **Regla Preventiva de Diseño:** *Prohibición de Re-Fetch Ciclico.* Ninguna operación de escritura que regrese "success" debe invocar un método GET/List de red. El frontend de Taxonomía es el dueño del estado una vez cargado; toda mutación exitosa debe reflejarse sincronizando la variable global en RAM y detonando un re-render puramente basado en DOM.

---
