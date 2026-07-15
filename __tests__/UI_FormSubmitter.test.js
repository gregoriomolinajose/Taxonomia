/**
 * @vitest-environment jsdom
 */

import { describe, test, expect, vi, beforeEach, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('UI_FormSubmitter - Dirty Checking (S57.X)', () => {
    let mockSubmitBtn;
    let mockApiService;
    let mockModal;
    let mockAppEventBus;

    beforeAll(() => {
        // Load UI_FormSubmitter
        const filePath = path.resolve(__dirname, '../src/UI_FormSubmitter.client.js');
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Define necessary mocks on window
        window.DOM = {
            clear: vi.fn(),
            create: vi.fn((tag) => document.createElement(tag))
        };
        window.PresentSafe = vi.fn().mockResolvedValue(true);
        
        // Evaluate the form submitter code in window context
        const fn = new Function('window', content);
        fn(window);
    });

    beforeEach(() => {
        // Set up DOM elements
        mockSubmitBtn = document.createElement('ion-button');
        mockModal = document.createElement('div');
        mockModal.id = 'app-container';
        document.body.innerHTML = '';
        document.body.appendChild(mockModal);
        
        mockApiService = {
            call: vi.fn().mockResolvedValue(JSON.stringify({ status: 'success', data: { id_registro: '123' } }))
        };

        mockAppEventBus = {
            publish: vi.fn(),
            subscribe: vi.fn()
        };
        window.AppEventBus = mockAppEventBus;
        
        vi.clearAllMocks();
    });

    test('1. En modo CREATE (nuevo registro), siempre se debe ejecutar el guardado', async () => {
        // Prepare a mock input
        const input = document.createElement('ion-input');
        input.setAttribute('name', 'nombre');
        input.value = 'Nuevo Nombre';
        mockModal.appendChild(input);

        const submitter = new window.UI_FormSubmitter(
            'Persona',
            [{ name: 'nombre', type: 'string' }],
            mockSubmitBtn,
            mockApiService,
            mockModal,
            null // null localEditId means CREATE mode
        );

        // Simulate click
        const clickEvent = new window.Event('click');
        mockSubmitBtn.dispatchEvent(clickEvent);

        // Wait a tick for async click handler
        await new Promise(resolve => setTimeout(resolve, 0));

        // It should call the API save/create
        expect(mockApiService.call).toHaveBeenCalled();
    });

    test('2. En modo UPDATE, si NO hay cambios, debe omitir el guardado en BD', async () => {
        // Prepare a mock input
        const input = document.createElement('ion-input');
        input.setAttribute('name', 'nombre');
        input.value = 'Valor Inicial';
        mockModal.appendChild(input);

        const submitter = new window.UI_FormSubmitter(
            'Persona',
            [{ name: 'nombre', type: 'string' }],
            mockSubmitBtn,
            mockApiService,
            mockModal,
            '123' // '123' localEditId means UPDATE mode
        );

        // Simular la hidratación inicial (FormEngine_Hydrator)
        submitter.captureInitialState();

        // Simular click sin hacer cambios
        const clickEvent = new window.Event('click');
        mockSubmitBtn.dispatchEvent(clickEvent);

        await new Promise(resolve => setTimeout(resolve, 0));

        // Debe haber omitido el API call
        expect(mockApiService.call).not.toHaveBeenCalled();
        
        // Debe haber publicado FORM::SUBMIT_SUCCESS con action: 'none'
        expect(mockAppEventBus.publish).toHaveBeenCalledWith('FORM::SUBMIT_SUCCESS', expect.objectContaining({
            response: expect.objectContaining({ action: 'none' })
        }));
    });

    test('3. En modo UPDATE, si SI hay cambios, debe ejecutar el guardado', async () => {
        // Prepare a mock input
        const input = document.createElement('ion-input');
        input.setAttribute('name', 'nombre');
        input.value = 'Valor Inicial';
        mockModal.appendChild(input);

        const submitter = new window.UI_FormSubmitter(
            'Persona',
            [{ name: 'nombre', type: 'string' }],
            mockSubmitBtn,
            mockApiService,
            mockModal,
            '123'
        );

        // Simular hidratación inicial
        submitter.captureInitialState();

        // Cambiar el valor del input
        input.value = 'Valor Modificado';

        // Simular click
        const clickEvent = new window.Event('click');
        mockSubmitBtn.dispatchEvent(clickEvent);

        await new Promise(resolve => setTimeout(resolve, 0));

        // Debe haber guardado
        expect(mockApiService.call).toHaveBeenCalled();
    });

    test('4. Al guardar exitosamente en modo silencioso, actualiza el estado inicial previniendo segundos guardados sin cambios', async () => {
        const input = document.createElement('ion-input');
        input.setAttribute('name', 'nombre');
        input.value = 'Valor Inicial';
        mockModal.appendChild(input);

        const submitter = new window.UI_FormSubmitter(
            'Persona',
            [{ name: 'nombre', type: 'string' }],
            mockSubmitBtn,
            mockApiService,
            mockModal,
            '123'
        );

        submitter.captureInitialState();
        submitter._isSilent = true; // Activar modo silencioso (wizard step)

        // 1. Modificamos y guardamos
        input.value = 'Primer Cambio';
        
        // Click 1 (con cambios)
        mockSubmitBtn.dispatchEvent(new window.Event('click'));
        // Esperamos a que todo el handler asíncrono click resuelva completamente
        await new Promise(resolve => setTimeout(resolve, 50));
        
        expect(mockApiService.call).toHaveBeenCalledTimes(1);

        // Reseteamos mocks
        mockApiService.call.mockClear();

        // 2. Click 2 (sin nuevos cambios desde el guardado anterior)
        mockSubmitBtn.dispatchEvent(new window.Event('click'));
        await new Promise(resolve => setTimeout(resolve, 50));

        // No debe volver a guardar
        expect(mockApiService.call).not.toHaveBeenCalled();
    });
});
