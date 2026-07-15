const { ETLEngine } = require('../../src/core/ETLEngine');
const { MockDataProvider } = require('../../src/adapters/MockDataProvider');

describe('ETLEngine', () => {
    beforeEach(() => {
        global.APP_SCHEMAS = {
            'Dominio': {
                etlHooks: {
                    onRowTransform: (row) => {
                        if (row['viejo_nombre']) {
                            row['nuevo_nombre'] = row['viejo_nombre'];
                            delete row['viejo_nombre'];
                        }
                        return row;
                    }
                }
            }
        };
    });

    afterEach(() => {
        delete global.APP_SCHEMAS;
    });

    it('should extract data using provider', () => {
        const mockProvider = new MockDataProvider({
            'Sheet1': [{ id: 1, name: 'Alice' }]
        });
        const engine = new ETLEngine(mockProvider);
        expect(engine.extractData('Sheet1')).toEqual([{ id: 1, name: 'Alice' }]);
    });

    it('should apply onRowTransform hook if available', () => {
        const mockProvider = new MockDataProvider({
            'Dominio': [{ id: 1, viejo_nombre: 'Test' }]
        });
        const engine = new ETLEngine(mockProvider);
        expect(engine.extractData('Dominio')).toEqual([{ id: 1, nuevo_nombre: 'Test' }]);
    });

    it('should export data using provider', () => {
        const mockProvider = new MockDataProvider({ 'Sheet1': [] });
        const engine = new ETLEngine(mockProvider);
        engine.exportData('Sheet1', [{ id: 2, name: 'Bob' }]);
        expect(mockProvider.read('Sheet1')).toEqual([{ id: 2, name: 'Bob' }]);
    });
});
