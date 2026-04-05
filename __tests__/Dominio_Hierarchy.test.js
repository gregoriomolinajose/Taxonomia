const { APP_SCHEMAS } = require('../src/Schema_Engine.gs');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: simulate getGenericOrdenPath with a mock cache
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const mathEnginePath = path.resolve(__dirname, '../src/Math_Engine.html');
let mathEngineCode = fs.readFileSync(mathEnginePath, 'utf8').replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
const mathContext = {};
eval(`
    ${mathEngineCode}
    mathContext.buildOrdenPath = typeof buildOrdenPath !== 'undefined' ? buildOrdenPath : null;
`);
const { buildOrdenPath } = mathContext;

const CALC_PARAMS = {
    entity: 'Dominio',
    levelField: 'nivel_tipo',
    parentField: 'id_nodo_padre',
    pkField: 'id_dominio',
    orderField: 'orden_path'
};

describe('TDD: Jerarquía Recursiva Dinámica (Zero-Touch Trigger)', () => {
    // ── STRUCTURAL TEST (existing) ────────────────────────────────────────
    test('El esquema Dominio debe usar el subgrid relaciones_padre (E5 refactor)', () => {
        const schema = APP_SCHEMAS['Dominio'];
        expect(schema).toBeDefined();

        const relationsField = schema.fields.find(f => f.name === 'relaciones_padre');
        expect(relationsField).toBeDefined();
        expect(relationsField.uiBehavior).toBe('subgrid');
        expect(relationsField.isTemporalGraph).toBe(true);
    });

    // ── O-01: BEHAVIORAL TESTS ────────────────────────────────────────────
    describe('getGenericOrdenPath — behavioral coverage (O-01)', () => {

        test('Nivel 0 (raíz): primer dominio recibe "01"', () => {
            const mockCache = [];
            const formState = { nivel_tipo: '0', id_nodo_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01');
        });

        test('Nivel 0: segundo dominio raíz recibe "02" cuando ya existe "01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-A', nivel_tipo: '0', id_nodo_padre: '', orden_path: '01' }
            ];
            const formState = { nivel_tipo: '0', id_nodo_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('02');
        });

        test('Nivel 1 (hijo): primer hijo de "01" recibe "01.01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-ROOT', nivel_tipo: '0', id_nodo_padre: '', orden_path: '01' }
            ];
            const formState = { nivel_tipo: '1', id_nodo_padre: 'DOMI-ROOT' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.01');
        });

        test('Nivel 1: segundo hijo de "01" recibe "01.02" cuando ya existe "01.01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-ROOT', nivel_tipo: '0', id_nodo_padre: '', orden_path: '01' },
                { id_dominio: 'DOMI-HIJO1', nivel_tipo: '1', id_nodo_padre: 'DOMI-ROOT', orden_path: '01.01' }
            ];
            const formState = { nivel_tipo: '1', id_nodo_padre: 'DOMI-ROOT' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.02');
        });

        test('Nivel 2 (nieto): primer nieto de "01.01" recibe "01.01.01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-ROOT',  nivel_tipo: '0', id_nodo_padre: '',          orden_path: '01'    },
                { id_dominio: 'DOMI-HIJO1', nivel_tipo: '1', id_nodo_padre: 'DOMI-ROOT', orden_path: '01.01' }
            ];
            const formState = { nivel_tipo: '2', id_nodo_padre: 'DOMI-HIJO1' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.01.01');
        });

        test('Defensivo: Sheets castea orden_path integer 2 → path debe padear a "02"', () => {
            const mockCache = [
                // Sheets convirtió "01" a número 1 (casteo automático)
                { id_dominio: 'DOMI-ROOT', nivel_tipo: 0, id_nodo_padre: '', orden_path: 1 }
            ];
            const formState = { nivel_tipo: '1', id_nodo_padre: 'DOMI-ROOT' };
            // Parent path debe ser "01" (padded), resultado "01.01"
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.01');
        });

        test('Edge: nivel_tipo vacío devuelve string vacío', () => {
            const formState = { nivel_tipo: '', id_nodo_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, [])).toBe('');
        });

        test('Edge: nivel >= 1 sin FK padre devuelve string vacío (bloqueo de seguridad)', () => {
            const formState = { nivel_tipo: '1', id_nodo_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, [])).toBe('');
        });
    });
});
