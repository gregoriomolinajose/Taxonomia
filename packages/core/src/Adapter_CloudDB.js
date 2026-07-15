// src/Adapter_CloudDB.js
// Stub para permitir que las pruebas de Jest se importen en TDD

const Adapter_CloudDB = {
    upsert: async function (tableName, payload) {
        return { status: 'mock' };
    }
};

if (typeof module !== 'undefined') {
    module.exports = Adapter_CloudDB;
}
