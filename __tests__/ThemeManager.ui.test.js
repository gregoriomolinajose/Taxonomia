import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import '../src/UI_ThemeManager.client.js';

describe('UI_ThemeManager (ES6 Class Architecture)', () => {
    beforeEach(() => {
        // Mock DOM & LocalStorage
        document.body.innerHTML = `
            <ion-icon id="theme-toggle-icon" name="moon-outline"></ion-icon>
        `;
        document.body.className = '';
        
        let store = {};
        vi.stubGlobal('localStorage', {
            getItem: vi.fn(key => store[key]),
            setItem: vi.fn((key, value) => { store[key] = value; }),
            clear: vi.fn(() => { store = {}; })
        });
        
        window.dispatchEvent = vi.fn();
        window.chartTopology = { updateOptions: vi.fn() };
        window.chartCapacity = { updateOptions: vi.fn() };
        
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('A. Se debe instanciar globalmente sin fracturar el acceso original', () => {
        expect(window.UI_ThemeManager).toBeDefined();
        expect(window.ThemeManager).toBeDefined();
        expect(window.ThemeManager.currentTheme).toBe('light'); // default constructor
        expect(typeof window.ThemeManager.initThemeManager).toBe('function');
    });

    it('B. setTheme() debe actualizar CSS, localStorage y eventos del DOM dinámicamente', () => {
        const tm = new window.UI_ThemeManager();
        
        // Arrange & Act
        tm.setTheme('dark');
        
        // Assertions
        expect(document.body.classList.contains('dark')).toBe(true);
        expect(localStorage.setItem).toHaveBeenCalledWith('app_theme', 'dark');
        expect(tm.currentTheme).toBe('dark');
        
        const icon = document.getElementById('theme-toggle-icon');
        expect(icon.name).toBe('sunny-outline');
        
        // Test Golden Pattern Resizing Dispatch
        vi.runAllTimers();
        expect(window.dispatchEvent).toHaveBeenCalledWith(expect.any(Event));
    });

    it('C. initThemeManager() debe leer del entorno e invocar a _hydrate() correctamente', () => {
        const tm = new window.UI_ThemeManager();
        localStorage.getItem.mockReturnValue('ocean');
        
        vi.spyOn(tm, '_hydrate');
        
        tm.initThemeManager();
        
        expect(tm.currentTheme).toBe('ocean');
        expect(document.body.classList.contains('ocean')).toBe(true);
        
        // Verificar que llamó al aplanamiento de JSON
        expect(tm._hydrate).toHaveBeenCalledWith(tm.tokens);
    });

    it('D. cycleTheme() debe rotar entre los temas disponibles con fallback activo', () => {
        const tm = new window.UI_ThemeManager();
        tm.currentTheme = 'dark';
        
        tm.cycleTheme();
        expect(tm.currentTheme).toBe('light');
        
        tm.cycleTheme();
        expect(tm.currentTheme).toBe('dark');
    });
});
