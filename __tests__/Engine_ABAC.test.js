// __tests__/Engine_ABAC.test.js

/**
 * Tests for Attribute-Based Access Control (ABAC).
 * Enforces correct topology resolution and authorization rules.
 */

// Mock de la Base de Datos en RAM
const mockDB = {
    Persona: [
        { id_persona: 'USR-1', correo: 'admin@taxonomia.com', id_rol: 'ADMIN' },
        { id_persona: 'USR-2', correo: 'manager@taxonomia.com', id_rol: 'USER' },
        { id_persona: 'USR-3', correo: 'guest@taxonomia.com', id_rol: 'GUEST' }
    ],
    Portafolio: [
        { id_portafolio: 'PORT-A', director_id: 'USR-2', vp_id: 'USR-1' },
        { id_portafolio: 'PORT-B', director_id: 'USR-3', vp_id: 'USR-1' }
    ],
    Grupo_Productos: [
        { id_grupo_producto: 'GRP-1', group_manager_id: 'USR-2', id_portafolio: 'PORT-A' },
        { id_grupo_producto: 'GRP-2', group_manager_id: 'USR-9', id_portafolio: 'PORT-A' }
    ],
    Sys_Permissions: [
        { id_rol: 'ADMIN', schema_destino: 'Portafolio', nivel_acceso: 'ALL' },
        { id_rol: 'USER', schema_destino: 'Grupo_Productos', nivel_acceso: 'OWNER_ONLY' },
        { id_rol: 'USER', schema_destino: 'Portafolio', nivel_acceso: 'OWNER_ONLY' }
    ]
};

global.Engine_DB = {
    list: vi.fn((entityName) => {
        return { rows: mockDB[entityName] || [] };
    }),
    readFull: vi.fn()
};

global.APP_SCHEMAS = {
    Portafolio: {
        primaryKey: "id_portafolio",
        topological_metadata: {
            ownerFields: ["director_id", "vp_id"],
            parentEntity: null
        }
    },
    Grupo_Productos: {
        primaryKey: "id_grupo_producto",
        topological_metadata: {
            ownerFields: ["group_manager_id"],
            parentEntity: "Portafolio",
            parentField: "id_portafolio"
        }
    }
};

const { Engine_ABAC } = require('../src/Engine_ABAC.gs');

describe('Engine_ABAC Authorization Rules', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        Engine_ABAC._requestCache = {};
    });

    test('1. resolveTopologyFor returns empty context for unknown users', () => {
        const ctx = Engine_ABAC.resolveTopologyFor('unknown@taxonomia.com');
        expect(ctx.ownerOf.length).toBe(0);
        expect(ctx.memberOf.length).toBe(0);
    });

    test('2. resolveTopologyFor escalates topology for parent owners (DAG BFS)', () => {
        const ctx = Engine_ABAC.resolveTopologyFor('manager@taxonomia.com');
        
        // Debe ser dueño directo de PORT-A y GRP-1
        expect(ctx.ownerOf).toContain('PORT-A');
        expect(ctx.ownerOf).toContain('GRP-1');
        
        // Al ser dueño de PORT-A, también debe ser cascaded owner de GRP-2 (ya que GRP-2 pertenece a PORT-A)
        expect(ctx.ownerOf).toContain('GRP-2');
        
        // No debe ser dueño de PORT-B
        expect(ctx.ownerOf).not.toContain('PORT-B');
    });

    test('3. validatePermission deniega acceso a updates si el usuario no es owner/miembro del registro exacto', () => {
        // manager (USR-2) no tiene que ver con PORT-B
        const allowed = Engine_ABAC.validatePermission('manager@taxonomia.com', 'update', 'Portafolio', 'PORT-B');
        expect(allowed).toBe(false);
    });

    test('4. validatePermission otorga acceso total (bypass) a usuarios tipo ADMIN', () => {
        const allowed = Engine_ABAC.validatePermission('admin@taxonomia.com', 'delete', 'Portafolio', 'PORT-B');
        expect(allowed).toBe(true);
    });

    test('5. validatePermission otorga acceso update si el usuario es owner', () => {
        const allowed = Engine_ABAC.validatePermission('manager@taxonomia.com', 'update', 'Grupo_Productos', 'GRP-2');
        expect(allowed).toBe(true);
    });
});
