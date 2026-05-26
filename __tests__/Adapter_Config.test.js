/**
 * [E6-S61] Adapter_Config Unit Tests
 *
 * Verifica que Adapter_Config persiste y lee correctamente
 * desde PropertiesService usando mocks. No requiere GAS runtime.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ─── Mock PropertiesService ───────────────────────────────────────────────────

function createMockPropertiesService(initialData = {}) {
    const store = { ...initialData };
    const mockScriptProps = {
        getProperties: vi.fn(() => ({ ...store })),
        getProperty:   vi.fn((key) => store[key] !== undefined ? store[key] : null),
        setProperties: vi.fn((obj) => { Object.assign(store, obj); }),
        setProperty:   vi.fn((key, val) => { store[key] = val; }),
        _store: store  // Exposición para assertions directas
    };
    return {
        getScriptProperties: vi.fn(() => mockScriptProps),
        _scriptProps: mockScriptProps
    };
}

// ─── Mock APP_SCHEMAS ─────────────────────────────────────────────────────────

globalThis.APP_SCHEMAS = {
    Config_System: {
        metadata: { adapter: 'config' },
        primaryKey: 'config_id',
        fields: [
            { name: 'config_id',       type: 'text'   },
            { name: 'tenant_name',     type: 'text'   },
            { name: 'db_adapter_id',   type: 'select' },
            { name: 'spreadsheet_id',  type: 'text'   },
            { name: 'allowed_domains', type: 'text'   },
            { name: 'app_title',       type: 'text'   },
            { name: 'favicon_url',     type: 'text'   }
        ]
    }
};

globalThis.Logger = { log: vi.fn() };

// ─── Cargar Adapter_Config ────────────────────────────────────────────────────

const { Adapter_Config } = require(path.resolve(process.cwd(), 'src/Adapter_Config.js'));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Adapter_Config — contrato de API', () => {

    let mockPS;

    beforeEach(() => {
        mockPS = createMockPropertiesService();
        globalThis.PropertiesService = mockPS;
        vi.clearAllMocks();
    });

    // AC3: instancia nueva — retorna valores default
    it('asListResponse() en instancia vacía retorna fila con config_id=SYS-CONFIG-001 y campos vacíos', () => {
        const result = Adapter_Config.asListResponse();

        expect(result).toHaveProperty('headers');
        expect(result).toHaveProperty('rows');
        expect(Array.isArray(result.headers)).toBe(true);
        expect(result.rows).toHaveLength(1);

        const row = result.rows[0];
        const idIdx = result.headers.indexOf('config_id');
        expect(idIdx).toBeGreaterThanOrEqual(0);
        expect(row[idIdx]).toBe('SYS-CONFIG-001');

        // Los demás campos deben ser string vacío
        result.headers.forEach((h, i) => {
            if (h !== 'config_id') {
                expect(row[i]).toBe('');
            }
        });
    });

    // AC5: headers derivados del schema
    it('asListResponse() retorna headers derivados del schema (7 campos)', () => {
        const result = Adapter_Config.asListResponse();
        expect(result.headers).toEqual([
            'config_id', 'tenant_name', 'db_adapter_id',
            'spreadsheet_id', 'allowed_domains', 'app_title', 'favicon_url'
        ]);
    });

    // AC2: setAll() persiste en PropertiesService
    it('setAll() almacena los campos en PropertiesService con prefijo APP_CONFIG__', () => {
        const payload = {
            config_id:       'SYS-CONFIG-001',
            tenant_name:     'Tenant A',
            db_adapter_id:   'sheets',
            spreadsheet_id:  '1ABC123DEF',
            allowed_domains: '@tenantA.com',
            app_title:       'Sistema de Taxonomía',
            favicon_url:     ''
        };

        const result = Adapter_Config.setAll(payload);

        expect(result.success).toBe(true);
        expect(result.id).toBe('SYS-CONFIG-001');

        const stored = mockPS._scriptProps._store;
        expect(stored['APP_CONFIG__tenant_name']).toBe('Tenant A');
        expect(stored['APP_CONFIG__db_adapter_id']).toBe('sheets');
        expect(stored['APP_CONFIG__spreadsheet_id']).toBe('1ABC123DEF');
        // config_id NO debe guardarse en Properties (es inmutable)
        expect(stored['APP_CONFIG__config_id']).toBeUndefined();
    });

    // AC1: asListResponse() con datos cargados retorna esos datos
    it('asListResponse() con datos en PropertiesService retorna esos valores', () => {
        const existingData = {
            'APP_CONFIG__tenant_name':     'Tenant B',
            'APP_CONFIG__db_adapter_id':   'clouddb',
            'APP_CONFIG__spreadsheet_id':  '1XYZ789GHI',
            'APP_CONFIG__allowed_domains': '@tenantB.com,@tenantA.com',
            'APP_CONFIG__app_title':       'Taxonomía Pro',
            'APP_CONFIG__favicon_url':     'https://empresa.com/favicon.ico'
        };
        globalThis.PropertiesService = createMockPropertiesService(existingData);

        const result = Adapter_Config.asListResponse();
        const row    = result.rows[0];
        const h      = result.headers;

        expect(row[h.indexOf('tenant_name')]).toBe('Tenant B');
        expect(row[h.indexOf('db_adapter_id')]).toBe('clouddb');
        expect(row[h.indexOf('spreadsheet_id')]).toBe('1XYZ789GHI');
        expect(row[h.indexOf('allowed_domains')]).toBe('@tenantB.com,@tenantA.com');
        expect(row[h.indexOf('config_id')]).toBe('SYS-CONFIG-001'); // siempre singleton
    });

    // Singleton: siempre exactamente 1 fila
    it('asListResponse() siempre retorna exactamente 1 fila (singleton)', () => {
        const result = Adapter_Config.asListResponse();
        expect(result.rows).toHaveLength(1);
    });

    // setAll() es idempotente — no duplica
    it('setAll() llamado dos veces actualiza sin duplicar (upsert)', () => {
        Adapter_Config.setAll({ tenant_name: 'Tenant A' });
        Adapter_Config.setAll({ tenant_name: 'Tenant A Actualizado' });

        const stored = mockPS._scriptProps._store;
        expect(stored['APP_CONFIG__tenant_name']).toBe('Tenant A Actualizado');
        // Debe haber exactamente 1 entrada por campo
        const keys = Object.keys(stored).filter(k => k.startsWith('APP_CONFIG__tenant_name'));
        expect(keys).toHaveLength(1);
    });

    // getField() lectura puntual
    it('getField() retorna el valor correcto de un campo específico', () => {
        const existingData = { 'APP_CONFIG__spreadsheet_id': '1DIRECT123' };
        globalThis.PropertiesService = createMockPropertiesService(existingData);

        expect(Adapter_Config.getField('spreadsheet_id')).toBe('1DIRECT123');
        expect(Adapter_Config.getField('config_id')).toBe('SYS-CONFIG-001'); // siempre singleton
        expect(Adapter_Config.getField('tenant_name')).toBe(''); // no existe → vacío
    });

    // Robustez: payload null no crashea
    it('setAll() con payload inválido lanza error descriptivo', () => {
        expect(() => Adapter_Config.setAll(null)).toThrow('[Adapter_Config]');
        expect(() => Adapter_Config.setAll('string')).toThrow('[Adapter_Config]');
    });

});
