import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { waitFor } from '@testing-library/dom';
import '../src/UI_FormSubmitter.client.js';

describe('UI_FormSubmitter (Dependency Injection Architecture)', () => {
    let mockApiService;
    let mockBtn;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app-container"></div>';

        // Setup Dependency Injection Mock
        mockApiService = {
            call: vi.fn().mockResolvedValue({ status: 'success' })
        };

        // Setup DOM Mock Environment
        mockBtn = document.createElement('button');
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('A. Debe inyectar correctamente apiService sin depender de window.DataAPI (DI compliance)', () => {
        const submitter = new window.UI_FormSubmitter('Test_Entity', [], mockBtn, mockApiService);
        
        // Assertions: Validation of strict DI bounds
        expect(submitter.apiService).toBe(mockApiService);
        expect(submitter.apiService).not.toBe(window.DataAPI);
        expect(submitter.submitBtn).toBe(mockBtn);
    });

    it('B. La clase FormSubmitter debe exponer el apiService inyectado asegurando 100% testabilidad', () => {
        const submitter = new window.UI_FormSubmitter('Test_Entity', [], mockBtn, mockApiService);
        expect(typeof submitter.apiService.call).toBe('function');
    });

    it('C. Debe invocar el apiService.call tras click sin usar hardcoded timeouts (Testing waitFor)', async () => {
        // Configuramos el DOM requerido nativamente por submitter
        const mockModal = document.createElement('div');
        
        const testInput = document.createElement('ion-input');
        testInput.setAttribute('name', 'testField');
        testInput.value = 'Alpha';
        
        const idInput = document.createElement('input');
        idInput.type = 'hidden';
        idInput.setAttribute('name', 'id');
        idInput.value = 'uuid-123';
        
        mockModal.appendChild(testInput);
        mockModal.appendChild(idInput);
        document.getElementById('app-container').appendChild(mockModal);
        
        // Mock Dependencias Globales invocadas en flujo on-click
        window.UI_Validators = {
            validateRequiredFields: vi.fn().mockReturnValue(true),
            validateMaxCharacters: vi.fn().mockReturnValue(true),
            validateNumberLimits: vi.fn().mockReturnValue(true)
        };
        
        window.UI_Components = {
            presentToast: vi.fn(),
            showLoading: vi.fn(),
            hideLoading: vi.fn()
        };
        
        window.PresentSafe = vi.fn().mockResolvedValue();
        window.AppEventBus = { publish: vi.fn() };
        window.DOM = {
            clear: vi.fn(),
            create: vi.fn().mockImplementation((tag) => document.createElement(tag))
        };

        document.createElementOrig = document.createElement.bind(document);
        document.createElement = (tag) => {
            const el = document.createElementOrig(tag);
            if (tag === 'ion-loading') el.dismiss = vi.fn().mockResolvedValue();
            return el;
        };

        const submitter = new window.UI_FormSubmitter('Test_Entity', [], mockBtn, mockApiService);
        
        // Simular evento
        mockBtn.click();
        
        // Uso de waitFor recomendado en lugar de 'await new Promise'
        await waitFor(() => {
            expect(mockApiService.call).toHaveBeenCalledWith(
                'API_Universal_Router', 
                'create', 
                'Test_Entity', 
                { id: 'uuid-123', testField: 'Alpha' }
            );
        }, { timeout: 1000 });

        // Limpiar mock nativo
        document.createElement = document.createElementOrig;
    });
});
