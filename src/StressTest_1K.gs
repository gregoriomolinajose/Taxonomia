/**
 * StressTest_1K.gs
 * Script temporal para validar performance con 1,000 registros.
 */

function runStressTest1K() {
  const SPREADSHEET_ID = CONFIG.SPREADSHEET_ID_DB;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('DB_Producto');
  
  if (!sheet) {
    throw new Error('No se encontró la hoja DB_Producto');
  }

  // 1. Limpiar datos existentes (opcional, pero mejor para limpieza)
  // sheet.getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn()).clearContent();

  const startRow = sheet.getLastRow() + 1;
  const data = [];
  
  Logger.log(`[StressTest] Iniciando inyección de 1,000 registros en ${sheet.getName()}...`);

  for (let i = 1; i <= 1000; i++) {
    const id = `STRESS-${i}-${Math.floor(Math.random() * 10000)}`;
    const nombre = `Producto Stress Test ${i}`;
    const criticalidad = ["Tier 1 (Crítico)", "Tier 2 (Alto)", "Tier 3 (Medio)", "Tier 4 (Bajo)"][Math.floor(Math.random() * 4)];
    const slo = (Math.random() * 5 + 95).toFixed(2);
    const grupo = "GRUP-001"; // ID existente en mocks o DB inicial
    const estado = "Activo";
    const timestamp = new Date().toISOString();
    const user = "stress.test@taxonomia.com";

    // Orden de columnas: id_producto, nombre_producto, nivel_criticalidad, slo_objetivo, id_grupo_producto, estado, created_at, created_by, updated_at, updated_by
    data.push([id, nombre, criticalidad, slo, grupo, estado, timestamp, user, timestamp, user]);
  }

  // Escribir en bloque (Regla 11: Performance en escritura también)
  sheet.getRange(startRow, 1, data.length, data[0].length).setValues(data);
  
  Logger.log(`[StressTest] ¡Éxito! 1,000 registros inyectados.`);
  return "1,000 registros inyectados correctamente.";
}
