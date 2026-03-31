// __tests__/FormEngine_UI_Layout.test.js

/**
 * BDD Tests for FormEngine_UI Layout Rules (Regla 5.x)
 * Validates UX constraints: Grid, Responsive Columns, and Progressive Disclosure (Wizards).
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe.skip('FormEngine UX/UI Advancements (Regla 5.x)', () => {
    let document;
    let window;

    // Scenarios (BDD Gherkin Translated)
    const MOCK_SCHEMAS = {
        // Entidad plana sin steps
        "SimpleEntity": [
            { name: "f1", label: "Field 1", type: "text" },
            { name: "f2", label: "Field 2", type: "number", width: 6 },
            { name: "f3", label: "Field 3", type: "select", width: 6 }
        ],
        // Entidad compleja con Progressive Disclosure
        "WizardEntity": {
            steps: ["Basicos", "Detalles", "Confirmacion"],
            fields: [
                { name: "w1", label: "Basico 1", type: "text", step: "Basicos" },
                { name: "w2", label: "Detalle 1", type: "text", step: "Detalles" },
                { name: "w3", label: "Confirma", type: "text", step: "Confirmacion" }
            ]
        }
    };

    beforeAll(() => {
        const dom = new JSDOM(`<!DOCTYPE html><div id="app-container"></div>`, { runScripts: "dangerously" });
        document = dom.window.document;
        window = dom.window;

        // Inyectamos nuestro Mock Schema saltándonos el config real
        window.APP_SCHEMAS = MOCK_SCHEMAS;

        // Cargamos y ejecutamos dinámicamente el FormEngine actual
        const engineFile = fs.readFileSync(path.join(__dirname, '../src/FormRenderer_UI.html'), 'utf8');
        const engineScript = engineFile.replace(/<\/?script>/g, '');

        const scriptEl = document.createElement('script');
        scriptEl.textContent = engineScript;
        document.body.appendChild(scriptEl);
    });

    beforeEach(() => {
        document.getElementById('app-container').innerHTML = '';
        // Mock global de Ionic Toasts/Loaders si es necesario instanciarlos en window
        window.presentToast = jest.fn();
        window.presentLoading = jest.fn();
    });

    describe('Regla 5.2: Diseño Responsivo Nativo (Ionic Grid)', () => {

        it('GIVEN a simple entity WHEN rendered THEN it MUST be wrapped in an <ion-grid> containing <ion-row>', () => {
            window.renderForm('SimpleEntity');
            const container = document.getElementById('app-container');

            expect(container.querySelector('ion-grid')).not.toBeNull();
            expect(container.querySelector('ion-row')).not.toBeNull();
        });

        it('GIVEN fields with width properties WHEN rendered THEN it MUST generate mobile-first <ion-col> tags appropriately', () => {
            window.renderForm('SimpleEntity');
            const container = document.getElementById('app-container');

            // F1: Sin width definido -> size="12" (Default)
            const col1 = container.querySelector('ion-input[name="f1"]').closest('ion-col');
            expect(col1.getAttribute('size')).toBe('12');
            expect(col1.getAttribute('size-md')).toBeNull(); // No desktop override

            // F2: Con width definido en 6 -> size="12" size-md="6"
            const col2 = container.querySelector('ion-input[name="f2"]').closest('ion-col');
            expect(col2.getAttribute('size')).toBe('12');
            expect(col2.getAttribute('size-md')).toBe('6');
        });

    });

    describe('Regla 5.1: Gestión de Carga Cognitiva (Progressive Disclosure)', () => {

        it('GIVEN an entity with steps WHEN rendered THEN it MUST output an <ion-segment> for Wizard navigation', () => {
            // Nota Técnica: JSDOM no evalúa ShadowDOM, pero asertaremos que el nodo <ion-segment>
            // de Ionic Web Components haya sido construido e inyectado con sus respectivos <ion-segment-button>.
            window.renderForm('WizardEntity');
            const container = document.getElementById('app-container');

            const segment = container.querySelector('ion-segment');
            expect(segment).not.toBeNull();

            const buttons = segment.querySelectorAll('ion-segment-button');
            expect(buttons.length).toBe(3); // Basicos, Detalles, Confirmacion

            // El primer paso debe estar activo por defecto
            expect(buttons[0].getAttribute('value')).toBe('Basicos');
        });

        it('GIVEN an entity with steps WHEN rendered THEN fields MUST be grouped inside conditionally visible step containers', () => {
            window.renderForm('WizardEntity');
            const container = document.getElementById('app-container');

            // Deberíamos esperar contenedores (ej. divs con id "step-Basicos") 
            // que alojen exclusivamente los inputs con ese Step value
            const step1Container = container.querySelector('#step-Basicos');
            expect(step1Container).not.toBeNull();
            expect(step1Container.querySelector('ion-input[name="w1"]')).not.toBeNull();

            // El field w2 pertenece a "Detalles", no debe estar en "Basicos"
            expect(step1Container.querySelector('ion-input[name="w2"]')).toBeNull();
        });

    });

});
