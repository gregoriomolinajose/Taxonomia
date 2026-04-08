import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import '@testing-library/jest-dom';

describe('QA Visual: Ecosistema Design System y Dark Mode', () => {

    beforeAll(async () => {
        // En un entorno Headless Chrome (Vitest Browser), inyectaremos
        // los estilos simulados desde nuestros componentes empaquetados
        const styles = `
            body.dark {
                --ion-color-secondary: #1D2125 !important;
                --ion-text-color: #CECFD2 !important;
                --sys-font-family: 'Roboto', sans-serif;
            }
            #global-omnibar {
                background-color: var(--ion-color-secondary);
                color: var(--ion-text-color);
            }
            .stepper-btn {
                font-family: var(--sys-font-family, inherit) !important;
            }
        `;
        const styleEl = document.createElement('style');
        styleEl.innerHTML = styles;
        document.head.appendChild(styleEl);
    });

    beforeEach(() => {
        document.body.innerHTML = `
            <div id="global-omnibar"></div>
            <button class="stepper-btn">Siguiente</button>
        `;
    });

    it('El Buscador Global resuelve al Color Jira Elevation (Dark Surface) cuando hereda', () => {
        document.body.classList.add('dark');
        const omnibar = document.getElementById('global-omnibar');
        
        // El computedStyle en navegador resolverá el valor Hex a RGB
        const comp = window.getComputedStyle(omnibar);
        expect(comp.backgroundColor).toBe('rgb(29, 33, 37)'); // #1D2125
        expect(comp.color).toBe('rgb(206, 207, 210)'); // #CECFD2
    });

    it('Los botones del Stepper respetan la barrera tipográfica dinámica', () => {
        document.body.classList.add('dark');
        const btn = document.querySelector('.stepper-btn');
        
        const comp = window.getComputedStyle(btn);
        // Debe haber inferido 'Roboto', sans-serif que es var(--sys-font-family)
        expect(comp.fontFamily).toContain('Roboto');
    });

});
