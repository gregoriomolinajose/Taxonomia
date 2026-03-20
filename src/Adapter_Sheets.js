// src/Adapter_Sheets.js

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
        // 1. Determinar Llave Primaria por convención: id_<tableName> (case-insensitive)
        //    Evita tomar una FK (ej. id_grupo_producto) como PK cuando hay múltiples campos id_*
        const expectedPK = 'id_' + tableName.toLowerCase();
        const primaryKeyField = payload.hasOwnProperty(expectedPK)
            ? expectedPK
            : Object.keys(payload).find(key => key.startsWith('id_'));

        if (!primaryKeyField || !payload[primaryKeyField]) {
            throw new Error(`Primary Key requerida para operar el Upsert. Se esperaba '${expectedPK}' pero no se encontró en el payload.`);
        }


        const primaryKeyValue = payload[primaryKeyField];

        // 2. Conectar a SpreadsheetApp (solo en entorno GAS)
        if (typeof SpreadsheetApp === 'undefined') {
            // Entorno de pruebas (Jest)
            return { status: 'success', action: 'mocked_upsert', pk: primaryKeyField, val: primaryKeyValue };
        }

        const spreadsheetId = config ? config.SPREADSHEET_ID_DB : CONFIG.SPREADSHEET_ID_DB;
        Logger.log("Adapter_Sheets.upsert: Usando SPREADSHEET_ID_DB = " + spreadsheetId);

        const ss = SpreadsheetApp.openById(spreadsheetId);
        Logger.log("Adapter_Sheets.upsert: Buscando pestaña... DB_" + tableName);
        let sheet = ss.getSheetByName('DB_' + tableName);

        if (!sheet) {
            sheet = ss.insertSheet('DB_' + tableName);
            throw new Error(`La hoja DB_${tableName} no existe. Por favor créala con las columnas correspondientes.`);
        }

        // 3. Leer Encabezados
        const headersRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
        const headers = headersRange.getValues()[0];

        // Mapear encabezados usando underscore para comparar con el payload
        const normalizedHeaders = headers.map(h => _normalizeHeader(h));
        Logger.log("Adapter_Sheets.upsert: Encabezados encontrados (normalizados): " + JSON.stringify(normalizedHeaders));

        // 4. Construir Array de Fila
        const rowToInsert = [];
        for (let i = 0; i < normalizedHeaders.length; i++) {
            const h = normalizedHeaders[i];
            rowToInsert.push(payload.hasOwnProperty(h) ? payload[h] : '');
        }

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
                if (pkColumnData[r][0] == primaryKeyValue) {
                    foundRowIndex = r + 2; // +2 porque el índice de la fila empieza en 1, y nos saltamos el header (fila 1)
                    break;
                }
            }
        }

        if (foundRowIndex > -1) {
            // Actualizar (Update)
            Logger.log(`Adapter_Sheets.upsert: ¿Se encontró el ID?: Sí. Fila: ${foundRowIndex}`);
            sheet.getRange(foundRowIndex, 1, 1, rowToInsert.length).setValues([rowToInsert]);
            return { status: 'success', action: 'updated', pk: primaryKeyField, val: primaryKeyValue };
        } else {
            // Insertar (Create)
            Logger.log("Adapter_Sheets.upsert: ¿Se encontró el ID?: No. Realizando appendRow...");
            sheet.appendRow(rowToInsert);
            return { status: 'success', action: 'created', pk: primaryKeyField, val: primaryKeyValue };
        }
    },
    _normalizeHeader: _normalizeHeader
};

if (typeof module !== 'undefined') {
    module.exports = Adapter_Sheets;
}
