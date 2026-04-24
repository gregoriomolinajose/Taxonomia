/**
 * EPT-OMR Project - TEST_Suite
 * This file contains manual assertions that can be executed directly within the 
 * Google Apps Script Editor if needed. 
 * 
 * NOTE: For local development, we use Jest BDD/TDD tests (see __tests__ folder).
 */

function _test_insercion_portafolio() {
    Logger.log("Iniciando Prueba de Inserción / Upsert en Portafolio...");

    // 1. Simular payload proveniente del API_Universal
    const mockPayload = {
        id_portafolio: "PORT-TEST-999",
        nombre: "Portafolio de Pruebas Automatizadas",
        descripcion: "Generado por Test Manual desde el Editor",
        estado: "Borrador",
        temas_estrategicos: "Innovación, IA",
        flujos_valor: "Operaciones AI",
        clientes_segmentos: "B2B",
        presupuesto: 1500000,
        kpis_metricas: "Adopción 50%"
    };

    try {
        // En lugar de llamar directamente a create, lo llamamos desde el Engine_DB para probar toda su orquestación
        // Como 'create' ahora regresó a ser síncrono en GAS natively:
        const result = Engine_DB.create("Portafolio", mockPayload);

        Logger.log("Resultado de la ejecución síncrona: " + JSON.stringify(result));
        Logger.log("✅ Prueba completada con éxito. Revisa la hoja DB_Portafolio.");
    } catch (e) {
        Logger.log("❌ Fallo en la prueba de inserción: " + e.message + " | " + e.stack);
    }
}

/**
 * cleanupStressData()
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
