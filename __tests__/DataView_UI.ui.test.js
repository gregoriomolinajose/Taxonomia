import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { screen, waitFor } from '@testing-library/dom';
    // Dynamic import to allow window mocks to run before the IIFE executes

describe('DataViewEngine Nativo JSDOM', () => {

    beforeAll(() => {
        // --- 1. Mocks Tácticos (Bridge Simulator) ---
        window.DataAPI = {
            call: vi.fn().mockImplementation((method, entityName) => {
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
        window.Schema_Utils = { getPrimaryKey: () => 'id_item' };
        window.__APP_CACHE__ = {};
        window.DataStore = {
            _cache: window.__APP_CACHE__,
            get: function(entityName) { return this._cache[entityName] || null; },
            getActive: function(entityName) {
                var allData = this.get(entityName);
                if (!allData || !Array.isArray(allData)) return [];
                return allData.filter(function(r) { return r.estado !== 'Eliminado' && r.estado !== 'eliminado'; });
            },
            set: function(entityName, data) { this._cache[entityName] = data; },
            invalidate: function(entityName) { delete this._cache[entityName]; },
            getAll: function() { return this._cache; },
            getNested: function(entityName) {
                if (!this._cache.nestedData) this._cache.nestedData = {};
                return this._cache.nestedData[entityName] || null;
            },
            setNested: function(entityName, data) {
                if (!this._cache.nestedData) this._cache.nestedData = {};
                this._cache.nestedData[entityName] = data;
            },
            clearNested: function() { this._cache.nestedData = {}; }
        };
        
        window.AppEventBus = {
            events: {},
            subscribe: function(event, callback) {
                if (!this.events[event]) this.events[event] = [];
                this.events[event].push(callback);
            },
            publish: function(event, data) {
                if (!this.events[event]) return;
                this.events[event].forEach(cb => cb(data));
            }
        };

        window.DataEngine = {
            applyFilter: vi.fn((data) => data),
            applySort: vi.fn((data) => data)
        };
        window.formatEntityName = (name) => name;
        
        // Abstracciones delegadas que no probamos aquí (Single Responsibility Principal)
        window.UI_DataGrid = { 
            buildLayout: vi.fn().mockImplementation(() => document.createElement('table')),
            _normalizeFields: vi.fn().mockImplementation((entityName) => {
                if (entityName === 'testEntityVirtual') {
                    return [
                        { name: 'id_item', type: 'text', primaryKey: true },
                        { name: 'nombre', type: 'text' },
                        { name: 'separador_1', type: 'divider', width: 12 },
                        { name: 'campo_virtual', type: 'canvas', isVirtual: true }
                    ];
                }
                return null;
            }),
            _labelFromKey: vi.fn().mockImplementation((k) => k)
        };
        window.UI_DataView_Toolbar = { 
            ensureColPopover: vi.fn(), 
            buildToolbarHTML: vi.fn().mockImplementation(() => document.createElement('div')),
            buildHeader: vi.fn().mockImplementation(() => document.createElement('h1'))
        };
        // window.DOM is handled by setup.vitest.js
        window.UI_Router = { showListSidebar: vi.fn() };
    });

    beforeEach(async () => {
        // Reset DOM para cada test
        document.body.innerHTML = '<div id="test-container"></div>';
        // Reset cache
        window.__APP_CACHE__ = {};
        window.DataStore._cache = window.__APP_CACHE__;
        vi.clearAllMocks();

        // La inyección nativa del Módulo DataView_UI debe hacerse después del beforeAll/beforeEach
        if (!window.DataViewEngine) {
            await import('../src/DataView_UI.client.js');
        }
    });

    it('A. Renderiza la estructura core sincrónica (skeleton) previniendo visual glitches', () => {
        window.DataViewEngine.render('testEntity', 'test-container');
        
        expect(document.getElementById('dv-root')).toBeInTheDocument();
        expect(document.getElementById('dv-data-zone')).toBeInTheDocument();
        // Comprueba Delegación al constructor UI puro
        expect(window.UI_DataGrid.buildLayout).toHaveBeenCalledWith({ loading: true });
    });
    
    it('B. Hidrata los datos simulados por RPC descartando inmutablemente el estado Eliminado', async () => {
        window.DataViewEngine.render('testEntity', 'test-container');
        
        await waitFor(() => {
            const state = window.DataViewEngine._getState();
            // Validación Categórica Fuerte: Solo el registro Activo llega a la Vista
            expect(state).toBeDefined();
            expect(state.data).toBeDefined();
            expect(state.data.length).toBe(1);
        }, { timeout: 2000, interval: 20 });
        
        const finalState = window.DataViewEngine._getState();
        expect(finalState.data[0].nombre).toBe('Portafolio Principal');
        
        // Validación Architectural RAM Directiva 1: Pre-cache persistido global
        expect(window.DataStore.get('testEntity')).toBeDefined();
        // En el cache viven los dos, DataView los filtró en runtime para .data
        expect(window.DataStore.get('testEntity').length).toBe(2); 

        expect(window.UI_Router.showListSidebar).toHaveBeenCalledWith('testEntity');
    });

    it('C. Filtra dinámicamente campos estéticos y virtuales del esquema para no renderizarlos como columnas', async () => {
        window.DataViewEngine.render('testEntityVirtual', 'test-container');
        
        await waitFor(() => {
            const state = window.DataViewEngine._getState();
            expect(state).toBeDefined();
            expect(state.columns).toBeDefined();
            expect(state.columns.length).toBeGreaterThan(0);
        }, { timeout: 2000, interval: 20 });
        
        const finalState = window.DataViewEngine._getState();
        const generatedKeys = finalState.columns.map(c => c.key);
        
        // Debe contener campos válidos de la data (id_item, nombre, estado)
        expect(generatedKeys).toContain('id_item');
        expect(generatedKeys).toContain('nombre');
        
        expect(generatedKeys).not.toContain('campo_virtual');
    });

    it('D. Reacciona a la mutación de datos global vía DATA::UPDATED asegurando la reactividad en UI', async () => {
        // Render Inicial
        window.DataViewEngine.render('testEntity', 'test-container');
        
        // Esperemos a que lleguen los datos originales del RPC
        await waitFor(() => {
            const state = window.DataViewEngine._getState();
            expect(state).toBeDefined();
            expect(state.data).toBeDefined();
            expect(state.data.length).toBeGreaterThan(0);
        });

        // Forzar inyección explícita
        const newRow = { id_item: 'ITM-99', nombre: 'Portafolio Reactivo', estado: 'Activo' };
        const oldRow = { id_item: 'ITM-1', nombre: 'Portafolio Principal', estado: 'Activo' };
        window.DataStore.set('testEntity', [newRow, oldRow]);
        
        // Simular que AppEventBus dispara globalmente la mutación
        window.AppEventBus.publish('DATA::UPDATED', { entityKey: 'testEntity' });
        
        // Verificar que el DataView Engine asimiló el cambio automáticamente
        await waitFor(() => {
            const updatedState = window.DataViewEngine._getState();
            expect(updatedState.data).toBeDefined();
            expect(updatedState.data.length).toBe(2);
        });
        
        const updatedState = window.DataViewEngine._getState();
        expect(updatedState.data.find(r => r.nombre === 'Portafolio Reactivo')).toBeDefined();
        
        // Comprobar que no impacta si sucede en otra entidad asíncrona
        window.AppEventBus.publish('DATA::UPDATED', { entityKey: 'otraEntidadZ' });
        expect(window.DataViewEngine._getState().data.length).toBe(2); // No debe volver a cambiar
    });

});
