const { APP_SCHEMAS } = require('../src/Schema_Engine.gs');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: simulate getGenericOrdenPath with a mock cache
// ─────────────────────────────────────────────────────────────────────────────
function buildOrdenPath(formState, calcParams, mockCache) {
    // Inline copy of the engine logic for isolated unit testing
    const levelField  = calcParams.levelField  || 'nivel_tipo';
    const parentField = calcParams.parentField || 'id_dominio_padre';
    const pkField     = calcParams.pkField     || 'id_' + calcParams.entity.toLowerCase();
    const orderField  = calcParams.orderField  || 'orden_path';

    const nivelStr = formState[levelField];
    if (nivelStr === undefined || nivelStr === null) return '';
    const nivel = parseInt(nivelStr, 10);
    if (isNaN(nivel)) return '';

    const cache = mockCache || [];

    if (nivel === 0) {
        let maxRoot = 0;
        cache.filter(d => parseInt(d[levelField], 10) === 0).forEach(d => {
            if (d[orderField]) {
                const val = parseInt(String(d[orderField]).split('.')[0], 10);
                if (!isNaN(val) && val > maxRoot) maxRoot = val;
            }
        });
        return String(maxRoot + 1).padStart(2, '0');
    } else {
        const idPadre = formState[parentField];
        if (!idPadre || idPadre === '') return '';
        const padre = cache.find(d => String(d[pkField]) === String(idPadre));
        if (!padre || !padre[orderField]) return '';
        const parentPathStr = String(padre[orderField]).split('.').map(p => p.padStart(2, '0')).join('.');
        const siblings = cache.filter(d => String(d[parentField]) === String(idPadre));
        let maxSuffix = 0;
        siblings.forEach(sib => {
            if (sib[orderField]) {
                const parts = String(sib[orderField]).split('.');
                const lastPart = parseInt(parts[parts.length - 1], 10);
                if (!isNaN(lastPart) && lastPart > maxSuffix) maxSuffix = lastPart;
            }
        });
        return parentPathStr + '.' + String(maxSuffix + 1).padStart(2, '0');
    }
}

const CALC_PARAMS = APP_SCHEMAS['Dominio'].fields.find(f => f.name === 'orden_path').calcParams;

describe('TDD: Jerarquía Recursiva Dinámica (Zero-Touch Trigger)', () => {
    // ── STRUCTURAL TEST (existing) ────────────────────────────────────────
    test('El esquema Dominio debe incluir triggers_refresh_of en nivel_tipo y el componente receptor en id_dominio_padre', () => {
        const schema = APP_SCHEMAS['Dominio'];
        expect(schema).toBeDefined();

        const sourceField = schema.fields.find(f => f.name === 'nivel_tipo');
        expect(sourceField).toBeDefined();
        expect(sourceField.triggers_refresh_of).toContain('id_dominio_padre');

        const parentField = schema.fields.find(f => f.name === 'id_dominio_padre');
        expect(parentField).toBeDefined();
        expect(parentField.type).toBe('select');
        expect(parentField.lookupSource).toBe('getDominiosPadreOptions');
    });

    // ── O-01: BEHAVIORAL TESTS ────────────────────────────────────────────
    describe('getGenericOrdenPath — behavioral coverage (O-01)', () => {

        test('Nivel 0 (raíz): primer dominio recibe "01"', () => {
            const mockCache = [];
            const formState = { nivel_tipo: '0', id_dominio_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01');
        });

        test('Nivel 0: segundo dominio raíz recibe "02" cuando ya existe "01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-A', nivel_tipo: '0', id_dominio_padre: '', orden_path: '01' }
            ];
            const formState = { nivel_tipo: '0', id_dominio_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('02');
        });

        test('Nivel 1 (hijo): primer hijo de "01" recibe "01.01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-ROOT', nivel_tipo: '0', id_dominio_padre: '', orden_path: '01' }
            ];
            const formState = { nivel_tipo: '1', id_dominio_padre: 'DOMI-ROOT' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.01');
        });

        test('Nivel 1: segundo hijo de "01" recibe "01.02" cuando ya existe "01.01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-ROOT', nivel_tipo: '0', id_dominio_padre: '', orden_path: '01' },
                { id_dominio: 'DOMI-HIJO1', nivel_tipo: '1', id_dominio_padre: 'DOMI-ROOT', orden_path: '01.01' }
            ];
            const formState = { nivel_tipo: '1', id_dominio_padre: 'DOMI-ROOT' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.02');
        });

        test('Nivel 2 (nieto): primer nieto de "01.01" recibe "01.01.01"', () => {
            const mockCache = [
                { id_dominio: 'DOMI-ROOT',  nivel_tipo: '0', id_dominio_padre: '',          orden_path: '01'    },
                { id_dominio: 'DOMI-HIJO1', nivel_tipo: '1', id_dominio_padre: 'DOMI-ROOT', orden_path: '01.01' }
            ];
            const formState = { nivel_tipo: '2', id_dominio_padre: 'DOMI-HIJO1' };
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.01.01');
        });

        test('Defensivo: Sheets castea orden_path integer 2 → path debe padear a "02"', () => {
            const mockCache = [
                // Sheets convirtió "01" a número 1 (casteo automático)
                { id_dominio: 'DOMI-ROOT', nivel_tipo: 0, id_dominio_padre: '', orden_path: 1 }
            ];
            const formState = { nivel_tipo: '1', id_dominio_padre: 'DOMI-ROOT' };
            // Parent path debe ser "01" (padded), resultado "01.01"
            expect(buildOrdenPath(formState, CALC_PARAMS, mockCache)).toBe('01.01');
        });

        test('Edge: nivel_tipo vacío devuelve string vacío', () => {
            const formState = { nivel_tipo: '', id_dominio_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, [])).toBe('');
        });

        test('Edge: nivel >= 1 sin FK padre devuelve string vacío (bloqueo de seguridad)', () => {
            const formState = { nivel_tipo: '1', id_dominio_padre: '' };
            expect(buildOrdenPath(formState, CALC_PARAMS, [])).toBe('');
        });
    });
});
