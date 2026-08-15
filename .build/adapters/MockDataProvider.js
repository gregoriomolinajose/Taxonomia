class MockDataProvider {
    constructor(initialData = {}) {
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
