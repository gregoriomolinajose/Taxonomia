let IDataProviderRef;
if (typeof IDataProvider !== 'undefined') {
    IDataProviderRef = IDataProvider;
} else if (typeof require !== 'undefined') {
    IDataProviderRef = require('../core/IDataProvider').IDataProvider;
}

class MockDataProvider extends IDataProviderRef {
    constructor(initialData = {}) {
        super();
        this.data = initialData;
    }

    read(entityName) {
        if (!this.data[entityName]) {
            throw new Error(`Entity '${entityName}' not found.`);
        }
        return this.data[entityName];
    }

    write(entityName, records) {
        if (!this.data[entityName]) {
            throw new Error(`Entity '${entityName}' not found.`);
        }
        this.data[entityName] = records;
    }
}

if (typeof module !== 'undefined') module.exports = { MockDataProvider };
