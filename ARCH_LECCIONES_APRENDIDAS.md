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
