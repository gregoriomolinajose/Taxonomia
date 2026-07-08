const { MockDataProvider } = require('../../src/adapters/MockDataProvider');

describe('MockDataProvider', () => {
    it('should read data correctly', () => {
        const provider = new MockDataProvider({
            'Sheet1': [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
        });
        const data = provider.read('Sheet1');
        expect(data).toEqual([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
    });

    it('should write data correctly', () => {
        const provider = new MockDataProvider({ 'Sheet1': [] });
        provider.write('Sheet1', [{ id: 3, name: 'Charlie' }]);
        expect(provider.read('Sheet1')).toEqual([{ id: 3, name: 'Charlie' }]);
    });

    it('should throw error for non-existent entity on read', () => {
        const provider = new MockDataProvider();
        expect(() => provider.read('Missing')).toThrow(`Entity 'Missing' not found.`);
    });

    it('should throw error for non-existent entity on write', () => {
        const provider = new MockDataProvider();
        expect(() => provider.write('Missing', [])).toThrow(`Entity 'Missing' not found.`);
    });
});
