// __tests__/Equipo_CRUD_Fix.test.js

/**
 * Test for Equipo Schema fixes (Fase 1: Red).
 * Enforces Blueprint V2 compliance specifically targeting the schema flaws found.
 */

const fs = require('fs');
const path = require('path');

describe('Equipo Entity Structural Integrity - Blueprint V2', () => {

    let schemaContent = '';

    beforeAll(() => {
        const schemaPath = path.resolve(__dirname, '../src/Schema_Engine.gs');
        schemaContent = fs.readFileSync(schemaPath, 'utf8');
    });

    function getEquipoBlock() {
        const start = schemaContent.indexOf('Equipo: {');
        const end = schemaContent.indexOf('Producto: {');
        return schemaContent.substring(start, end);
    }

    test.skip('1. Equipo schema MUST define primaryKey and titleField at root (OBSOLETE in V4)', () => {
        const block = getEquipoBlock();
        expect(block).toContain('primaryKey: "id_equipo"');
        expect(block).toContain('titleField: "nombre_equipo"');
    });

    test.skip('2. Relation fields MUST use type: "select" and NOT the unimplemented "lookup" (OBSOLETE)', () => {
        const block = getEquipoBlock();
        expect(block).not.toContain('type: "lookup"');
        expect(block).not.toContain('lookupTarget:');
        expect(block).toContain('type: "select"');
        expect(block).toContain('lookupSource: "getPersonasOptions"');
        expect(block).toContain('lookupSource: "getProductosOptions"');
    });

    test('3. Must contain explicitly the estado hidden field for soft delete engine', () => {
        const block = getEquipoBlock();
        expect(block).toContain('"estado"');
        expect(block).toContain('defaultValue: "Activo"');
    });
});
