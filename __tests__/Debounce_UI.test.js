// __tests__/Debounce_UI.test.js

/**
 * Tests for the Debounce UI logic in JS_Core.html.
 * Exposes the "Truthiness Trap" found during the RAI Quality Review.
 */

const fs = require('fs');
const path = require('path');

describe('JS_Core.html - Debounce Truthiness Trap (S21.2)', () => {

    let debounceCode = '';

    beforeAll(() => {
        const filePath = path.resolve(__dirname, '../src/JS_Core.client.js');
        const content = fs.readFileSync(filePath, 'utf8');
        
        const startIdx = content.indexOf('window.debounce = function');
        const endIdx = content.indexOf('window.PresentSafe', startIdx);
        if (startIdx === -1 || endIdx === -1) throw new Error("No se encontró window.debounce");
        
        let extracted = content.substring(startIdx, endIdx);
        // Quitar comentarios posteriores
        extracted = extracted.substring(0, extracted.lastIndexOf('};') + 2);
        
        global.window = {};
        eval(extracted);
    });

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('1. Funciona correctamente con delay positivo', () => {
        const mockFn = jest.fn();
        const debounced = window.debounce(mockFn, 100);

        debounced();
        debounced();
        debounced();

        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(110);

        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('2. Funciona correctamente usando el default delay', () => {
        const mockFn = jest.fn();
        const debounced = window.debounce(mockFn);

        debounced();
        jest.advanceTimersByTime(290);
        expect(mockFn).not.toHaveBeenCalled();

        jest.advanceTimersByTime(15);
        expect(mockFn).toHaveBeenCalledTimes(1);
    });

    test('3. Truthiness Trap: Permite delay = 0 (Macro-task defer) explícito', () => {
        const mockFn = jest.fn();
        // El usuario pide explícitamente 0ms para diferir solo la caja actual de event loop
        const debounced = window.debounce(mockFn, 0);

        debounced();
        
        // Avanzamos 5ms
        jest.advanceTimersByTime(5);
        
        // Si el truthiness trap existe, delay = 0 fue sobreescrito por 300,
        // Y por lo tanto toHaveBeenCalledTimes(1) fallará aquí.
        expect(mockFn).toHaveBeenCalledTimes(1);
    });
});
