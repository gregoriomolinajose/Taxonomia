/**
 * MasterDetail_Regression.test.js
 * Suite de Regresión Nivel 2 — Refactorización de Estado e Inmutabilidad
 *
 * Test 1: Motor de Reconciliación (Delete/Orphan)
 * Test 2: Aislamiento de Caché (Inmutabilidad de Estado)
 * Test 3: Saneamiento de Filtro (isRecordLinked con IDs sucios)
 */

const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets');

jest.mock('../src/Adapter_Sheets');
jest.mock('../src/Adapter_CloudDB');

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Replica minimal de la lógica pura de FormEngine para test aislado.
 * (La misma lógica que vive en IIFE dentro de FormEngine_UI.html)
 */
function _normalizeId(id) {
    return String(id || '').trim().toUpperCase();
}

function isRecordLinked(recordId, linkedRecords, pkField) {
    const normalizedCandidate = _normalizeId(recordId);
    return (linkedRecords || []).some(r => _normalizeId(r[pkField]) === normalizedCandidate);
}

/**
 * Simula la función de actualización de caché inmutable del FormEngine.
 * Devuelve un NUEVO arreglo, sin mutar el original.
 */
function applyImmutableCacheUpdate(currentCache, cleanRecord, pkField) {
    const pkValue = cleanRecord[pkField];
    const existingIdx = currentCache.findIndex(r => _normalizeId(r[pkField]) === _normalizeId(pkValue));
    return existingIdx !== -1
        ? [...currentCache.slice(0, existingIdx), cleanRecord, ...currentCache.slice(existingIdx + 1)]
        : [cleanRecord, ...currentCache];
}

// ─── Setup ───────────────────────────────────────────────────────────────────

const SCHEMAS = {
    Portafolio: {
        fields: [
            { name: 'id_portafolio', type: 'hidden', primaryKey: true },
            { name: 'nombre', type: 'text' },
            {
                name: 'grupos_hijos',
                type: 'relation',
                targetEntity: 'Grupo_Productos',
                foreignKey: 'id_portafolio'
            }
        ]
    },
    Grupo_Productos: {
        fields: [
            { name: 'id_grupo_producto', type: 'text', primaryKey: true },
            { name: 'nombre', type: 'text' },
            { name: 'id_portafolio', type: 'text' }
        ]
    }
};

beforeEach(() => {
    jest.clearAllMocks();
    global.APP_SCHEMAS = SCHEMAS;
    global.CONFIG = { useSheets: true, useCloudDB: false };
});

// ─── Test 1: Motor de Reconciliación (Delete/Orphan) ─────────────────────────

describe('Test 1 — Motor de Reconciliación (Orphan Cleanup)', () => {
    test('Padre con 3 hijos guardado con solo 2: debe desvincular el huérfano (FK = "")', () => {
        // Estado previo en DB: 3 hijos vinculados al padre PORT-ABC
        Adapter_Sheets.list.mockImplementation((entity) => {
            if (entity === 'Grupo_Productos') {
                return {
                    rows: [
                        { id_grupo_producto: 'GRUP-1', nombre: 'Hijo 1', id_portafolio: 'PORT-ABC' },
                        { id_grupo_producto: 'GRUP-2', nombre: 'Hijo 2', id_portafolio: 'PORT-ABC' },
                        { id_grupo_producto: 'GRUP-3', nombre: 'Hijo 3', id_portafolio: 'PORT-ABC' }, // será huérfano
                    ]
                };
            }
            return { rows: [] };
        });
        Adapter_Sheets.upsert.mockReturnValue({ status: 'success', action: 'updated', pk: 'id_portafolio', val: 'PORT-ABC' });

        // Payload entrante: solo 2 hijos (GRUP-3 fue eliminado del subgrid)
        const payload = {
            id_portafolio: 'PORT-ABC',
            nombre: 'Portafolio Principal',
            grupos_hijos: [
                { id_grupo_producto: 'GRUP-1', nombre: 'Hijo 1', id_portafolio: 'PORT-ABC' },
                { id_grupo_producto: 'GRUP-2', nombre: 'Hijo 2', id_portafolio: 'PORT-ABC' },
            ]
        };

        Engine_DB.orchestrateNestedSave('Portafolio', payload, global.CONFIG);

        // El upsertBatch fue llamado al menos 2 veces:
        // 1× con los huérfanos a desvincular, 1× con los hijos vigentes.
        const allBatchCalls = Adapter_Sheets.upsertBatch.mock.calls;
        expect(allBatchCalls.length).toBeGreaterThanOrEqual(2);

        // Identificar la llamada de desvinculación (batch de huérfanos)
        const orphanBatchCall = allBatchCalls.find(call => {
            const items = call[1];
            return items.some(item => item.id_portafolio === '');
        });

        expect(orphanBatchCall).toBeDefined();
        const orphanItems = orphanBatchCall[1];
        const orphan = orphanItems.find(o => o.id_grupo_producto === 'GRUP-3');
        expect(orphan).toBeDefined();
        expect(orphan.id_portafolio).toBe(''); // FK limpiada correctamente
    });
});

// ─── Test 2: Aislamiento de Caché (Inmutabilidad) ────────────────────────────

describe('Test 2 — Aislamiento de Caché (Inmutabilidad de Estado)', () => {
    test('Inyectar un nuevo registro no debe mutar el arreglo original del caché', () => {
        const originalCache = [
            { id_portafolio: 'PORT-001', nombre: 'Registro Existente' }
        ];
        const originalRef = originalCache; // guardar referencia original

        const newRecord = { id_portafolio: 'PORT-002', nombre: 'Nuevo Registro' };
        const updatedCache = applyImmutableCacheUpdate(originalCache, newRecord, 'id_portafolio');

        // El nuevo cache debe contener ambos registros
        expect(updatedCache).toHaveLength(2);
        expect(updatedCache[0].id_portafolio).toBe('PORT-002'); // nuevo al frente

        // La referencia original NO debe haber sido alterada
        expect(originalRef).toHaveLength(1);
        expect(originalRef).toBe(originalCache); // misma referencia en memoria
        expect(originalCache[0].id_portafolio).toBe('PORT-001'); // sin cambios
    });

    test('Actualizar un registro existente tampoco debe mutar el arreglo original', () => {
        const originalCache = [
            { id_portafolio: 'PORT-001', nombre: 'Nombre Viejo' },
            { id_portafolio: 'PORT-002', nombre: 'Otro Registro' }
        ];

        const updatedRecord = { id_portafolio: 'PORT-001', nombre: 'Nombre Actualizado' };
        const newCache = applyImmutableCacheUpdate(originalCache, updatedRecord, 'id_portafolio');

        // El cache nuevo tiene los datos correctos
        expect(newCache).toHaveLength(2);
        expect(newCache.find(r => r.id_portafolio === 'PORT-001').nombre).toBe('Nombre Actualizado');

        // El cache original no fue mutado
        expect(originalCache[0].nombre).toBe('Nombre Viejo');
    });
});

// ─── Test 3: Saneamiento de Filtro (isRecordLinked) ──────────────────────────

describe('Test 3 — Saneamiento de Filtro (isRecordLinked con IDs sucios)', () => {
    const linkedRecords = [
        { id_grupo_producto: 'GRUP-ABC' },
        { id_grupo_producto: 'GRUP-XYZ' }
    ];
    const pk = 'id_grupo_producto';

    test('Detecta un registro vinculado con ID limpio (caso base)', () => {
        expect(isRecordLinked('GRUP-ABC', linkedRecords, pk)).toBe(true);
    });

    test('Detecta un registro vinculado si el candidato tiene espacios extra', () => {
        expect(isRecordLinked('  GRUP-ABC  ', linkedRecords, pk)).toBe(true);
    });

    test('Detecta un registro vinculado si el candidato está en minúsculas', () => {
        expect(isRecordLinked('grup-abc', linkedRecords, pk)).toBe(true);
    });

    test('Combina suciedad: espacios + lowercase', () => {
        expect(isRecordLinked('  grup-xyz  ', linkedRecords, pk)).toBe(true);
    });

    test('Retorna false para un registro NO vinculado', () => {
        expect(isRecordLinked('GRUP-999', linkedRecords, pk)).toBe(false);
    });

    test('Retorna false si linkedRecords está vacío', () => {
        expect(isRecordLinked('GRUP-ABC', [], pk)).toBe(false);
    });

    test('Retorna false si linkedRecords es null (robusto ante estado no inicializado)', () => {
        expect(isRecordLinked('GRUP-ABC', null, pk)).toBe(false);
    });
});
