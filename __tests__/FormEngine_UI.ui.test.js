import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/dom';
import '@testing-library/jest-dom';

// Import Fixtures and Globals
import { injectAppSchemasMock, populateAppCache, createBasicMockSchema } from './utils/mockFactory.js';
import './utils/setup.vitest.js'; // Polyfills Base DOM

// Import Source Code directly (Since we extracted them to .client.js)
import '../src/JS_Core.client.js';
import '../src/FormValidators.client.js';
import '../src/FormRenderer_UI.client.js';

describe('FormEngine UI Nativo Browser (Vitest SPA)', () => {
    beforeAll(() => {
        // Mock AppEventBus if JS_Core hasn't fully booted due to DOMContentLoaded
        if (!window.AppEventBus) {
            window.AppEventBus = { subscribe: vi.fn(), publish: vi.fn() };
        }
        
        // Mock Ionic UI Components required by FormEngine
        window.ModalStackController = {
            push: vi.fn().mockReturnValue(true),
            getDepth: vi.fn().mockReturnValue(0),
            closeTop: vi.fn()
        };
        
        window.PresentSafe = vi.fn().mockResolvedValue();
        
        // Polyfill para formatEntityName si no existe
        window.formatEntityName = window.formatEntityName || ((str) => str.replace(/_/g, ' '));
        window.UI_Factory = {
            buildFieldNode: (field) => {
                const input = document.createElement(`ion-${field.type === 'textarea' ? 'textarea' : 'input'}`);
                input.setAttribute('name', field.name);
                input.setAttribute('data-testid', `input-${field.name}`);
                if (field.required) input.setAttribute('required', 'true');
                return input;
            }
        };

        window.UI_FormStepper = class {
            constructor(config) { 
                this.row = document.createElement('div');
                config.cardContent.appendChild(this.row); // FIX: Añadir al árbol DOM
                this.rows = { 'Datos Generales': this.row }; 
            }
            getRows() { return this.rows; }
            start() {}
        };

        window.UI_FormSubmitter = class { constructor() {} };
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="app-container"></div>
            <div id="sidebarList"></div>
            <div id="form-steps-container"></div>
            <h1 id="main-header-title"></h1>
        `; // Reset visual DOM
        
        // Generate Mock Schema for testing
        const schema = createBasicMockSchema('Test_Entity', [
            { name: 'nombre', type: 'text', required: true, width: 6, section: 'Datos Generales' },
            { name: 'oculto_id', type: 'hidden' },
            { name: 'monto', type: 'number', required: false, width: 6, section: 'Datos Generales' }
        ]);

        injectAppSchemasMock(schema);
        populateAppCache('Test_Entity', [{ id: '1', nombre: 'Alpha', monto: 500 }]);
    });

    it('A. Renderiza Formulario "Nuevo" (Modo Create) con schema básico y no crashea', async () => {
        await window.renderForm('Test_Entity');
        
        // Assertions natively evaluated in Chromium
        const modal = document.querySelector('ion-modal');
        expect(modal).not.toBeNull();
        
        // Verificar presencia del Input Visible
        const inputNombre = modal.querySelector('ion-input[name="nombre"]');
        expect(inputNombre).toBeInTheDocument();
        
        // Verificar presencia del Campo Hidden en DOM Persistente
        const hiddenField = modal.querySelector('input[type="hidden"][name="oculto_id"]');
        expect(hiddenField).toBeInTheDocument();
    });

    it('B. Valida que FormValidators reaccione a campos required (UI_Validators)', async () => {
        await window.renderForm('Test_Entity');
        const modal = document.querySelector('ion-modal');
        
        // Simulate missing requirement trigger
        const inputNombre = modal.querySelector('ion-input[name="nombre"]');
        
        // Usar lógica nativa del archivo aislado
        const isValid = window.UI_Validators.validateRequiredFields(modal);
        
        expect(isValid).toBe(false);
        expect(inputNombre).toHaveClass('ion-invalid');
        expect(inputNombre).toHaveClass('ion-touched');
    });
});
