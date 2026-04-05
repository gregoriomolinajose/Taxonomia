import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/dom';

// --- CARGA DE LA FACTORÍA Y ORQUESTADOR ---
import '../src/UI_DataGrid.client.js';
import '../src/DataView_UI.client.js';

describe('DataGrid Integration Browser (Vitest S24.8)', () => {

    beforeAll(() => {
        window.DataAPI = {
            call: vi.fn().mockImplementation((method, entityName) => {
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
        
        window.UI_DataView_Toolbar = { 
            ensureColPopover: vi.fn(), 
            buildToolbarHTML: vi.fn().mockImplementation(() => document.createElement('div')),
            buildHeader: vi.fn().mockImplementation(() => document.createElement('h1'))
        };
        
        window.UI_Router = { showListSidebar: vi.fn() };
    });

    beforeEach(() => {
        document.body.innerHTML = '<div id="test-container"></div>';
        window.__APP_CACHE__ = {};
        vi.clearAllMocks();
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
        
        expect(cardKeys.includes('Estado')).toBe(true);
        expect(cardKeys.includes('Created at')).toBe(false); // Oculto por _buildColumns SSOT
    });
});
