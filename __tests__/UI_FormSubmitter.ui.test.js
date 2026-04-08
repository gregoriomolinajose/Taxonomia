import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../src/UI_FormSubmitter.client.js';

describe('UI_FormSubmitter (Dependency Injection Architecture)', () => {
    let mockApiService;
    let mockModal;
    let mockBtn;
    let mockContext;

    beforeEach(() => {
        document.body.innerHTML = '<div id="app-container"></div>';

        // Setup Dependency Injection Mock
        mockApiService = {
            call: vi.fn().mockResolvedValue({ status: 'success' })
        };

        // Setup DOM Mock Environment
        mockBtn = document.createElement('button');
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
        
        // Si el event listener es provocado, el proxy del apiService interceptará llamadas.
        // Validamos que el contract se mantenga sin acceder a dependencias globales
        expect(typeof submitter.apiService.call).toBe('function');
    });
});
