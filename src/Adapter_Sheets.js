// src/Adapter_Sheets.js

// Global Cache per execution (GAS)
var __HEADER_CACHE__ = {};

function _normalizeHeader(headerStr) {
    if (!headerStr) return '';

    return headerStr
        .toLowerCase()                           // 1. Minúsculas
        .trim()                                  //    Trim
        .normalize("NFD")                        // 2. Remover tildes y diacríticos
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "_")             // 3. Reemplazar no-alfanuméricos (inc. espacios) por _
        .replace(/^_+|_+$/g, "");                // 4. Limpiar TODOS los guiones bajos iniciales y finales
}

const Adapter_Sheets = {
    upsert: function (tableName, payload, config) {
        // 1. Determinar PK con soporte para entidades plurales (ej. Grupo_Productos → id_grupo_producto)
        //    Prueba: id_<tableName> → id_<singular> → find(startsWith('id_'))
        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[tableName] : null;
        let primaryKeyField = schema && schema.primaryKey ? schema.primaryKey : null;
        
        if (!primaryKeyField) {
            const tableKey = tableName.toLowerCase();
            const singularKey = tableKey.endsWith('es') ? tableKey.slice(0, -2) : tableKey.endsWith('s') ? tableKey.slice(0, -1) : tableKey;
            primaryKeyField = payload.hasOwnProperty('id_' + tableKey) ? 'id_' + tableKey
                : payload.hasOwnProperty('id_' + singularKey) ? 'id_' + singularKey
                    : Object.keys(payload).find(key => key.startsWith('id_'));
        }

        if (!primaryKeyField || !payload[primaryKeyField]) {
            throw new Error(`Primary Key requerida. No se encontró 'id_${tableKey}' ni 'id_${singularKey}' en el payload.`);
        }



        const primaryKeyValue = payload[primaryKeyField];

        const spreadsheetId = config ? config.SPREADSHEET_ID_DB : CONFIG.SPREADSHEET_ID_DB;
        Logger.log("Adapter_Sheets.upsert: Usando SPREADSHEET_ID_DB = " + spreadsheetId);

        const ss = SpreadsheetApp.openById(spreadsheetId);
        Logger.log("Adapter_Sheets.upsert: Buscando pestaña... DB_" + tableName);
        const sheet = this._ensureSheetExists(ss, tableName);

        // 3. Leer Encabezados
        const headersRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
        const headers = headersRange.getValues()[0];

        // Mapear encabezados usando underscore para comparar con el payload
        const normalizedHeaders = headers.map(h => _normalizeHeader(h));
        Logger.log("Adapter_Sheets.upsert: Encabezados encontrados (normalizados): " + JSON.stringify(normalizedHeaders));

        // 5. Idempotencia: Buscar si existe la PK (Upsert)
        const pkIndex = normalizedHeaders.indexOf(primaryKeyField);
        if (pkIndex === -1) {
            throw new Error(`La columna llave primaria (${primaryKeyField}) no existe en DB_${tableName}`);
        }

        const dataRange = sheet.getDataRange();
        const numRows = dataRange.getNumRows();

        let foundRowIndex = -1;
        if (numRows > 1) {
            const pkColumnData = sheet.getRange(2, pkIndex + 1, numRows - 1, 1).getValues();
            for (let r = 0; r < pkColumnData.length; r++) {
                // C-01: Strict string comparison to prevent type-coercion collisions (e.g. "1" == 1)
                if (String(pkColumnData[r][0]) === String(primaryKeyValue)) {
                    foundRowIndex = r + 2; // +2: filas 1-indexed + skip header
                    break;
                }
            }
        }

        // 4. Construir Array de Fila e Inyección de Auditoría (Directiva de Product Architect)
        const currentUser = (typeof Session !== 'undefined') ? Session.getActiveUser().getEmail() : 'system@localhost';
        const currentTimestamp = new Date().toISOString();

        const idxCreatedAt = normalizedHeaders.indexOf('created_at');
        const idxCreatedBy = normalizedHeaders.indexOf('created_by');
        const idxUpdatedAt = normalizedHeaders.indexOf('updated_at');
        const idxUpdatedBy = normalizedHeaders.indexOf('updated_by');

        const rowToInsert = [];
        let existingRow = [];
        if (foundRowIndex > -1) {
            existingRow = sheet.getRange(foundRowIndex, 1, 1, normalizedHeaders.length).getValues()[0];
            
            // [S21.3 Soft-Delete] Bloquear updates en nodos lógicamente eliminados
            const chkIdxDeletedAt = normalizedHeaders.indexOf('deleted_at');
            const chkIdxEstado = normalizedHeaders.indexOf('estado');
            if ((chkIdxDeletedAt > -1 && existingRow[chkIdxDeletedAt]) || 
                (chkIdxEstado > -1 && existingRow[chkIdxEstado] === 'Eliminado')) {
                throw new Error("ERROR_ARCHIVED: No se puede modificar una entidad eliminada lógicamente.");
            }

            const idxVersion = normalizedHeaders.indexOf('_version');
            if (idxVersion > -1) {
                const currentDbVersion = Number(existingRow[idxVersion]) || 1;
                const incomingVersion = Number(payload._version) || 1;
                if (currentDbVersion !== incomingVersion) {
                    throw new Error("ERROR_CONCURRENCY: La entidad '" + primaryKeyValue + "' ha sido modificada por otro usuario recientemente. Por favor, recargue e intente nuevamente.");
                }
                payload._version = currentDbVersion + 1;
            }
        } else {
            payload._version = 1;
        }

        for (let i = 0; i < normalizedHeaders.length; i++) {
            const h = normalizedHeaders[i];

            if (foundRowIndex > -1) {
                // Modo Update: Preservar estricamente campos de creación
                if (h === 'created_at' || h === 'created_by') {
                    rowToInsert.push(existingRow[i]);
                } else if (payload.hasOwnProperty(h)) {
                    rowToInsert.push(payload[h]);
                } else {
                    // Mantiene valores existentes de columnas que el payload no envió
                    rowToInsert.push(existingRow[i]);
                }
            } else {
                // Modo Create
                rowToInsert.push(payload.hasOwnProperty(h) ? payload[h] : '');
            }
        }

        if (foundRowIndex > -1) {
            // Actualizar (Update) - Ya se iteró fusionando con existingRow
            if (idxUpdatedAt > -1) rowToInsert[idxUpdatedAt] = currentTimestamp;
            if (idxUpdatedBy > -1) rowToInsert[idxUpdatedBy] = currentUser;

            Logger.log(`Adapter_Sheets.upsert: ¿Se encontró el ID?: Sí. Fila: ${foundRowIndex}`);
            sheet.getRange(foundRowIndex, 1, 1, rowToInsert.length).setValues([rowToInsert]);
            return { status: 'success', action: 'updated', pk: primaryKeyField, val: primaryKeyValue };
        } else {
            // Insertar (Create)
            if (idxCreatedAt > -1 && (!rowToInsert[idxCreatedAt] || String(rowToInsert[idxCreatedAt]).trim() === '')) {
                rowToInsert[idxCreatedAt] = currentTimestamp;
            }
            if (idxCreatedBy > -1 && (!rowToInsert[idxCreatedBy] || String(rowToInsert[idxCreatedBy]).trim() === '')) {
                rowToInsert[idxCreatedBy] = currentUser;
            }
            if (idxUpdatedAt > -1) rowToInsert[idxUpdatedAt] = currentTimestamp;
            if (idxUpdatedBy > -1) rowToInsert[idxUpdatedBy] = currentUser;

            Logger.log("Adapter_Sheets.upsert: ¿Se encontró el ID?: No. Creando nueva fila para idempotencia...");
            sheet.getRange(sheet.getLastRow() + 1, 1, 1, rowToInsert.length).setValues([rowToInsert]);
            return { status: 'success', action: 'created', pk: primaryKeyField, val: primaryKeyValue };
        }
    },

    /**
     * upsertBatch(tableName, items, config)
     * Ejecuta múltiples upserts en bloque en memoria y escribe una sola vez para maximizar el rendimiento.
     */
    upsertBatch: function (tableName, items, config) {
        if (!Array.isArray(items) || items.length === 0) return { status: 'success', count: 0 };
        
        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[tableName] : null;
        const firstItem = items[0];
        let primaryKeyField = schema && schema.primaryKey ? schema.primaryKey : null;

        if (!primaryKeyField) {
            const tableKey = tableName.toLowerCase();
            const singularKey = tableKey.endsWith('es') ? tableKey.slice(0, -2) : tableKey.endsWith('s') ? tableKey.slice(0, -1) : tableKey;
            primaryKeyField = firstItem.hasOwnProperty('id_' + tableKey) ? 'id_' + tableKey
                : firstItem.hasOwnProperty('id_' + singularKey) ? 'id_' + singularKey
                    : Object.keys(firstItem).find(key => key.startsWith('id_'));
        }
                
        if (!primaryKeyField) {
            throw new Error(`Primary Key requerida para upsertBatch.`);
        }

        const spreadsheetId = config ? config.SPREADSHEET_ID_DB : CONFIG.SPREADSHEET_ID_DB;
        const ss = SpreadsheetApp.openById(spreadsheetId);
        const sheet = this._ensureSheetExists(ss, tableName);

        const dataRange = sheet.getDataRange();
        const originalData = dataRange.getValues();
        const headers = originalData[0];
        const normalizedHeaders = headers.map(h => _normalizeHeader(h));
        
        const pkIndex = normalizedHeaders.indexOf(primaryKeyField);
        if (pkIndex === -1) {
            throw new Error(`La columna llave primaria (${primaryKeyField}) no existe en DB_${tableName}`);
        }

        const idToIndexMap = new Map();
        for (let r = 1; r < originalData.length; r++) {
            idToIndexMap.set(String(originalData[r][pkIndex]), r);
        }

        const currentUser = (typeof Session !== 'undefined') ? Session.getActiveUser().getEmail() : 'system@localhost';
        const currentTimestamp = new Date().toISOString();

        const idxCreatedAt = normalizedHeaders.indexOf('created_at');
        const idxCreatedBy = normalizedHeaders.indexOf('created_by');
        const idxUpdatedAt = normalizedHeaders.indexOf('updated_at');
        const idxUpdatedBy = normalizedHeaders.indexOf('updated_by');

        const results = [];
        for (const payload of items) {
            const primaryKeyValue = payload[primaryKeyField];
            if (!primaryKeyValue) continue;
            
            const rowIndex = idToIndexMap.get(String(primaryKeyValue));
            let rowToInsert = [];
            
            if (rowIndex !== undefined) {
                const existingRow = originalData[rowIndex];

                // [S21.3 Soft-Delete] Bloquear updates en nodos lógicamente eliminados
                const chkIdxDeletedAt = normalizedHeaders.indexOf('deleted_at');
                const chkIdxEstado = normalizedHeaders.indexOf('estado');
                if ((chkIdxDeletedAt > -1 && existingRow[chkIdxDeletedAt]) || 
                    (chkIdxEstado > -1 && existingRow[chkIdxEstado] === 'Eliminado')) {
                    throw new Error(`ERROR_ARCHIVED: No se puede modificar la entidad con ID '${primaryKeyValue}' por estar eliminada lógicamente.`);
                }

                for (let i = 0; i < normalizedHeaders.length; i++) {
                    const h = normalizedHeaders[i];
                    if (h === 'created_at' || h === 'created_by') {
                        rowToInsert.push(existingRow[i]);
                    } else if (payload.hasOwnProperty(h)) {
                        rowToInsert.push(payload[h]);
                    } else {
                        rowToInsert.push(existingRow[i]);
                    }
                }
                if (idxUpdatedAt > -1) rowToInsert[idxUpdatedAt] = currentTimestamp;
                if (idxUpdatedBy > -1) rowToInsert[idxUpdatedBy] = currentUser;
                originalData[rowIndex] = rowToInsert;
                results.push({ status: 'success', action: 'updated', pk: primaryKeyField, val: primaryKeyValue });
            } else {
                for (let i = 0; i < normalizedHeaders.length; i++) {
                    const h = normalizedHeaders[i];
                    rowToInsert.push(payload.hasOwnProperty(h) ? payload[h] : '');
                }
                if (idxCreatedAt > -1 && (!rowToInsert[idxCreatedAt] || String(rowToInsert[idxCreatedAt]).trim() === '')) {
                    rowToInsert[idxCreatedAt] = currentTimestamp;
                }
                if (idxCreatedBy > -1 && (!rowToInsert[idxCreatedBy] || String(rowToInsert[idxCreatedBy]).trim() === '')) {
                    rowToInsert[idxCreatedBy] = currentUser;
                }
                if (idxUpdatedAt > -1) rowToInsert[idxUpdatedAt] = currentTimestamp;
                if (idxUpdatedBy > -1) rowToInsert[idxUpdatedBy] = currentUser;
                
                originalData.push(rowToInsert);
                idToIndexMap.set(String(primaryKeyValue), originalData.length - 1);
                results.push({ status: 'success', action: 'created', pk: primaryKeyField, val: primaryKeyValue });
            }
        }
        
        sheet.getRange(1, 1, originalData.length, originalData[0].length).setValues(originalData);

        return { status: 'success', count: results.length, details: results };
    },

    remove: function (tableName, id, config) {
        const spreadsheetId = config ? config.SPREADSHEET_ID_DB : CONFIG.SPREADSHEET_ID_DB;
        const ss = SpreadsheetApp.openById(spreadsheetId);
        const sheet = this._ensureSheetExists(ss, tableName);

        const headersRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
        const headers = headersRange.getValues()[0];
        const normalizedHeaders = headers.map(h => _normalizeHeader(h));

        const schema = (typeof APP_SCHEMAS !== 'undefined') ? APP_SCHEMAS[tableName] : null;
        let pkField = schema && schema.primaryKey ? schema.primaryKey : null;

        if (!pkField) {
            const tableKey = tableName.toLowerCase();
            const singularKey = tableKey.endsWith('s') ? tableKey.slice(0, -1) : tableKey;
            const pkCandidates = ['id_' + tableKey, 'id_' + singularKey].filter(k => normalizedHeaders.includes(k));
            pkField = pkCandidates.length > 0 ? pkCandidates[0] : normalizedHeaders.find(h => h.startsWith('id_'));
        }

        if (!pkField) throw new Error("No se pudo determinar la Primary Key en los encabezados para el Soft Delete.");

        const pkIndex = normalizedHeaders.indexOf(pkField);

        const dataRange = sheet.getDataRange();
        const numRows = dataRange.getNumRows();

        let foundRowIndex = -1;
        if (numRows > 1) {
            // Optimización vía findIndex + map en V8
            const pkColumnData = sheet.getRange(2, pkIndex + 1, numRows - 1, 1).getValues();
            const flatIds = pkColumnData.map(r => String(r[0]));
            const arrayIndex = flatIds.indexOf(String(id));
            if (arrayIndex > -1) {
                foundRowIndex = arrayIndex + 2;
            }
        }

        if (foundRowIndex === -1) {
            throw new Error(`Registro con ID ${id} no encontrado para borrado lógico.`);
        }

        const existingRow = sheet.getRange(foundRowIndex, 1, 1, normalizedHeaders.length).getValues()[0];

        const currentUser = (typeof Session !== 'undefined') ? Session.getActiveUser().getEmail() : 'system@localhost';
        const currentTimestamp = new Date().toISOString();

        const idxEstado = normalizedHeaders.indexOf('estado');
        const idxUpdatedAt = normalizedHeaders.indexOf('updated_at');
        const idxUpdatedBy = normalizedHeaders.indexOf('updated_by');
        const idxDeletedAt = normalizedHeaders.indexOf('deleted_at');
        const idxDeletedBy = normalizedHeaders.indexOf('deleted_by');

        const rowToUpdate = [...existingRow];

        if (idxEstado > -1) rowToUpdate[idxEstado] = 'Eliminado';
        if (idxUpdatedAt > -1) rowToUpdate[idxUpdatedAt] = currentTimestamp;
        if (idxUpdatedBy > -1) rowToUpdate[idxUpdatedBy] = currentUser;
        if (idxDeletedAt > -1) rowToUpdate[idxDeletedAt] = currentTimestamp;
        if (idxDeletedBy > -1) rowToUpdate[idxDeletedBy] = currentUser;

        sheet.getRange(foundRowIndex, 1, 1, rowToUpdate.length).setValues([rowToUpdate]);
        return { status: 'success', action: 'deleted', pk: pkField, val: id };
    },
    _normalizeHeader: _normalizeHeader,

    _ensureSheetExists: function(ss, tableName) {
        let sheet = ss.getSheetByName('DB_' + tableName);
        if (!sheet) {
            sheet = ss.insertSheet('DB_' + tableName);
            Logger.log(`[Auto-Provision] Hoja creada automáticamente: DB_${tableName}`);
        }
        
        // Auto-inyectar headers de esquema si está recién creada
        if (sheet.getLastRow() === 0) {
            let schemaFields = [];
            if (typeof APP_SCHEMAS !== 'undefined' && APP_SCHEMAS[tableName]) {
                if (APP_SCHEMAS[tableName].fields) {
                    schemaFields = APP_SCHEMAS[tableName].fields.map(f => f.name);
                } else {
                    // Fallback para entidades planas (como Dominio o Portafolio)
                    schemaFields = Object.keys(APP_SCHEMAS[tableName]).filter(k => typeof APP_SCHEMAS[tableName][k] === 'object' && !['uiBehavior', 'relationType'].includes(k));
                }
            } else {
                // Fallback primario si no encuentra esquema global (por orden de carga)
                schemaFields = ['id_' + tableName.toLowerCase().replace(/s$/, '')];
            }
            
            // Regla 4 de DB
            const auditFields = ['created_at', 'created_by', 'updated_at', 'updated_by', 'deleted_at', 'deleted_by', '_version'];
            const allHeaders = [...schemaFields, ...auditFields];
            
            sheet.getRange(1, 1, 1, allHeaders.length).setValues([allHeaders]);
            Logger.log(`[Auto-Provision] Encabezados inyectados: ${allHeaders.join(', ')}`);
        }
        
        return sheet;
    },

    /**
     * list(entityName, config, format)
     * Lee todas las filas de DB_<entityName> y las devuelve como un objeto estructurado.
     * @param {string} entityName
     * @param {Object} config
     * @param {string} format 'objects' (defecto) o 'tuples'
     * @returns {{ headers: string[], rows: (Object[]|Array[]) }}
     */
    /**
     * R-01: includeAudit flag — when true, audit columns (created_at etc.) are NOT stripped.
     * Use this in openEditForm to display the Audit Trail badge correctly.
     */
    list: function (entityName, config, format, includeAudit) {
        const spreadsheetId = (config && config.SPREADSHEET_ID_DB)
            ? config.SPREADSHEET_ID_DB
            : CONFIG.SPREADSHEET_ID_DB;

        const ss = SpreadsheetApp.openById(spreadsheetId);
        const sheet = this._ensureSheetExists(ss, entityName);

        // [Regla 11: Performance] - Estándar Inmutable: Traer todo el rango de datos en una sola llamada
        const data = sheet.getDataRange().getValues();
        if (data.length < 1) return { headers: [], rows: [] };

        // 2. Header Caching: Evitar re-procesar Regex si ya se hizo en esta ejecución
        let headers;
        if (__HEADER_CACHE__[entityName]) {
            headers = __HEADER_CACHE__[entityName];
        } else {
            const rawHeaders = data[0];
            headers = rawHeaders.map(_normalizeHeader);
            __HEADER_CACHE__[entityName] = headers;
        }

        // 3. Payload Slimming: Filtrar columnas de auditoría para reducir latencia de red
        // R-01: When includeAudit===true, keep audit columns (needed for edit hydration trail)
        const auditFields = ['created_at', 'created_by', 'updated_at', 'updated_by'];
        const visibleHeaderIndices = [];
        const filteredHeaders = [];

        for (let j = 0; j < headers.length; j++) {
            if (includeAudit || !auditFields.includes(headers[j])) {
                visibleHeaderIndices.push(j);
                filteredHeaders.push(headers[j]);
            }
        }

        // FIX: Early exit for empty sheets must return filteredHeaders (not raw headers)
        // Previously returned unfiltered headers when data.length < 2 (bug exposed by T2 test)
        if (data.length < 2) {
            return { headers: filteredHeaders, rows: [] };
        }


        const rows = [];
        const isTuples = (format === 'tuples');
        
        // [S21.3 Soft-Delete] Identificar índices de banderas de eliminación
        const chkIdxDeletedAt = headers.indexOf('deleted_at');
        const chkIdxEstado = headers.indexOf('estado');

        for (let i = 1; i < data.length; i++) {
            const rowData = data[i];

            // Excluir nodos eliminados globalmente de Cache y UI
            if ((chkIdxDeletedAt > -1 && rowData[chkIdxDeletedAt]) || 
                (chkIdxEstado > -1 && rowData[chkIdxEstado] === 'Eliminado')) {
                continue;
            }

            if (isTuples) {
                const tuple = [];
                for (let k = 0; k < visibleHeaderIndices.length; k++) {
                    const colIdx = visibleHeaderIndices[k];
                    tuple.push(rowData[colIdx] !== undefined ? rowData[colIdx] : '');
                }
                rows.push(tuple);
            } else {
                const rowObj = {};
                for (let k = 0; k < visibleHeaderIndices.length; k++) {
                    const colIdx = visibleHeaderIndices[k];
                    const headerName = filteredHeaders[k];
                    rowObj[headerName] = rowData[colIdx] !== undefined ? rowData[colIdx] : '';
                }
                rows.push(rowObj);
            }
        }

        // Sanitización Obligatoria: Destruir Objetos Date nativos de Rhino/V8
        const sanitizedRows = JSON.parse(JSON.stringify(rows));
        
        return { headers: filteredHeaders, rows: sanitizedRows };
    }
};

if (typeof module !== 'undefined') {
    module.exports = Adapter_Sheets;
}
