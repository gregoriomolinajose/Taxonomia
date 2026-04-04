/**
 * @jest-environment jsdom
 */

require('@testing-library/jest-dom');
const { screen } = require('@testing-library/dom');

describe('DataGrid Integration JSDOM (S24.8)', () => {

    beforeAll(() => {
        window.DataAPI = {
            call: jest.fn().mockImplementation((method, entityName) => {
                if (method === 'getInitialPayload') {
                    return Promise.resolve({
                        status: 'success',
                        lookups: {},
                        data: {
                            headers: ['id_item', 'nombre', 'estado', 'created_at'],
                            rows: [['ITM-1', 'Portafolio Principal', 'Activo', '2026-04-03']]
                        }
                    });
                }
                return Promise.reject(new Error('Mock Not implemented'));
            })
        };

        window.ENTITY_META = { testEntity: { label: 'Entidad QA', idField: 'id_item', titleField: 'nombre' } };
        window.__APP_CACHE__ = {};
        window.formatEntityName = (name) => name;
        
        // Mocks Parciales (Solo Toolbar y Router, DataGrid es REAL)
        window.UI_DataView_Toolbar = { 
            ensureColPopover: jest.fn(), 
            buildToolbarHTML: jest.fn().mockImplementation(() => document.createElement('div')),
            buildHeader: jest.fn().mockImplementation(() => document.createElement('h1'))
        };
        window.DOM = { 
            clear: (node) => { node.innerHTML = ''; },
            create: (tag, attrs, content) => {
                const el = document.createElement(tag);
                if (attrs) {
                    for (let k in attrs) {
                        if (k !== 'class') {
                            el.setAttribute(k, attrs[k]);
                        }
                    }
                    if (attrs.class) el.className = attrs.class;
                }
                if (Array.isArray(content)) content.forEach(c => {
                    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
                    else if (c instanceof Node) el.appendChild(c);
                });
                else if (typeof content === 'string') el.textContent = content;
                else if (content instanceof Node) el.appendChild(content);
                return el;
            }
        };
        window.UI_Router = { showListSidebar: jest.fn() };
    });

    // --- CARGA DE LA FACTORÍA REAL ---
    require('../src/UI_DataGrid.client.js');
    // --- CARGA DEL ORQUESTADOR REAL ---
    require('../src/DataView_UI.client.js');

    beforeEach(() => {
        document.body.innerHTML = '<div id="test-container"></div>';
        window.__APP_CACHE__ = {};
        jest.clearAllMocks();
    });

    it('A. Renderiza vista Grid (Tarjetas) procesando this.cfg.columns dinamicamente sin crashear', async () => {
        // Ejecución
        window.DataViewEngine.render('testEntity', 'test-container');
        
        // Simular que el usuario cambia a vista 'grid'
        await new Promise(resolve => setTimeout(resolve, 50)); // Wait for RPC payload
        
        // Inyectar forzosamente la vista grid a nivel estado (para forzar render de tarjetas)
        const state = window.DataViewEngine._getState();
        state.view = 'grid';
        
        expect(state.data).toBeDefined();
        expect(state.data.length).toBe(1);
        
        // Re-render
        const zone = document.getElementById('dv-data-zone');
        window.DOM.clear(zone);
        
        // LLamada Real a la factory:
        const layout = window.UI_DataGrid.buildLayout({
            view: 'grid',
            columns: state.columns,
            data: state.data,
            filteredData: state.data,
            entityName: 'testEntity',
            loading: false,
            page: 1,
            pageSize: 10
        });
        
        zone.appendChild(layout);

        const cards = zone.querySelectorAll('ion-card');
        expect(cards.length).toBe(1); // Hay 1 registro activo
        
        const cardKeys = Array.from(zone.querySelectorAll('.dv-card-item-attr-key')).map(n => n.textContent);
        
        // ID es título (omitido), y created_at está oculto por defecto (no visible en state.columns).
        // Así que solo debería imprimir 'estado'.
        expect(cardKeys.includes('Estado')).toBe(true);
        expect(cardKeys.includes('Created at')).toBe(false); // Oculto por _buildColumns SSOT
    });
});
