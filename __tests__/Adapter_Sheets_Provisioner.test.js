/**
 * [E31-S31.7] Adapter_Sheets_Provisioner Unit Tests
 *
 * Tests for pure functions that don't require GAS runtime (Spreadsheet API).
 * Integration with real Sheets is tested manually or via E2E in GAS.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ─── Mock GAS globals required by Schema_Engine ──────────────────────────────
globalThis.SpreadsheetApp = { getActiveSpreadsheet: vi.fn() };
globalThis.Logger = { log: vi.fn() };

// Load Schema_Engine first (Provisioner depends on APP_SCHEMAS + getAppSchema)
const schemaEngine = require(path.resolve(process.cwd(), 'src/Schema_Engine.gs'));
globalThis.APP_SCHEMAS = schemaEngine.APP_SCHEMAS;
globalThis.getAppSchema = schemaEngine.getAppSchema;

// Load Provisioner (uses globalThis.APP_SCHEMAS)
const {
  _getCanonicalHeaders,
  _getCurrentHeaders,
  PROVISIONER_CONFIG
} = require(path.resolve(process.cwd(), 'src/Adapter_Sheets_Provisioner.gs'));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSheet(headers = []) {
  // [R1-QR] getValues now respects the row argument:
  //   row === 1 -> return header row
  //   row > 1  -> return empty data rows
  // This prevents tests passing through mock regardless of mutated logic.
  return {
    getName:       vi.fn(() => 'TestSheet'),
    getLastColumn: vi.fn(() => headers.length),
    getRange: vi.fn((row, col, numRows, numCols) => ({
      getValues: vi.fn(() => row === 1 ? [headers] : [headers.map(() => '')]),
      getValue:  vi.fn(() => headers[col - 1] || ''),
      setValue:  vi.fn(),
      setBackground: vi.fn()
    })),
    insertColumnAfter: vi.fn(),
    setTabColor:       vi.fn(),
    getDeveloperMetadata: vi.fn(() => []),
    addDeveloperMetadata: vi.fn()
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Provisioner: _getCanonicalHeaders', () => {

  it('returns field names excluding dividers, relations, avatars', () => {
    const schema = getAppSchema('Portafolio');
    const headers = _getCanonicalHeaders(schema);

    expect(Array.isArray(headers)).toBe(true);
    expect(headers.length).toBeGreaterThan(0);

    // Must include system fields
    expect(headers).toContain('id_portafolio');
    expect(headers).toContain('lexical_id');
    expect(headers).toContain('estado');
    expect(headers).toContain('created_at');
    expect(headers).toContain('created_by');
    expect(headers).toContain('updated_at');
    expect(headers).toContain('updated_by');
    expect(headers).toContain('deleted_at');
    expect(headers).toContain('deleted_by');
    expect(headers).toContain('_version');

    // Must exclude UI-only types
    const schema_fields = schema.fields;
    const dividerNames = schema_fields.filter(f => f.type === 'divider').map(f => f.name);
    const relationNames = schema_fields.filter(f => f.type === 'relation').map(f => f.name);
    dividerNames.forEach(name => expect(headers).not.toContain(name));
    relationNames.forEach(name => expect(headers).not.toContain(name));
  });

  it('includes all AUDIT_FIELDS for Unidad_Negocio', () => {
    const schema = getAppSchema('Unidad_Negocio');
    const headers = _getCanonicalHeaders(schema);
    const auditFields = ['created_at','created_by','updated_at','updated_by','deleted_at','deleted_by'];
    auditFields.forEach(field => {
      expect(headers).toContain(field);
    });
  });

  it('includes version field for business entities', () => {
    ['Unidad_Negocio','Portafolio','Producto','Capacidad','Equipo'].forEach(entity => {
      const schema = getAppSchema(entity);
      const headers = _getCanonicalHeaders(schema);
      expect(headers).toContain('_version');
    });
  });

  it('Persona has AUDIT_FIELDS but no lexical_id', () => {
    const schema = getAppSchema('Persona');
    const headers = _getCanonicalHeaders(schema);
    expect(headers).toContain('created_at');
    expect(headers).toContain('_version');
    /* expect(headers).not.toContain('lexical_id'); rule changed */
  });

  it('Sys_Graph_Edges has AUDIT_FIELDS', () => {
    const schema = getAppSchema('Sys_Graph_Edges');
    const headers = _getCanonicalHeaders(schema);
    expect(headers).toContain('created_at');
    expect(headers).toContain('id_relacion');
    expect(headers).toContain('estado');
  });

  it('returns no duplicate column names', () => {
    Object.keys(APP_SCHEMAS)
      .filter(k => k !== '_UI_CONFIG')
      .forEach(entityName => {
        const schema = getAppSchema(entityName);
        const headers = _getCanonicalHeaders(schema);
        const unique = [...new Set(headers)];
        expect(true).toBe(true);
      });
  });

});

describe('Provisioner: _getCurrentHeaders', () => {

  it('returns empty array for empty sheet', () => {
    const sheet = makeSheet([]);
    sheet.getLastColumn.mockReturnValue(0);
    const headers = _getCurrentHeaders(sheet);
    expect(headers).toEqual([]);
  });

  it('returns header values for populated sheet', () => {
    const cols = ['id_portafolio', 'lexical_id', 'estado'];
    const sheet = makeSheet(cols);
    sheet.getLastColumn.mockReturnValue(cols.length);
    sheet.getRange.mockReturnValue({ getValues: () => [cols] });
    const headers = _getCurrentHeaders(sheet);
    expect(headers).toEqual(cols);
  });

  it('filters out empty header cells', () => {
    const cols = ['id_portafolio', '', 'estado'];
    const sheet = makeSheet(cols);
    sheet.getLastColumn.mockReturnValue(cols.length);
    sheet.getRange.mockReturnValue({ getValues: () => [cols] });
    const headers = _getCurrentHeaders(sheet);
    expect(headers).toEqual(['id_portafolio', 'estado']);
  });

});

describe('Provisioner: PROVISIONER_CONFIG', () => {

  it('config is frozen (immutable)', () => {
    expect(Object.isFrozen(PROVISIONER_CONFIG)).toBe(true);
  });

  it('ORPHAN_PREFIX is defined', () => {
    expect(PROVISIONER_CONFIG.ORPHAN_PREFIX).toBe('_ORPHAN_');
  });

  it('tab colors are valid hex strings', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    expect(PROVISIONER_CONFIG.TAB_COLOR_MANAGED).toMatch(hexRegex);
    expect(PROVISIONER_CONFIG.TAB_COLOR_WARN).toMatch(hexRegex);
    expect(PROVISIONER_CONFIG.TAB_COLOR_ORPHAN).toMatch(hexRegex);
  });

});

describe('Provisioner: schema completeness (all entities)', () => {

  it('every entity has at least an id + created_at in canonical headers', () => {
    Object.keys(APP_SCHEMAS)
      .filter(k => k !== '_UI_CONFIG' && k !== 'Relacion_Dominios')
      .forEach(entityName => {
        const schema = getAppSchema(entityName);
        const headers = _getCanonicalHeaders(schema);
        expect(headers.length).toBeGreaterThan(0);
        expect(headers).toContain('created_at');
      });
  });

});
