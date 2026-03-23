# Archivo de Retrospectiva y Evolución Arquitectónica (Knowledge Loop)
Este documento registra las lecciones aprendidas durante los Sprints para evitar regresiones y entrenar al agente en sesiones futuras.

---

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
