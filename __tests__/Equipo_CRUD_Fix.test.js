// __tests__/Equipo_CRUD_Fix.test.js

/**
 * Test for Equipo and Persona Schema fixes (Blueprint V4).
 * Enforces correct graph boundaries, templates, and avoiding flat lookups.
 */

const fs = require('fs');
const path = require('path');

describe('Blueprint V4 - Equipo & Persona Structural Integrity', () => {

    let schemaContent = '';

    beforeAll(() => {
        const schemaPath = path.resolve(__dirname, '../src/Schema_Engine.gs');
        schemaContent = fs.readFileSync(schemaPath, 'utf8');
    });

    function getEntityBlock(entityName, nextEntity) {
        const start = schemaContent.indexOf(`${entityName}: {`);
        const end = nextEntity ? schemaContent.indexOf(`${nextEntity}: {`) : schemaContent.length;
        if (start === -1) throw new Error(`Entity ${entityName} not found in Schema_Engine.gs`);
        return schemaContent.substring(start, end);
    }

    test('1. Equipo schema MUST enforce all Blueprint V4 FIELD_TEMPLATES', () => {
        const block = getEntityBlock('Equipo', 'Persona');
        expect(block).toContain('...FIELD_TEMPLATES.SYSTEM_FIELDS()');
        expect(block).toContain('...FIELD_TEMPLATES.AUDIT_FIELDS()');
        expect(block).toContain('...FIELD_TEMPLATES.VERSION_FIELD()');
        expect(block).toContain('...FIELD_TEMPLATES.ESTADO_FIELD()'); // Habilita soft deletes
    });

    test('2. Equipo MUST link to Grupo_Productos as strict parent relation', () => {
        const block = getEntityBlock('Equipo', 'Persona');
        expect(block).not.toContain('id_producto'); // No direct linking to Producto
        expect(block).toContain('name: "id_grupo_producto"');
        expect(block).toContain('type: "relation"');
        expect(block).toContain('relationType: "padre"');
        expect(block).toContain('isTemporalGraph: true');
        expect(block).toContain('graphEdgeType: "GRUPO_PRODUCTO_EQUIPO"');
    });
    
    test('3. Equipo MUST define subgrid for Personas integrants', () => {
        const block = getEntityBlock('Equipo', 'Persona');
        expect(block).toContain('name: "personas_asignadas"');
        expect(block).toContain('relationType: "hijo"');
        expect(block).toContain('targetEntity: "Persona"');
        expect(block).toContain('isTemporalGraph: true');
        expect(block).toContain('graphEdgeType: "PERSONA_EQUIPO"');
    });

    test('4. Persona schema MUST enforce all Blueprint V4 FIELD_TEMPLATES', () => {
        const block = getEntityBlock('Persona', 'Sys_Graph_Edges');
        expect(block).toContain('...FIELD_TEMPLATES.SYSTEM_FIELDS()');
        expect(block).toContain('...FIELD_TEMPLATES.AUDIT_FIELDS()');
        expect(block).toContain('...FIELD_TEMPLATES.VERSION_FIELD()');
        expect(block).toContain('...FIELD_TEMPLATES.ESTADO_FIELD()');
    });

    test('5. Persona.equipo MUST be exactly a Temporal Graph relation, not a flat lookup', () => {
        const block = getEntityBlock('Persona', 'Sys_Graph_Edges');
        // El campo asignación no debe usar lookup a Equipas
        expect(block).not.toContain('lookupTarget: "Equipas"');
        
        expect(block).toContain('name: "equipo"');
        expect(block).toContain('type: "relation"');
        expect(block).toContain('relationType: "padre"');
        expect(block).toContain('targetEntity: "Equipo"');
        expect(block).toContain('isTemporalGraph: true');
        expect(block).toContain('graphEdgeType: "PERSONA_EQUIPO"');
    });

    test('6. Persona.lider_directo MUST define graphEdgeType to avoid collision and remove subgrid view', () => {
        const block = getEntityBlock('Persona', 'Sys_Graph_Edges');
        // Debe tener el tag explícito
        expect(block).toContain('graphEdgeType: "PERSONA_LIDER_DIRECTO"');
        // NO debe tener un subgrid porque es padre (1 lider directo por etapa)
        expect(block).not.toContain('uiBehavior: "subgrid"');
    });
});
