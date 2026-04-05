/**
 * @jest-environment jsdom
 */

// Importaciones estándar y matchers puros
require('@testing-library/jest-dom');
const { screen } = require('@testing-library/dom');

describe('DataViewEngine Nativo JSDOM', () => {

    beforeAll(() => {
        // --- 1. Mocks Tácticos (Bridge Simulator) ---
        window.DataAPI = {
            call: jest.fn().mockImplementation((method, entityName) => {
                if (method === 'getInitialPayload') {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve({
                                status: 'success',
                                lookups: {},
                                data: {
                                    headers: ['id_item', 'nombre', 'estado'],
                                    rows: [['ITM-1', 'Portafolio Principal', 'Activo'], ['ITM-2', 'Capacidad Basura', 'Eliminado']]
                                }
                            });
                        }, 20); // Network delay mock
                    });
                }
                return Promise.reject(new Error('Mock Not implemented'));
            })
        };

        // --- 2. Dependencias del Ecosistema de Taxonomia (Global Scope Mocks) ---
        window.ENTITY_META = { testEntity: { label: 'Entidad QA', idField: 'id_item' } };
        window.__APP_CACHE__ = {};
        window.formatEntityName = (name) => name;
        
        // Abstracciones delegadas que no probamos aquí (Single Responsibility Principal)
        window.UI_DataGrid = { buildLayout: jest.fn().mockImplementation(() => document.createElement('table')) };
        window.UI_DataView_Toolbar = { 
            ensureColPopover: jest.fn(), 
            buildToolbarHTML: jest.fn().mockImplementation(() => document.createElement('div')),
            buildHeader: jest.fn().mockImplementation(() => document.createElement('h1'))
        };
        window.DOM = { clear: (node) => { node.innerHTML = ''; } };
        window.UI_Router = { showListSidebar: jest.fn() };
    });

    // --- 3. INYECCIÓN NATIVA SIN HTML PARSING (Magia Creada por Option 1) ---
    require('../src/DataView_UI.client.js');

    beforeEach(() => {
        // Reset DOM para cada test
        document.body.innerHTML = '<div id="test-container"></div>';
        // Reset cache
        window.__APP_CACHE__ = {};
        jest.clearAllMocks();
    });

    it('A. Renderiza la estructura core sincrónica (skeleton) previniendo visual glitches', () => {
        window.DataViewEngine.render('testEntity', 'test-container');
        
        expect(document.getElementById('dv-root')).toBeInTheDocument();
        expect(document.getElementById('dv-data-zone')).toBeInTheDocument();
        // Comprueba Delegación al constructor UI puro
        expect(window.UI_DataGrid.buildLayout).toHaveBeenCalledWith({ loading: true });
    });
    
    it('B. Hidrata los datos simulados por RPC descartando inmutablemente el estado Eliminado', (done) => {
        window.DataViewEngine.render('testEntity', 'test-container');
        
        // Esperar resolución asíncrona RPC nativa
        setTimeout(() => {
            const state = window.DataViewEngine._getState();
            
            // Validación Categórica Fuerte: Solo el registro Activo llega a la Vista
            expect(state.data.length).toBe(1);
            expect(state.data[0].nombre).toBe('Portafolio Principal');
            
            // Validación Architectural RAM Directiva 1: Pre-cache persistido global
            expect(window.__APP_CACHE__['testEntity']).toBeDefined();
            // En el cache viven los dos, DataView los filtró en runtime para .data
            expect(window.__APP_CACHE__['testEntity'].length).toBe(2); 

            expect(window.UI_Router.showListSidebar).toHaveBeenCalledWith('testEntity');
            
            done();
        }, 50);
    });

});
