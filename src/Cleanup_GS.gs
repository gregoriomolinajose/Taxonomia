/**
 * Cleanup_GS.gs
 * 
 * Función de un solo uso para purgar los 1,000 registros de Stress Test.
 * Busca IDs que comiencen con 'STRESS-'.
 */

function cleanupStressData() {
  const SPREADSHEET_ID = CONFIG.SPREADSHEET_ID_DB;
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('DB_Producto');
  
  if (!sheet) {
    Logger.log('Error: No se encontró la hoja DB_Producto');
    return;
  }

  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idColIdx = headers.indexOf('id_producto');

  if (idColIdx === -1) {
    Logger.log('Error: No se encontró la columna id_producto');
    return;
  }

  Logger.log('[Cleanup] Iniciando limpieza de registros STRESS-...');
  
  // Filtrar filas que NO sean stress (mantener el resto)
  // Nota: Empezamos desde la fila 1 (índice 0 es cabecera)
  const rowsToKeep = [headers];
  let deletedCount = 0;

  for (let i = 1; i < values.length; i++) {
    const id = String(values[i][idColIdx]);
    if (id.startsWith('STRESS-')) {
      deletedCount++;
    } else {
      rowsToKeep.push(values[i]);
    }
  }

  // Sobrescribir la hoja con los datos limpios
  sheet.clearContents();
  sheet.getRange(1, 1, rowsToKeep.length, rowsToKeep[0].length).setValues(rowsToKeep);

  Logger.log(`[Cleanup] Éxito: Se eliminaron ${deletedCount} registros de stress.`);
  return `Se eliminaron ${deletedCount} registros correctamente.`;
}
