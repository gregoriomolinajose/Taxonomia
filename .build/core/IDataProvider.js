/**
 * @interface IDataProvider
 */
class IDataProvider {
    /**
     * @param {string} entityName
     * @returns {Array<Record<string, any>>}
     */
    read(entityName) {
        throw new Error("Method 'read()' must be implemented.");
    }
    
    /**
     * @param {string} entityName
     * @param {Array<Record<string, any>>} records
     * @returns {void}
     */
    write(entityName, records) {
        throw new Error("Method 'write()' must be implemented.");
    }
}

if (typeof module !== 'undefined') module.exports = { IDataProvider };
