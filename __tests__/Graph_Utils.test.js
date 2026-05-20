const fs = require('fs');
const path = require('path');

describe('Graph_Utils Client traversal direction-specific lookups', () => {
    let Graph_Utils;

    beforeAll(() => {
        // Mock global window and DataStore correctly
        global.window = global;
        global.DataStore = {
            _data: {},
            get(entity) {
                return this._data[entity] || [];
            },
            set(entity, data) {
                this._data[entity] = data;
            }
        };

        const codePath = path.resolve(__dirname, '../src/JS_GraphUtils.client.js');
        const code = fs.readFileSync(codePath, 'utf8');
        eval(code);
        Graph_Utils = global.window.Graph_Utils;
    });

    afterAll(() => {
        delete global.window;
        delete global.DataStore;
    });

    test('should resolve parent correctly and NOT as a child', () => {
        // Setup self-referencing DOMINIO_HIJO relationship:
        // DOM-1 (padre) -> DOM-2 (hijo)
        const edges = [
            {
                id_nodo_padre: 'DOM-1',
                id_nodo_hijo: 'DOM-2',
                tipo_relacion: 'DOMINIO_HIJO',
                es_version_actual: true,
                estado: 'Activo'
            }
        ];
        global.DataStore.set('Sys_Graph_Edges', edges);
        Graph_Utils.invalidateIndex();

        // If we query DOM-2 (hijo) asking for its parent (padre), it should return DOM-1
        expect(Graph_Utils.resolveLinkedId('DOM-2', 'DOMINIO_HIJO', null, false, 'padre')).toBe('DOM-1');
        // If we query DOM-2 (hijo) asking for its children (hijo), it should return null
        expect(Graph_Utils.resolveLinkedId('DOM-2', 'DOMINIO_HIJO', null, false, 'hijo')).toBeNull();

        // If we query DOM-1 (padre) asking for its children (hijo), it should return DOM-2
        expect(Graph_Utils.resolveLinkedId('DOM-1', 'DOMINIO_HIJO', null, false, 'hijo')).toBe('DOM-2');
        // If we query DOM-1 (padre) asking for its parent (padre), it should return null
        expect(Graph_Utils.resolveLinkedId('DOM-1', 'DOMINIO_HIJO', null, false, 'padre')).toBeNull();
    });

    test('resolveAllLinkedIds should filter by direction correctly', () => {
        // Setup self-referencing DOMINIO_HIJO relationship:
        // DOM-1 (padre) -> DOM-2 (hijo)
        const edges = [
            {
                id_nodo_padre: 'DOM-1',
                id_nodo_hijo: 'DOM-2',
                tipo_relacion: 'DOMINIO_HIJO',
                es_version_actual: true,
                estado: 'Activo'
            }
        ];
        global.DataStore.set('Sys_Graph_Edges', edges);
        Graph_Utils.invalidateIndex();

        expect(Graph_Utils.resolveAllLinkedIds('DOM-2', 'DOMINIO_HIJO', null, false, 'padre')).toEqual(['DOM-1']);
        expect(Graph_Utils.resolveAllLinkedIds('DOM-2', 'DOMINIO_HIJO', null, false, 'hijo')).toEqual([]);
    });
});
