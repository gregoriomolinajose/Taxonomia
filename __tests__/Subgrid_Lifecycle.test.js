/**
 * Subgrid_Lifecycle.test.js
 * QA Level 3 — Comprehensive Automated Regression Suite for Subgrid Nested CRUD Lifecycle.
 *
 * Test 1: Hydration Test      — State initialized from parent record
 * Test 2: Modal Exclusion     — Available options correctly filtered
 * Test 3: Link Test           — Record added immutably to subgrid state
 * Test 4: Unlink Test         — Record removed immutably; FK reported for diffing
 */

const {
    initSubgridState,
    filterAvailableOptions,
    linkRecord,
    unlinkRecord,
    buildSavePayload
} = require('../src/SubgridState.client.js');

// ─────────────────────────────────────────────────────────────────────────────
// SHARED FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const CATALOG_5 = [
    { value: 'GRUP-001', label: 'Grupo Alpha' },
    { value: 'GRUP-002', label: 'Grupo Beta' },
    { value: 'GRUP-003', label: 'Grupo Gamma' },
    { value: 'GRUP-004', label: 'Grupo Delta' },
    { value: 'GRUP-005', label: 'Grupo Epsilon' },
];

const LINKED_2 = [
    { id_grupo_producto: 'GRUP-001', nombre: 'Grupo Alpha', estado: 'Activo', id_portafolio: 'PORT-X' },
    { id_grupo_producto: 'GRUP-002', nombre: 'Grupo Beta',  estado: 'Activo', id_portafolio: 'PORT-X' },
];

const PK = 'id_grupo_producto';
const FK = 'id_portafolio';
const PARENT_PK_VALUE = 'PORT-X';

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: Hydration Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 1 — Hydration Test (initSubgridState)', () => {
    test('Padre con 2 hijos debe inicializar el estado del subgrid con exactamente 2 registros', () => {
        const parentRecord = {
            id_portafolio: PARENT_PK_VALUE,
            nombre: 'Portafolio X',
            grupos_hijos: LINKED_2
        };

        const state = initSubgridState(parentRecord, 'grupos_hijos');

        expect(state).toHaveLength(2);
        expect(state[0].id_grupo_producto).toBe('GRUP-001');
        expect(state[1].id_grupo_producto).toBe('GRUP-002');
    });

    test('Hydration produce una COPIA (no la referencia original)', () => {
        const parentRecord = { grupos_hijos: LINKED_2 };
        const state = initSubgridState(parentRecord, 'grupos_hijos');
        expect(state).not.toBe(parentRecord.grupos_hijos); // diferente referencia
        expect(state).toEqual(parentRecord.grupos_hijos);  // mismos datos
    });

    test('Padre sin hijos inicializa el estado como arreglo vacío', () => {
        const state = initSubgridState({ id_portafolio: 'PORT-Y', nombre: 'Sin hijos' }, 'grupos_hijos');
        expect(state).toHaveLength(0);
    });

    test('parentData null inicializa el estado como arreglo vacío', () => {
        const state = initSubgridState(null, 'grupos_hijos');
        expect(state).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: Modal Exclusion Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 2 — Modal Exclusion Test (filterAvailableOptions)', () => {
    test('Catálogo de 5, subgrid con 2 → modal debe mostrar exactamente 3 opciones', () => {
        const available = filterAvailableOptions(CATALOG_5, LINKED_2, PK);
        expect(available).toHaveLength(3);
    });

    test('Los 3 disponibles NO contienen elementos ya vinculados', () => {
        const available = filterAvailableOptions(CATALOG_5, LINKED_2, PK);
        const availableIds = available.map(o => o.value);
        expect(availableIds).not.toContain('GRUP-001');
        expect(availableIds).not.toContain('GRUP-002');
        expect(availableIds).toContain('GRUP-003');
        expect(availableIds).toContain('GRUP-004');
        expect(availableIds).toContain('GRUP-005');
    });

    test('Filtra correctamente aunque el ID del subgrid tenga diferente capitalización', () => {
        const linkedDirty = [{ id_grupo_producto: '  grup-001  ' }]; // ID sucio
        const available = filterAvailableOptions(CATALOG_5, linkedDirty, PK);
        // GRUP-001 debe seguir siendo excluido
        expect(available.map(o => o.value)).not.toContain('GRUP-001');
        expect(available).toHaveLength(4);
    });

    test('Con subgrid vacío, el modal debe mostrar TODOS los disponibles (5)', () => {
        const available = filterAvailableOptions(CATALOG_5, [], PK);
        expect(available).toHaveLength(5);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: Link Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 3 — Link Test (linkRecord)', () => {
    test('Añadir un NUEVO registro al subgrid crece el estado a 3 elementos', () => {
        const newRecord = { id_grupo_producto: 'GRUP-003', nombre: 'Grupo Gamma', estado: 'Activo' };
        const updatedState = linkRecord(LINKED_2, newRecord, PK);

        expect(updatedState).toHaveLength(3);
        expect(updatedState.find(r => r.id_grupo_producto === 'GRUP-003')).toBeDefined();
    });

    test('El payload de guardado incluye la FK correcta para los 3 hijos', () => {
        const newRecord = { id_grupo_producto: 'GRUP-003', nombre: 'Grupo Gamma', estado: 'Activo' };
        const state3 = linkRecord(LINKED_2, newRecord, PK);

        const payload = buildSavePayload(
            { id_portafolio: PARENT_PK_VALUE, nombre: 'Portafolio X' },
            'grupos_hijos',
            state3,
            FK,
            PARENT_PK_VALUE
        );

        expect(payload.grupos_hijos).toHaveLength(3);
        payload.grupos_hijos.forEach(child => {
            expect(child[FK]).toBe(PARENT_PK_VALUE);
        });
    });

    test('linkRecord es inmutable: el arreglo original no se muta', () => {
        const originalRef = [...LINKED_2]; // copia para comparar
        const newRecord = { id_grupo_producto: 'GRUP-004', nombre: 'Grupo Delta', estado: 'Activo' };
        const updatedState = linkRecord(LINKED_2, newRecord, PK);

        expect(LINKED_2).toHaveLength(2);       // original intacto
        expect(updatedState).toHaveLength(3);   // nuevo arreglo
        expect(updatedState).not.toBe(LINKED_2); // diferente referencia
    });

    test('linkRecord es idempotente: no agrega duplicados', () => {
        const duplicate = { id_grupo_producto: 'GRUP-001', nombre: 'Grupo Alpha', estado: 'Activo' };
        const updatedState = linkRecord(LINKED_2, duplicate, PK);
        expect(updatedState).toHaveLength(2); // no creció
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Unlink Test
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 4 — Unlink Test (unlinkRecord)', () => {
    test('Eliminar un elemento del subgrid reduce el estado a 1', () => {
        const { state } = unlinkRecord(LINKED_2, PK, 'GRUP-001');
        expect(state).toHaveLength(1);
        expect(state[0].id_grupo_producto).toBe('GRUP-002');
    });

    test('El elemento eliminado es reportado en "removed" para que el backend haga diffing', () => {
        const { removed } = unlinkRecord(LINKED_2, PK, 'GRUP-001');
        expect(removed).not.toBeNull();
        expect(removed.id_grupo_producto).toBe('GRUP-001');
        expect(removed.nombre).toBe('Grupo Alpha');
    });

    test('unlinkRecord es inmutable: el arreglo original no se muta', () => {
        const { state } = unlinkRecord(LINKED_2, PK, 'GRUP-002');
        expect(LINKED_2).toHaveLength(2); // original intacto
        expect(state).toHaveLength(1);
        expect(state).not.toBe(LINKED_2);
    });

    test('Eliminar un ID que NO existe devuelve el mismo estado y removed = null', () => {
        const { state, removed } = unlinkRecord(LINKED_2, PK, 'GRUP-999');
        expect(state).toHaveLength(2);
        expect(removed).toBeNull();
    });

    test('Eliminar con ID sucio (espacios + lowercase) funciona correctamente', () => {
        const { state, removed } = unlinkRecord(LINKED_2, PK, '  grup-001  ');
        expect(state).toHaveLength(1);
        expect(removed).not.toBeNull();
        expect(removed.id_grupo_producto).toBe('GRUP-001');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5: Topological Guards (S8.5 & S8.6)
// ─────────────────────────────────────────────────────────────────────────────

describe('Test 5 — Topological Guards in filterAvailableOptions', () => {
    const DOMINIO_OPTIONS = [
        { value: 'DOM-1', label: 'Nivel 1', nivel_tipo: 1, hasActiveParent: false },
        { value: 'DOM-2', label: 'Nivel 2', nivel_tipo: 2, hasActiveParent: true },
        { value: 'DOM-3', label: 'Nivel 3', nivel_tipo: 3, hasActiveParent: false },
        { value: 'DOM-4', label: 'Nivel 4', nivel_tipo: 4, hasActiveParent: true },
    ];

    test('Falta de Contexto (Legacy FLAT) omite las validaciones', () => {
        const filtered = filterAvailableOptions(DOMINIO_OPTIONS, [], 'id_dominio', null);
        expect(filtered).toHaveLength(4);
    });

    test('Orphan Stealing Ban remueve opciones con hasActiveParent (isHijo, allowOrphanStealing: false)', () => {
        const rulesContext = {
            topologyRules: { allowOrphanStealing: false },
            currentLevel: 1,
            relationType: 'hijo'
        };
        const filtered = filterAvailableOptions(DOMINIO_OPTIONS, [], 'id_dominio', rulesContext);
        // DOM-2 y DOM-4 tienen hasActiveParent: true, deben ser excluidos
        expect(filtered).toHaveLength(2);
        expect(filtered.map(o => o.value)).toEqual(['DOM-1', 'DOM-3']);
    });

    test('Saltos Estrictos (strictLevelJumps: true) para relación HIJO exige Nivel Objetivo = cLevel + 1', () => {
        const rulesContext = {
            topologyRules: { levelFiltering: true, strictLevelJumps: true },
            currentLevel: 2,
            relationType: 'hijo'
        };
        const filtered = filterAvailableOptions(DOMINIO_OPTIONS, [], 'id_dominio', rulesContext);
        // Si estoy en Nivel 2, busco hijos en Nivel 3 exclusivamente
        expect(filtered).toHaveLength(1);
        expect(filtered[0].value).toBe('DOM-3');
    });

    test('Saltos Estrictos (strictLevelJumps: true) para relación PADRE exige Nivel Objetivo = cLevel - 1', () => {
        const rulesContext = {
            topologyRules: { levelFiltering: true, strictLevelJumps: true },
            currentLevel: 3,
            relationType: 'padre'
        };
        const filtered = filterAvailableOptions(DOMINIO_OPTIONS, [], 'id_dominio', rulesContext);
        // Si estoy en Nivel 3, busco padre en Nivel 2 exclusivamente
        expect(filtered).toHaveLength(1);
        expect(filtered[0].value).toBe('DOM-2');
    });

    test('Saltos Laxos (strictLevelJumps: false) para relación HIJO permite cualquier Nivel Objetivo > cLevel', () => {
        const rulesContext = {
            topologyRules: { levelFiltering: true, strictLevelJumps: false },
            currentLevel: 2,
            relationType: 'hijo'
        };
        const filtered = filterAvailableOptions(DOMINIO_OPTIONS, [], 'id_dominio', rulesContext);
        // Si estoy en Nivel 2, los hijos válidos son Nivel 3 y Nivel 4
        expect(filtered).toHaveLength(2);
        expect(filtered.map(o => o.value)).toEqual(['DOM-3', 'DOM-4']);
    });

    test('Saltos Laxos (strictLevelJumps: false) para relación PADRE permite cualquier Nivel Objetivo < cLevel', () => {
        const rulesContext = {
            topologyRules: { levelFiltering: true, strictLevelJumps: false },
            currentLevel: 3,
            relationType: 'padre'
        };
        const filtered = filterAvailableOptions(DOMINIO_OPTIONS, [], 'id_dominio', rulesContext);
        // Si estoy en Nivel 3, los padres válidos pueden ser Nivel 1 o Nivel 2
        expect(filtered).toHaveLength(2);
        expect(filtered.map(o => o.value)).toEqual(['DOM-1', 'DOM-2']);
    });

    test('Protección de Root (rootRequiresNoParent: true)', () => {
        const rulesContext = {
            topologyRules: { levelFiltering: true, strictLevelJumps: true, rootRequiresNoParent: true },
            currentLevel: 1,
            relationType: 'padre'
        };
        const filtered = filterAvailableOptions(DOMINIO_OPTIONS, [], 'id_dominio', rulesContext);
        // Nivel 1 no puede tener padre
        expect(filtered).toHaveLength(0);
    });
});
