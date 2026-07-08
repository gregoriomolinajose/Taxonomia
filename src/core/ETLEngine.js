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
        return this.provider.read(entityName);
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
