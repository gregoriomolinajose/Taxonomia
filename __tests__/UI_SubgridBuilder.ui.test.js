import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/dom';
import '@testing-library/jest-dom';

import './utils/setup.vitest.js'; // Polyfills Base DOM
import '../src/JS_Core.client.js';
import '../src/SubgridState.client.js'; // Needed by Builder
import '../src/UI_SubgridBuilder.client.js';

describe('UI_SubgridBuilder.client.js (Vitest UI) - S30.2 ReadOnly Scenarios', () => {
    let container;
    let mockField;
    let mockData;
    let mockEventBus;

    beforeAll(() => {
        // Mock Window dependencies
        window.APP_SCHEMAS = {
            'Padre_Entity': {
                idField: 'id_padre'
            },
            'Hijo_Entity': {
                idField: 'id_hijo'
            }
        };
        window.DataStore = { get: vi.fn().mockReturnValue([]) };
        window.UI_FormUtils = { normalizeId: (id) => String(id) };
        window.openEditForm = vi.fn();
    });

    beforeEach(() => {
        document.body.innerHTML = '';
        container = document.createElement('div');
        document.body.appendChild(container);

        mockField = {
            name: 'hijos_relacionados',
            label: 'Hijos Relacionados',
            type: 'relation',
            targetEntity: 'Hijo_Entity',
            relationType: 'hijo'
        };

        mockData = {
            id_padre: 'P-1',
            hijos_relacionados: [
                { id_hijo: 'H-1', nombre: 'Hijo 1', estado: 'Activo' },
                { id_hijo: 'H-2', nombre: 'Hijo 2', estado: 'Activo' }
            ]
        };

        mockEventBus = { subscribe: vi.fn(), publish: vi.fn() };
        
        // Reset call count between tests
        window.openEditForm.mockClear();
    });

    it('A. Modo Escritura (readonly: false): Renderiza el botón Agregar y los botones de Eliminar', async () => {
        // Config readonly: false explícito (comportamiento por defecto)
        await window.UI_SubgridBuilder.build(
            mockField, 
            container, 
            mockData, 
            'Padre_Entity', 
            mockEventBus, 
            null, 
            { readonly: false }
        );

        // Debe existir el botón Agregar en el Header
        const addBtn = container.querySelector('ion-button');
        expect(addBtn).toBeInTheDocument();
        expect(addBtn.textContent).toContain('Agregar');

        // Deben existir 2 botones de Eliminar (Papelera) porque hay 2 hijos
        const delBtns = container.querySelectorAll('ion-button[color="danger"]');
        expect(delBtns).toHaveLength(2);
    });

    it('B. Modo Lectura (readonly: true): Omite estructuralmente inyectar botones destructivos al DOM', async () => {
        // Config readonly: true inyectado vía Prop-Drilling (S30.2)
        await window.UI_SubgridBuilder.build(
            mockField, 
            container, 
            mockData, 
            'Padre_Entity', 
            mockEventBus, 
            null, 
            { readonly: true }
        );

        // NO debe existir el botón Agregar en absoluto (Zero DOM footprint)
        const addBtnRawText = container.textContent;
        // The text content should not contain "Agregar" since the button is not appended.
        expect(addBtnRawText).not.toContain('Agregar');
        
        // Ensure no clear buttons for Add exist
        const addBtns = container.querySelectorAll('ion-button[fill="clear"]:not([color="danger"])');
        expect(addBtns).toHaveLength(0);

        // NO debe existir ningún botón de Eliminar (Papelera) aunque existan filas (Zero DOM footprint)
        const delBtns = container.querySelectorAll('ion-button[color="danger"]');
        expect(delBtns).toHaveLength(0);
        
        // Las filas de los hijos SÍ deben estar renderizadas
        expect(addBtnRawText).toContain('Hijo 1');
        expect(addBtnRawText).toContain('Hijo 2');
    });

    it('C. S30.6 Drill-Down Click Navigation: Dispara openEditForm al hacer click en la fila', async () => {
        await window.UI_SubgridBuilder.build(
            mockField, 
            container, 
            mockData, 
            'Padre_Entity', 
            mockEventBus, 
            null, 
            { readonly: true }
        );

        const items = container.querySelectorAll('ion-item');
        expect(items.length).toBeGreaterThan(0);

        // Disparamos evento nativo usando TestingLibrary
        fireEvent.click(items[0]);

        // Assertion de que la navegación delegada profunda fue invocada
        expect(window.openEditForm).toHaveBeenCalledTimes(1);
        expect(window.openEditForm).toHaveBeenCalledWith('H-1', 'Hijo_Entity');
    });
});
