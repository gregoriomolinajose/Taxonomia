const Engine_DB = require('../src/Engine_DB');
const Adapter_Sheets = require('../src/Adapter_Sheets');

// global.CacheService and global.Logger are now provided by jest.setup.js

global.CONFIG = {
  useSheets: true,
  useCloudDB: false,
  SPREADSHEET_ID_DB: 'MOCK_ID'
};

// Removed individual mock, using global from jest.setup.js
const globalSheet = global.SpreadsheetApp.openById().getSheetByName();
globalSheet.getDataRange.mockReturnValue({
    getValues: jest.fn(() => {
        // Generate 1,001 rows (headers + 1000 records)
        const headers = ['id_producto', 'nombre_producto', 'nivel_criticalidad', 'slo_objetivo', 'id_grupo_producto', 'estado'];
        const rows = [headers];
        for (let i = 1; i <= 1000; i++) {
            rows.push([`ID-${i}`, `Prod-${i}`, 'Tier 1', '99.9', 'GRUP-01', 'Activo']);
        }
        return rows;
    })
});
globalSheet.getLastRow.mockReturnValue(1001);

describe('Performance Stress Regression Test (1K Records)', () => {
  test('Engine_DB.list should process 1,000 records as tuples without memory issues', () => {
    const start = Date.now();
    
    // Request data in 'tuples' format (Single RPC optimization)
    const result = Engine_DB.list('Producto', 'tuples');
    
    const end = Date.now();
    const duration = end - start;

    expect(result).toBeDefined();
    expect(result.headers).toContain('id_producto');
    expect(result.rows.length).toBe(1000);
    expect(Array.isArray(result.rows[0])).toBe(true); // Must be a tuple (Rule 13)

    console.log(`[QA Stress] Processed 1,000 records in ${duration}ms (Mocked Sheets)`);
    
    // SLA Check (Mocked environment should be extremely fast, < 100ms)
    expect(duration).toBeLessThan(500);
  });

  test('Engine_DB.list should cache the result to achieve < 1.5s SLA (Rule 11/12)', () => {
    // First call (Miss)
    Engine_DB.list('Producto');
    expect(global.CacheService.getScriptCache().put).toHaveBeenCalled();
  });
});
