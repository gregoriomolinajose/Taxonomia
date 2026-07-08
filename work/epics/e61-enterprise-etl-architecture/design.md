---
epic_id: "e61"
grounded_in: "Gemba of Engine_ETL.js y DataEngine_ETL.client.js"
---

# Epic Design: Enterprise ETL Architecture

## Affected Surface (Gemba)

| Module/File | Current State | Changes |
|-------------|---------------|---------|
| `Engine_ETL.js` | Directamente acoplado a Google Sheets y lógica de entidades | Se divide en `Engine_ETL.js` (coordinador), `Adapter_Sheets.js` (transporte) |
| `DataEngine_ETL.client.js` | Reglas de transformación (ej. Dominios) harcodeadas | Lee `APP_SCHEMAS[entity].etlHooks` genéricamente |
| `API_Universal.js` | Llama sincrónamente a `exportDataToSheet` / `bulkInsert` | Implementará sistema de Job Queues (ej. `API_Jobs.js`) |
| `Schema_Engine.js` | Contiene tipos estáticos | Agregará validadores y transformers en formato de callbacks/lambdas textuales. |

## Target Components

| Component | Responsibility | Key Interface |
|-----------|---------------|---------------|
| `IDataProvider` | Leer/Escribir matrices desde una fuente | `getRows()`, `setRows(matrix)` |
| `ValidationEngine` | Validar filas contra el `APP_SCHEMAS` | `validateRow(entity, row)` -> `{ isValid, errors }` |
| `JobWorker` | Procesar ingestas en segundo plano sin timeout | `processChunk(jobId)` |
| `DLQManager` | Administrar filas con error para resolución manual | `logDeadLetter(jobId, row, reason)` |

## Key Contracts

**IDataProvider Interface:**
```javascript
class IDataProvider {
  /** @returns {Array<Array<any>>} */
  extractData(); 
  
  /** @param {Array<Array<any>>} matrix */
  loadData(matrix);
}
```

**Schema ETL Hooks:**
```javascript
// Dentro de APP_SCHEMAS['Dominio']
etlHooks: {
  onBeforeImport: function(matrix) { ... },
  onRowTransform: function(row) { ... }
}
```

## Migration Path
- Etapa 1: Implementar `IDataProvider` sin cambiar el flujo del frontend. (Transparente al usuario)
- Etapa 2: Mover validaciones a `ValidationEngine`.
- Etapa 3: Romper la sincronía: cambiar el API de `API_Universal` para retornar `job_id` e instruir al UI actual a hacer polling.
- Etapa 4: Desplegar UI para resolución de conflictos (DLQ).
