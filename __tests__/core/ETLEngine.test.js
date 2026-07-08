const { ETLEngine } = require('../../src/core/ETLEngine');
const { MockDataProvider } = require('../../src/adapters/MockDataProvider');

describe('ETLEngine', () => {
    it('should extract data using provider', () => {
        const mockProvider = new MockDataProvider({
            'Sheet1': [{ id: 1, name: 'Alice' }]
        });
        const engine = new ETLEngine(mockProvider);
        expect(engine.extractData('Sheet1')).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('should export data using provider', () => {
        const mockProvider = new MockDataProvider({ 'Sheet1': [] });
        const engine = new ETLEngine(mockProvider);
        engine.exportData('Sheet1', [{ id: 2, name: 'Bob' }]);
        expect(mockProvider.read('Sheet1')).toEqual([{ id: 2, name: 'Bob' }]);
    });
});
