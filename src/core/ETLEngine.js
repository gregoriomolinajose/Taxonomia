class ETLEngine {
    /**
     * @param {import('./IDataProvider').IDataProvider} provider 
     */
    constructor(provider) {
        this.provider = provider;
    }

    /**
     * @param {string} entityName 
     */
    extractData(entityName) {
        let rawRecords = this.provider.read(entityName);
        
        // Invoke metadata hooks if defined
        if (typeof APP_SCHEMAS !== 'undefined') {
            const schema = APP_SCHEMAS[entityName];
            if (schema && schema.etlHooks && typeof schema.etlHooks.onRowTransform === 'function') {
                rawRecords = rawRecords.map(row => schema.etlHooks.onRowTransform(row));
            }
        }
        
        return rawRecords;
    }

    /**
     * @param {string} entityName 
     * @param {Array<Record<string, any>>} records 
     */
    exportData(entityName, records) {
        this.provider.write(entityName, records);
    }
}

if (typeof module !== 'undefined') module.exports = { ETLEngine };
