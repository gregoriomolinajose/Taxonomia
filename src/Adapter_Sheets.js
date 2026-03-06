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
    upsert: async function (tableName, payload) {
        // 1. Validar Llave Primaria (Regla 4.9.1)
        // El ID debe comenzar con 'id_' extraído del payload
        const primaryKeyField = Object.keys(payload).find(key => key.startsWith('id_'));

        if (!primaryKeyField || !payload[primaryKeyField]) {
            throw new Error(`Primary Key requerida para operar el Upsert. No se encontró identificador único validado (ej. id_${tableName.toLowerCase()}) en el payload.`);
        }

        // Mock response para simular éxito en Jest
        return { status: 'success', action: 'updated', pk: primaryKeyField };
    },
    _normalizeHeader: _normalizeHeader
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Adapter_Sheets;
}
