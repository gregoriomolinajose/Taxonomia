// __tests__/FormEngine_Logic.test.js

/**
 * BDD Tests for FormEngine (Mobile-Ready / Capacitor SPA)
 * Ensures that APP_SCHEMAS translates correctly into Ionic Web Components.
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe.skip('FormEngine Logic (Ionic Web Components)', () => {
    let document;
    let window;
    let FormEngine;
    let APP_SCHEMAS;

    beforeAll(() => {
        // Setup a simulated DOM WITH script execution enabled
        const dom = new JSDOM(`<!DOCTYPE html><div id="app-container"></div>`, { runScripts: "dangerously" });
        document = dom.window.document;
        window = dom.window;

        // Load the schemas from the file as if they were evaluated
        const schemaFile = fs.readFileSync(path.join(__dirname, '../src/JS_Schemas_Config.html'), 'utf8');
        // Extract the JSON part from inside the <script> tags
        const jsonMatch = schemaFile.match(/window\.APP_SCHEMAS = (\{[\s\S]*?\});/);
        if (jsonMatch) {
            // Using new Function is safe here for our controlled local test
            APP_SCHEMAS = new Function('return ' + jsonMatch[1])();
        } else {
            throw new Error("Could not parse APP_SCHEMAS");
        }

        // Load the FormEngine logic (simulating the script tag)
        const engineFile = fs.readFileSync(path.join(__dirname, '../src/FormEngine_UI.html'), 'utf8');
        const engineScript = engineFile.replace(/<\/?script>/g, '');

        // Inject dependencies into our simulated window
        window.APP_SCHEMAS = APP_SCHEMAS;

        // Evaluate FormEngine in the context of our simulated window
        // We attach renderForm to the window object in FormEngine_UI.html
        const scriptEl = document.createElement('script');
        scriptEl.textContent = engineScript;
        document.body.appendChild(scriptEl);
    });

    beforeEach(() => {
        // Reset container before each test
        document.getElementById('app-container').innerHTML = '';
    });

    it('APP_SCHEMAS should load correctly', () => {
        expect(APP_SCHEMAS).toBeDefined();

        // Portafolio ahora es un objeto con steps y fields
        expect(window.APP_SCHEMAS.Portafolio.fields.length).toBeGreaterThan(0);
    });

    it('should generate <ion-input> for text and number types', () => {
        // Act
        window.renderForm('Portafolio');
        const container = document.getElementById('app-container');

        // Assert: Check that Ionic components were created, NO standard inputs
        const standardInputs = container.querySelectorAll('input');
        expect(standardInputs.length).toBe(0); // Golden Rule: No standard inputs

        const ionInputs = container.querySelectorAll('ion-input');
        expect(ionInputs.length).toBeGreaterThan(0);

        // Check specific attributes injected from schema
        const presInput = container.querySelector('ion-input[name="presupuesto_anual"]');
        expect(presInput).not.toBeNull();
        expect(presInput.getAttribute('type')).toBe('number');
        expect(presInput.getAttribute('required')).toBe('true');
    });

    it('should generate <ion-select> for select types', () => {
        window.renderForm('Portafolio');
        const container = document.getElementById('app-container');

        const ionSelects = container.querySelectorAll('ion-select');
        expect(ionSelects.length).toBe(1);

        const estadoSelect = container.querySelector('ion-select[name="estado_aprobacion"]');
        expect(estadoSelect).not.toBeNull();

        // Check that standard HTML options are generated inside the ion-select, 
        // or ion-select-option depending on Ionic version (we'll assert ion-select-option)
        const options = estadoSelect.querySelectorAll('ion-select-option');
        expect(options.length).toBe(3);
        expect(options[0].value).toBe('DRAFT');
    });

    it('should throw error if entity does not exist in SCHEMAS', () => {
        expect(() => {
            window.renderForm('EntidadInexistente');
        }).toThrow("Schema not found for entity: EntidadInexistente");
    });
});
